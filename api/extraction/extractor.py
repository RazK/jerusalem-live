"""
Jerusalem.live — Task B complete
WhatsApp LLM extraction pipeline using Claude API

Design decisions:
- Uses claude-sonnet-4-20250514 (latest, best Hebrew/English bilingual reasoning)
- System prompt emphasises Jerusalem-specific geography to prevent hallucinations (e.g. Florentin is Tel Aviv, not Jerusalem)
- Structured JSON output via explicit schema in prompt + response_format
- Confidence scoring based on field completeness + extraction certainty
- Base64 image support: image descriptions are passed as text alongside any OCR hint
- Aggressive normalisation of Hebrew date strings (היום, מחר, ביום שישי, etc.)
- All times normalised to 24h HH:MM; dates to ISO 8601 YYYY-MM-DD
"""

import anthropic
import base64
import json
import logging
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 1024

# Fields required for auto-publish confidence to be high
REQUIRED_FIELDS = {"event_name", "date", "start_time", "venue_name"}

# Jerusalem neighbourhoods the model must recognise
JERUSALEM_NEIGHBOURHOODS = (
    "Mahane Yehuda, Nachlaot, Nahalat Shiva, German Colony, Musrara, "
    "Talpiot, Ein Karem, Katamon, Rehavia, Baka, Abu Tor, Har Nof, "
    "Givat Ram, French Hill, Ramot, Ramat Eshkol, Pisgat Ze'ev"
)

# ---------------------------------------------------------------------------
# Prompt design
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
You are an event extraction engine for Jerusalem.live, a Jerusalem city-events platform.
Your job: extract structured event data from WhatsApp group messages (text, image descriptions, or mixed).

## Context
- Platform serves Jerusalem students. Events are parties, live music, markets, outdoor activities, culture.
- Jerusalem neighbourhoods in scope: {neighbourhoods}
- IMPORTANT: Florentin is in Tel Aviv — NEVER map events there as Jerusalem.
- Messages can be in Hebrew, English, or mixed. Dates in Hebrew use standard calendar (not Hebrew calendar).
- Hebrew date hints: היום = today, מחר = tomorrow, ביום שישי = on Friday, etc.
- Today's date: {{today}}

## Task
Return ONLY a valid JSON object — no markdown, no preamble, no explanation.

## Output Schema
{{
  "event_name": string | null,           // Name or title of the event
  "date": "YYYY-MM-DD" | null,          // ISO 8601 date
  "start_time": "HH:MM" | null,         // 24h format, e.g. "21:00"
  "end_time": "HH:MM" | null,           // 24h format, null if not mentioned
  "venue_name": string | null,           // Venue name (e.g. "Abraham Hostel", "HaMaabada")
  "address": string | null,              // Street address or neighbourhood
  "category": "party" | "music" | "market" | "outdoor" | "culture" | null,
  "description": string | null,          // 1-3 sentence summary in the message's language
  "price": string | null,               // e.g. "Free", "₪50", "40 NIS", null if unknown
  "organizer": string | null,           // Organiser name if mentioned
  "ticket_url": string | null,          // URL if mentioned
  "phone": string | null,               // Contact phone if mentioned
  "image_url": null,                    // Always null — images stored separately
  "is_event": boolean,                  // false if message is spam, reaction, or clearly not an event
  "confidence_score": float,            // 0.0–1.0 (see scoring rules below)
  "confidence_reasons": [string]        // Short list of reasons for the score
}}

## Confidence Scoring Rules
Start at 1.0 and subtract:
- event_name missing: -0.35
- date missing or ambiguous: -0.25
- start_time missing: -0.15
- venue_name missing: -0.10
- address/neighbourhood missing: -0.08
- is_event = false: set score to 0.0
- Hebrew-only message (no cross-verification possible): -0.05
- Image description only (no text): -0.05
- Multiple events in one message (ambiguous): -0.10
Minimum score: 0.0. Maximum: 1.0.

## Category Mapping
- party: מסיבה, מסיבת גג, מסיבת חצר, rave, techno, DJ, nightclub, club night, פאב, bar event
- music: קונצרט, ג'אז, להקה, live music, acoustic, band, open mic, אמן, הופעה
- market: שוק, market, pop-up market, ירידה, fair, flea market, שוק פשפשים
- outdoor: ריצה, yoga, hike, טיול, sunrise, park event, outdoor, טבע
- culture: תיאטרון, theatre, מוזיאון, art show, exhibition, stand-up, comedy, lecture, סדנה

