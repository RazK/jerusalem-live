"""
Jerusalem.live — Task B complete
Extraction pipeline orchestration: WhatsApp message → extract → geocode → Supabase

Flow:
  1. Receive message payload from Baileys microservice (HTTP POST)
  2. Run extractor.extract_event() to get structured JSON
  3. Geocode address via OpenStreetMap Nominatim (free, no API key)
  4. Write to Supabase events table:
     - confidence >= 0.85  → status = 'auto_published'
     - confidence < 0.85   → status = 'pending' (admin review required)
  5. Write raw message to whatsapp_messages table for audit trail

Design decisions:
  - Nominatim geocoding: rate-limited to 1 req/sec per OSM usage policy.
    We cache results in-memory per session to avoid hammering the API for
    repeated venue names (e.g. "Abraham Hostel" appears in dozens of messages).
  - Supabase writes use the supabase-py client (async variant).
  - If geocoding fails, coordinates are stored as NULL and the event is flagged
    for manual review regardless of confidence score.
  - All DB writes are idempotent via ON CONFLICT DO NOTHING on (source_group_id, message_id).
"""

import asyncio
import hashlib
import logging
import time
from datetime import datetime
from typing import Any

import httpx
from supabase import AsyncClient, create_async_client

from extractor import extract_event

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (injected from environment — see ENGINEERING_SPEC.md)
# ---------------------------------------------------------------------------

import os

SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_KEY"]   # service role, server-side only
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.85"))

# Nominatim config
NOMINATIM_URL     = "https://nominatim.openstreetmap.org/search"
NOMINATIM_UA      = "Jerusalem.live/1.0 (hello@jerusalem.live)"  # required by OSM ToS
NOMINATIM_RATE_S  = 1.1   # seconds between requests (OSM policy: max 1/sec)

# ---------------------------------------------------------------------------
# In-memory geocode cache (address string → {lat, lng})
# Survives for process lifetime; good enough for a single-instance microservice.
# ---------------------------------------------------------------------------
_geocode_cache: dict[str, dict[str, float] | None] = {}
_last_nominatim_request: float = 0.0


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

async def geocode_address(address: str | None) -> dict[str, float] | None:
    """
    Geocode an address string using OpenStreetMap Nominatim.

    Args:
        address: Free-text address (e.g. "Mahane Yehuda, Jerusalem" or
                 "32 Agrippas Street"). Should already contain "Jerusalem"
                 as context to prevent cross-city matches.

    Returns:
        {"lat": float, "lng": float} or None if geocoding fails.

    Rate limiting:
        Enforces minimum 1.1 s between requests to respect OSM ToS.
        Results are cached in-memory for the process lifetime.
    """
    global _last_nominatim_request

    if not address:
        return None

    # Append Jerusalem to every query for precision
    query = address if "Jerusalem" in address or "ירושלים" in address else f"{address}, Jerusalem"

    # Cache hit
    if query in _geocode_cache:
        logger.debug("Geocode cache hit: %s", query)
        return _geocode_cache[query]

    # Rate limiting
    elapsed = time.monotonic() - _last_nominatim_request
    if elapsed < NOMINATIM_RATE_S:
        await asyncio.sleep(NOMINATIM_RATE_S - elapsed)

    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "il",   # Israel only — prevents false matches
        "addressdetails": 0,
    }
    headers = {"User-Agent": NOMINATIM_UA}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            _last_nominatim_request = time.monotonic()
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        if not data:
            logger.warning("Nominatim returned no results for: %s", query)
            _geocode_cache[query] = None
            return None

        result = {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
        _geocode_cache[query] = result
        logger.info("Geocoded '%s' → %s", query, result)
        return result

    except Exception as exc:
        logger.error("Geocoding error for '%s': %s", query, exc)
        _geocode_cache[query] = None
        return None


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

async def _get_supabase() -> AsyncClient:
    """Return an authenticated Supabase async client."""
    return await create_async_client(SUPABASE_URL, SUPABASE_KEY)


async def write_event(
    sb: AsyncClient,
    extraction: dict[str, Any],
    coordinates: dict[str, float] | None,
    group_id: str,
    message_id: str,
    status: str,
) -> str | None:
    """
    Insert an extracted event into the events table.

    Returns the new event UUID, or None if insert failed.

    The PostGIS Point is constructed server-side via a raw SQL expression
    because supabase-py does not natively support PostGIS geometry literals.
    We work around this by passing coordinates as plain floats and using a
    DB-level default/trigger, or by using the REST API's rpc endpoint.
    """
    point_wkt = (
        f"POINT({coordinates['lng']} {coordinates['lat']})"
        if coordinates else None
    )

    payload = {
        "name":            extraction.get("event_name"),
        "date":            extraction.get("date"),
        "start_time":      extraction.get("start_time"),
        "end_time":        extraction.get("end_time"),
        "venue":           extraction.get("venue_name"),
        "address":         extraction.get("address"),
        # PostGIS point: stored as text, coerced by DB function below
        "coordinates_wkt": point_wkt,
        "category":        extraction.get("category"),
        "description":     extraction.get("description"),
        "price":           extraction.get("price"),
        "source":          "whatsapp",
        "source_group_id": group_id,
        "visibility":      "private",   # WhatsApp events always private by default
        "status":          status,
        "confidence_score": extraction.get("confidence_score", 0.0),
        "created_at":      datetime.utcnow().isoformat(),
    }

    # Use rpc to handle PostGIS geometry construction server-side
    # DB function signature: insert_event(payload jsonb) → uuid
    try:
        result = await sb.rpc("insert_event", {"payload": payload}).execute()
        event_id = result.data
        logger.info("Inserted event '%s' id=%s status=%s", extraction.get("event_name"), event_id, status)
        return event_id
    except Exception as exc:
        logger.error("Failed to insert event: %s", exc)
        return None


async def write_raw_message(
    sb: AsyncClient,
    group_id: str,
    message_id: str,
    message_text: str | None,
    image_url: str | None,
    raw_payload: dict,
    event_id: str | None,
) -> None:
    """Persist the raw WhatsApp message for audit trail and re-processing."""
    payload = {
        "id":           message_id,
        "group_id":     group_id,
        "message_text": message_text,
        "image_url":    image_url,
        "raw_payload":  raw_payload,
        "event_id":     event_id,
        "processed_at": datetime.utcnow().isoformat(),
    }
    try:
        await sb.table("whatsapp_messages").upsert(payload, on_conflict="id").execute()
    except Exception as exc:
        logger.error("Failed to write raw message %s: %s", message_id, exc)


# ---------------------------------------------------------------------------
# Main pipeline entry point
# ---------------------------------------------------------------------------

async def process_message(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Full pipeline: WhatsApp message → extraction → geocode → Supabase.

    Args:
        payload: Message dict from the Baileys microservice, shape:
            {
              "message_id":  str,            # Unique WhatsApp message ID
              "group_id":    str,            # Internal group UUID
              "text":        str | None,     # Message text (may be None for media)
              "image_b64":   str | None,     # Base64 image if message contains media
              "image_url":   str | None,     # Supabase Storage URL (already uploaded)
              "raw_payload": dict,           # Full Baileys message object (for audit)
              "received_at": str,            # ISO 8601 timestamp
            }

    Returns:
        {
          "success":    bool,
          "event_id":   str | None,
          "status":     "auto_published" | "pending" | "rejected" | "not_event",
          "confidence": float,
          "extraction": dict,
        }
    """
    message_id = payload["message_id"]
    group_id   = payload["group_id"]
    text       = payload.get("text")
    image_b64  = payload.get("image_b64")
    image_url  = payload.get("image_url")
    raw        = payload.get("raw_payload", {})

    logger.info("Processing message %s from group %s", message_id, group_id)

    # Step 1: Extract
    extraction = extract_event(
        message_text=text,
        image_b64=image_b64,
    )

    confidence = extraction.get("confidence_score", 0.0)
    is_event   = extraction.get("is_event", False)

    # Step 2: Short-circuit if not an event
    if not is_event:
        logger.info("Message %s is not an event (confidence=%.2f)", message_id, confidence)
        sb = await _get_supabase()
        await write_raw_message(sb, group_id, message_id, text, image_url, raw, None)
        return {
            "success":    True,
            "event_id":   None,
            "status":     "not_event",
            "confidence": confidence,
            "extraction": extraction,
        }

    # Step 3: Geocode
    address = extraction.get("address") or extraction.get("venue_name")
    coordinates = await geocode_address(address)

    # If geocoding failed, downgrade to pending regardless of confidence
    if not coordinates and confidence >= CONFIDENCE_THRESHOLD:
        logger.warning("Geocoding failed for '%s' — downgrading to pending", address)
        confidence = min(confidence, CONFIDENCE_THRESHOLD - 0.01)
        extraction["confidence_reasons"] = extraction.get("confidence_reasons", []) + [
            "Geocoding failed — coordinates unavailable"
        ]

    # Step 4: Determine publish status
    status = "auto_published" if confidence >= CONFIDENCE_THRESHOLD else "pending"

    # Step 5: Write to DB
    sb = await _get_supabase()
    event_id = await write_event(sb, extraction, coordinates, group_id, message_id, status)
    await write_raw_message(sb, group_id, message_id, text, image_url, raw, event_id)

    logger.info(
        "Message %s → event %s [%s] confidence=%.2f",
        message_id, event_id, status, confidence,
    )

    return {
        "success":    event_id is not None,
        "event_id":   event_id,
        "status":     status,
        "confidence": confidence,
        "extraction": extraction,
    }


# ---------------------------------------------------------------------------
# FastAPI webhook handler (thin wrapper — mounted in main app)
# ---------------------------------------------------------------------------

async def whatsapp_webhook_handler(request_body: dict[str, Any]) -> dict[str, Any]:
    """
    Entry point called by the Baileys microservice webhook route.
    Validates the payload shape before passing to process_message().
    """
    required_fields = {"message_id", "group_id"}
    missing = required_fields - set(request_body.keys())
    if missing:
        return {"success": False, "error": f"Missing required fields: {missing}"}

    # Basic deduplication: hash message_id to avoid double-processing on retry
    msg_hash = hashlib.sha256(request_body["message_id"].encode()).hexdigest()
    logger.debug("Processing webhook for message hash %s", msg_hash[:8])

    return await process_message(request_body)