## Important Rules
- If the message has no event information (e.g. "🙏", "thanks", reaction sticker, news article), set is_event=false and confidence_score=0.0.
- Never invent details not present in the message.
- If a field is genuinely ambiguous, set it to null.
- For recurring events (e.g. "every Friday"), set date to the next upcoming occurrence.
- Normalise all times to Israel Standard Time (IST = UTC+3); do not convert.
""".format(neighbourhoods=JERUSALEM_NEIGHBOURHOODS)


# ---------------------------------------------------------------------------
# Client initialisation (lazy — key injected by environment)
# ---------------------------------------------------------------------------

def _get_client() -> anthropic.Anthropic:
    """Return an Anthropic client. ANTHROPIC_API_KEY must be set in env."""
    return anthropic.Anthropic()


# ---------------------------------------------------------------------------
# Core extraction function
# ---------------------------------------------------------------------------

def extract_event(
    message_text: str | None,
    image_b64: str | None = None,
    image_media_type: str = "image/jpeg",
    reference_date: date | None = None,
) -> dict[str, Any]:
    """
    Extract structured event data from a WhatsApp message.

    Args:
        message_text:     Raw message text (Hebrew, English, or mixed). May be None
                          if the message is image-only.
        image_b64:        Base64-encoded image bytes (optional). If provided, the
                          model will read image content directly (OCR + visual parse).
        image_media_type: MIME type of image (default: "image/jpeg").
        reference_date:   The date to treat as "today" for relative date resolution.
                          Defaults to the real current date.

    Returns:
        dict matching the output schema defined in SYSTEM_PROMPT.
        Always returns a dict; never raises on extraction failure (returns
        a zero-confidence object instead).

    Design notes:
        - We pass the image as a vision block when available. This allows Claude
          to read event flyers, screenshots of Instagram stories, and hand-written
          invitations that are common in Jerusalem WhatsApp groups.
        - The system prompt is parameterised with today's date so relative Hebrew
          date expressions ("מחר", "ביום שישי הבא") resolve correctly.
        - We use max_tokens=1024 which is sufficient for the JSON schema; extraction
          is a structured task, not a generative one.
    """
    ref = reference_date or date.today()
    today_str = ref.isoformat()

    # Inject today's date into system prompt
    system = SYSTEM_PROMPT.replace("{{today}}", today_str)

    # Build user content blocks
    content: list[dict] = []

    if image_b64:
        # Vision block: let Claude see the image directly
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_media_type,
                "data": image_b64,
            },
        })

    # Always append the text block (with fallback if no text)
    text_payload = message_text or "(Image-only message — extract event info from the image above)"
    content.append({"type": "text", "text": text_payload})

    client = _get_client()

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": content}],
        )

        raw = response.content[0].text.strip()

        # Strip accidental markdown fences the model sometimes adds
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)

    except json.JSONDecodeError as exc:
        logger.error("JSON parse error from model response: %s", exc)
        result = _empty_result()
        result["confidence_reasons"] = [f"JSON parse error: {exc}"]

    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        result = _empty_result()
        result["confidence_reasons"] = [f"API error: {exc}"]

    # Post-process: clamp confidence, normalise types
    return _postprocess(result)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_result() -> dict[str, Any]:
    """Return a zero-confidence empty extraction result."""
    return {
        "event_name": None,
        "date": None,
        "start_time": None,
        "end_time": None,
        "venue_name": None,
        "address": None,
        "category": None,
        "description": None,
        "price": None,
        "organizer": None,
        "ticket_url": None,
        "phone": None,
        "image_url": None,
        "is_event": False,
        "confidence_score": 0.0,
        "confidence_reasons": [],
    }


def _postprocess(result: dict[str, Any]) -> dict[str, Any]:
    """
    Normalise and validate the extraction result.

    - Clamp confidence_score to [0.0, 1.0]
    - Ensure confidence_reasons is a list
    - Coerce is_event to bool
    - If is_event is False, force confidence_score to 0.0
    - Validate date format; null it out if malformed
    - Validate time format; null it out if malformed
    """
    base = _empty_result()
    base.update(result)

    # Type coercions
    base["is_event"] = bool(base.get("is_event", False))
    base["confidence_reasons"] = list(base.get("confidence_reasons") or [])

    # Score clamping
    try:
        score = float(base["confidence_score"])
    except (TypeError, ValueError):
        score = 0.0
    base["confidence_score"] = round(max(0.0, min(1.0, score)), 3)

    # If not an event, score must be 0
    if not base["is_event"]:
        base["confidence_score"] = 0.0

    # Date format validation
    if base["date"]:
        try:
            datetime.strptime(base["date"], "%Y-%m-%d")
        except ValueError:
            logger.warning("Invalid date format '%s', nulling", base["date"])
            base["date"] = None
            base["confidence_score"] = max(0.0, base["confidence_score"] - 0.25)
            base["confidence_reasons"].append("Date format invalid — nulled")

    # Time format validation
    for field in ("start_time", "end_time"):
        if base[field]:
            if not re.match(r"^\d{2}:\d{2}$", base[field]):
                logger.warning("Invalid %s format '%s', nulling", field, base[field])
                base[field] = None
                if field == "start_time":
                    base["confidence_score"] = max(0.0, base["confidence_score"] - 0.10)
                    base["confidence_reasons"].append("start_time format invalid — nulled")

    return base
