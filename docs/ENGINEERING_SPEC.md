# Jerusalem.live — Engineering Specification
<!-- Jerusalem.live — Task E complete -->
<!-- Full engineering specification for developer handoff -->

**Version:** 1.0  
**Based on PRD:** v1.2  
**Date:** May 2026  
**Status:** Ready for implementation

---

## Table of Contents

1. [API Endpoint Definitions](#1-api-endpoint-definitions)
2. [Database Migration SQL](#2-database-migration-sql)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [Environment Variables](#4-environment-variables)
5. [Docker Compose — Local Development](#5-docker-compose--local-development)
6. [Deployment Architecture](#6-deployment-architecture)

---

## 1. API Endpoint Definitions

All endpoints are FastAPI routes. Base URL: `https://api.jerusalem.live/v1`

Authentication: Supabase JWT passed as `Authorization: Bearer <token>`. Public endpoints accept unauthenticated requests but return only `visibility = 'public'` events.

---

### 1.1 Events

#### `GET /events`

Returns events visible to the requesting user. Server-side visibility filtering is applied in SQL — the frontend never receives events it is not permitted to see, and group names are never returned.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `lat` | float | — | Map bounds: min latitude |
| `lng` | float | — | Map bounds: min longitude |
| `lat2` | float | — | Map bounds: max latitude |
| `lng2` | float | — | Map bounds: max longitude |
| `from` | ISO 8601 datetime | today 00:00 | Start of time window |
| `to` | ISO 8601 datetime | today+7 23:59 | End of time window |
| `category` | comma-separated | all | Filter by category: `party,music,market,outdoor,culture` |
| `limit` | int | 100 | Max results |
| `offset` | int | 0 | Pagination offset |

**Response `200`:**

```json
{
  "events": [
    {
      "id": "uuid",
      "name": "string",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM | null",
      "venue": "string",
      "address": "string",
      "lat": 31.7683,
      "lng": 35.2137,
      "category": "party | music | market | outdoor | culture",
      "description": "string",
      "image_url": "string | null",
      "price": "string | null",
      "visibility": "public | registered | private",
      "status": "auto_published | approved | pending | rejected",
      "organizer_id": "uuid | null",
      "is_featured": false,
      "created_at": "ISO 8601"
    }
  ],
  "total": 42,
  "has_more": false
}
```

Note: `source_group_id` is never returned to clients.

---

#### `GET /events/{id}`

Returns a single event by UUID. Same visibility rules apply.

**Response `200`:** Single event object (same shape as list item above).  
**Response `403`:** Event exists but user does not have visibility.  
**Response `404`:** Event not found.

---

#### `POST /events`

Submit a new event manually. Requires authentication.

**Request body:**

```json
{
  "name": "string (required)",
  "date": "YYYY-MM-DD (required)",
  "start_time": "HH:MM (required)",
  "end_time": "HH:MM | null",
  "venue": "string (required)",
  "address": "string (required)",
  "category": "party | music | market | outdoor | culture (required)",
  "description": "string (max 280 chars)",
  "image_url": "string | null",
  "price": "string | null",
  "ticket_url": "string | null"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "status": "pending",
  "message": "Event submitted for review"
}
```

---

#### `PATCH /events/{id}`

Update an event. Organisers can update their own events (status resets to `pending`). Admins can update any event.

**Request body:** Partial event object (any updatable fields).

**Response `200`:** Updated event object.  
**Response `403`:** Not authorised to edit this event.

---

#### `DELETE /events/{id}`

Soft-delete an event (sets `status = 'deleted'`). Admin only.

**Response `204`:** No content.

---

### 1.2 Authentication

Authentication is delegated to Supabase Auth. The API exposes one custom endpoint for phone number registration (required for WhatsApp membership verification).

#### `POST /auth/register-phone`

Register or update the authenticated user's phone number. Sends an OTP via SMS.

**Request body:**
```json
{ "phone": "+972501234567" }
```

**Response `200`:**
```json
{ "message": "OTP sent" }
```

---

#### `POST /auth/verify-phone`

Verify the OTP sent to the user's phone number.

**Request body:**
```json
{ "phone": "+972501234567", "otp": "123456" }
```

**Response `200`:**
```json
{ "verified": true }
```

**Response `400`:**
```json
{ "error": "Invalid or expired OTP" }
```

---

#### `GET /auth/memberships`

Returns the current user's allowed WhatsApp group IDs (internal server use only — the response contains only opaque group UUIDs, not names).

**Response `200`:**
```json
{
  "group_ids": ["uuid-1", "uuid-2"],
  "last_synced_at": "ISO 8601"
}
```

---

### 1.3 WhatsApp Webhook

Receives message payloads from the Baileys microservice.

#### `POST /webhook/whatsapp`

**Authentication:** Internal HMAC-SHA256 signature header: `X-Baileys-Signature: <hex>`. The API verifies this using `BAILEYS_WEBHOOK_SECRET` before processing.

**Request body:**
```json
{
  "message_id": "string (unique Baileys message ID)",
  "group_id": "uuid (internal Supabase group UUID)",
  "text": "string | null",
  "image_b64": "string | null (base64, only for small images)",
  "image_url": "string | null (Supabase Storage URL for large images)",
  "raw_payload": {},
  "received_at": "ISO 8601"
}
```

**Response `202`:** Accepted (pipeline runs asynchronously).
```json
{ "queued": true, "message_id": "string" }
```

**Response `401`:** Invalid signature.

---

### 1.4 Admin Actions

All admin endpoints require `role = 'admin'` in the JWT claims.

#### `GET /admin/queue`

Returns pending events sorted by `created_at` descending.

**Query params:** `limit` (default 50), `offset`, `min_confidence` (float), `max_confidence` (float).

**Response `200`:**
```json
{
  "events": [...],  // Full event objects including source_group_id and raw_message
  "stats": {
    "total_pending": 6,
    "auto_published_today": 14,
    "rejected_today": 3,
    "avg_confidence": 0.74
  }
}
```

---

#### `POST /admin/events/{id}/approve`

Approve a pending event (sets `status = 'approved'`, `visibility = 'registered'`).

**Response `200`:** Updated event.

---

#### `POST /admin/events/{id}/reject`

Reject a pending event (sets `status = 'rejected'`).

**Request body (optional):** `{ "reason": "string" }`

**Response `200`:** `{ "id": "uuid", "status": "rejected" }`

---

#### `POST /admin/bulk`

Bulk approve or reject multiple events.

**Request body:**
```json
{
  "action": "approve | reject",
  "event_ids": ["uuid-1", "uuid-2"]
}
```

**Response `200`:** `{ "affected": 2 }`

---

#### `GET /admin/groups`

Returns all monitored WhatsApp groups (admin only).

**Response `200`:**
```json
{
  "groups": [
    {
      "id": "uuid",
      "baileys_group_id": "string",
      "display_name": "Jerusalem Parties 🎉",
      "event_count": 42,
      "created_at": "ISO 8601"
    }
  ]
}
```

---

## 2. Database Migration SQL

Run these migrations in order against a Supabase PostgreSQL instance.

```sql
-- ── 001_enable_extensions.sql ────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";


-- ── 002_users.sql ────────────────────────────────────────────────────────────

-- Note: Supabase Auth creates auth.users automatically.
-- This table stores application-level user data, linked via id.

CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  phone_number    TEXT UNIQUE,           -- Israeli format: +972XXXXXXXXX
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  display_name    TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'organizer', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for phone-based membership lookup
CREATE INDEX idx_users_phone ON public.users (phone_number);

-- RLS: users can read/update their own row only
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);


-- ── 003_whatsapp_groups.sql ──────────────────────────────────────────────────

CREATE TABLE public.whatsapp_groups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baileys_group_id  TEXT NOT NULL UNIQUE,   -- Internal Baileys JID, e.g. "120363xxxxxx@g.us"
  display_name      TEXT NOT NULL,           -- Admin-visible name only, NEVER sent to clients
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin-only access: no RLS needed as this table is service-role only
-- The API never queries this table in user-facing endpoints


-- ── 004_user_group_memberships.sql ───────────────────────────────────────────

CREATE TABLE public.user_group_memberships (
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES public.whatsapp_groups(id) ON DELETE CASCADE,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_memberships_user ON public.user_group_memberships (user_id);
CREATE INDEX idx_memberships_group ON public.user_group_memberships (group_id);


-- ── 005_organizers.sql ───────────────────────────────────────────────────────

CREATE TABLE public.organizers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
                        CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled')),
  plan                TEXT CHECK (plan IN ('monthly', 'annual')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 006_events.sql ───────────────────────────────────────────────────────────

CREATE TABLE public.events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core fields
  name             TEXT NOT NULL,
  date             DATE,
  start_time       TIME,
  end_time         TIME,
  venue            TEXT,
  address          TEXT,
  -- PostGIS geographic point (SRID 4326 = WGS84 lat/lng)
  coordinates      GEOGRAPHY(POINT, 4326),
  category         TEXT CHECK (category IN ('party', 'music', 'market', 'outdoor', 'culture')),
  description      TEXT CHECK (char_length(description) <= 280),
  image_url        TEXT,
  price            TEXT,
  ticket_url       TEXT,

  -- Source metadata
  source           TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('whatsapp', 'manual', 'organizer')),
  source_group_id  UUID REFERENCES public.whatsapp_groups(id),

  -- Visibility & moderation
  visibility       TEXT NOT NULL DEFAULT 'private'
                     CHECK (visibility IN ('private', 'registered', 'public')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'auto_published', 'approved', 'rejected', 'deleted')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Organizer linkage
  organizer_id     UUID REFERENCES public.organizers(id),
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for map bounds queries
CREATE INDEX idx_events_coordinates ON public.events USING GIST (coordinates);

-- Time range queries
CREATE INDEX idx_events_date ON public.events (date, start_time);

-- Status queries (admin queue)
CREATE INDEX idx_events_status ON public.events (status, created_at DESC);

-- Visibility queries
CREATE INDEX idx_events_visibility ON public.events (visibility, status);

-- Source group (for user membership filtering)
CREATE INDEX idx_events_source_group ON public.events (source_group_id)
  WHERE source_group_id IS NOT NULL;


-- ── 007_events_rls.sql ───────────────────────────────────────────────────────

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public events: visible to everyone (including unauthenticated guests)
CREATE POLICY "Public events visible to all"
  ON public.events FOR SELECT
  USING (
    visibility = 'public'
    AND status IN ('approved', 'auto_published')
  );

-- Registered events: visible to authenticated users
CREATE POLICY "Registered events visible to auth users"
  ON public.events FOR SELECT
  USING (
    visibility = 'registered'
    AND status IN ('approved', 'auto_published')
    AND auth.uid() IS NOT NULL
  );

-- Private events: visible only to members of the source WhatsApp group
CREATE POLICY "Private events visible to group members"
  ON public.events FOR SELECT
  USING (
    visibility = 'private'
    AND status IN ('approved', 'auto_published')
    AND auth.uid() IS NOT NULL
    AND source_group_id IN (
      SELECT group_id
      FROM public.user_group_memberships
      WHERE user_id = auth.uid()
        -- Membership must have been verified within the last 90 minutes
        AND last_verified_at > NOW() - INTERVAL '90 minutes'
    )
  );

-- Organizers can see their own events regardless of status
CREATE POLICY "Organizers can see own events"
  ON public.events FOR SELECT
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE user_id = auth.uid()
    )
  );

-- Admins bypass all RLS (enforced at service role level in API)


-- ── 008_whatsapp_messages.sql ────────────────────────────────────────────────

CREATE TABLE public.whatsapp_messages (
  id            TEXT PRIMARY KEY,          -- Baileys message ID (globally unique)
  group_id      UUID NOT NULL REFERENCES public.whatsapp_groups(id),
  message_text  TEXT,
  image_url     TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  processed_at  TIMESTAMPTZ,
  event_id      UUID REFERENCES public.events(id)   -- null if not an event
);

CREATE INDEX idx_messages_group ON public.whatsapp_messages (group_id, processed_at DESC);
CREATE INDEX idx_messages_event ON public.whatsapp_messages (event_id)
  WHERE event_id IS NOT NULL;


-- ── 009_insert_event_rpc.sql ─────────────────────────────────────────────────

-- Helper function called by pipeline.py to insert events with PostGIS geometry
CREATE OR REPLACE FUNCTION public.insert_event(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  wkt TEXT;
  geom GEOGRAPHY;
BEGIN
  wkt := payload->>'coordinates_wkt';
  IF wkt IS NOT NULL THEN
    geom := ST_GeogFromText(wkt);
  END IF;

  INSERT INTO public.events (
    name, date, start_time, end_time, venue, address,
    coordinates, category, description, price,
    source, source_group_id, visibility, status, confidence_score
  ) VALUES (
    payload->>'name',
    (payload->>'date')::DATE,
    (payload->>'start_time')::TIME,
    (payload->>'end_time')::TIME,
    payload->>'venue',
    payload->>'address',
    geom,
    payload->>'category',
    payload->>'description',
    payload->>'price',
    payload->>'source',
    (payload->>'source_group_id')::UUID,
    payload->>'visibility',
    payload->>'status',
    (payload->>'confidence_score')::FLOAT
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


-- ── 010_updated_at_trigger.sql ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER organizers_updated_at
  BEFORE UPDATE ON public.organizers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 3. Sequence Diagrams

### 3.1 WhatsApp Message → Event Pipeline

```
Baileys          FastAPI          Extractor       Nominatim        Supabase
  │                 │                 │                │                │
  │─ POST /webhook ─▶                 │                │                │
  │  {message_id,   │                 │                │                │
  │   group_id,     │ verify HMAC     │                │                │
  │   text,         │─────────────────▶               │                │
  │   image_b64}    │                 │                │                │
  │                 │ extract_event() │                │                │
  │                 │────────────────▶               │                │
  │                 │                 │ POST Claude API│                │
  │                 │                 │────────────────────────────────▶ (Claude)
  │                 │                 │◀────────────────────────────────
  │                 │                 │ {event fields, │                │
  │                 │                 │  confidence}   │                │
  │                 │◀────────────────│                │                │
  │                 │                 │                │                │
  │                 │ [is_event=false]│                │                │
  │                 │─ write raw msg ─────────────────────────────────▶│
  │                 │   return 202    │                │                │
  │                 │                 │                │                │
  │                 │ [is_event=true] │                │                │
  │                 │ geocode_address()               │                │
  │                 │────────────────────────────────▶               │
  │                 │                 │ GET /search    │                │
  │                 │                 │ ?q=address,IL  │                │
  │                 │                 │────────────────▶               │
  │                 │                 │                │◀── {lat,lng} ──│
  │                 │◀─────────────────────────────────               │
  │                 │                 │                │                │
  │                 │ [conf >= 0.85]─────────────────────────────────▶│
  │                 │   INSERT event  │                │  status=       │
  │                 │   status=       │                │  auto_published│
  │                 │   auto_published│                │                │
  │                 │                 │                │                │
  │                 │ [conf < 0.85] ──────────────────────────────────▶│
  │                 │   INSERT event  │                │  status=pending│
  │                 │   status=pending│                │  (admin queue) │
  │                 │                 │                │                │
  │                 │ INSERT whatsapp_messages (audit trail)           │
  │                 │────────────────────────────────────────────────▶│
  │◀─ 202 Accepted ─│                 │                │                │
```

---

### 3.2 User Auth + Group Membership Verification

```
Client           Supabase Auth     FastAPI          Baileys Service   Supabase DB
  │                   │               │                   │                │
  │─ Google Sign-In ─▶               │                   │                │
  │◀─── JWT token ────│               │                   │                │
  │                   │               │                   │                │
  │─ POST /auth/register-phone ──────▶               │                │
  │  {phone: "+972..."}│               │ send OTP (Twilio) │                │
  │                   │               │──────────────────────────────────  │
  │◀── 200 OTP sent ──────────────────│               │                │
  │                   │               │                   │                │
  │─ POST /auth/verify-phone ────────▶               │                │
  │  {phone, otp}     │               │ verify OTP        │                │
  │                   │               │ UPDATE users SET  │                │
  │                   │               │   phone_verified=T│                │
  │                   │               │──────────────────────────────────▶│
  │◀── 200 verified ──────────────────│               │                │
  │                   │               │                   │                │
  │─ GET /events (with JWT) ─────────▶               │                │
  │                   │               │ sync memberships? │                │
  │                   │               │ (if last_verified > 90 min ago)   │
  │                   │               │──────────────────▶               │
  │                   │               │ getGroupParticipants(user.phone)  │
  │                   │               │◀─ [group_id_1, group_id_3] ──────│
  │                   │               │                   │                │
  │                   │               │ UPSERT user_group_memberships    │
  │                   │               │──────────────────────────────────▶│
  │                   │               │                   │                │
  │                   │               │ SELECT events WHERE               │
  │                   │               │   (visibility='public')           │
  │                   │               │   OR (visibility='registered')    │
  │                   │               │   OR (visibility='private' AND    │
  │                   │               │       source_group_id IN          │
  │                   │               │       user.allowed_groups)        │
  │                   │               │──────────────────────────────────▶│
  │◀── filtered events ───────────────│               │◀── rows ──────────│
```

---

### 3.3 Event Visibility Filtering

```
Request arrives with JWT
        │
        ▼
  Extract user_id from JWT
        │
        ▼
  Is user authenticated? ─── No ──▶ Apply policy:
        │                            visibility = 'public'
        │ Yes                        status IN ('approved','auto_published')
        ▼
  Fetch user.allowed_groups
  (from user_group_memberships
   WHERE last_verified < 90 min ago)
        │
        ▼
  SQL WHERE clause:
  ┌─────────────────────────────────────────────┐
  │  (visibility = 'public'                     │
  │   AND status IN ('approved','auto_published')│
  │  )                                          │
  │  OR                                         │
  │  (visibility = 'registered'                 │
  │   AND status IN ('approved','auto_published')│
  │   AND auth.uid() IS NOT NULL                │
  │  )                                          │
  │  OR                                         │
  │  (visibility = 'private'                    │
  │   AND status IN ('approved','auto_published')│
  │   AND source_group_id IN (                  │
  │     SELECT group_id                         │
  │     FROM user_group_memberships             │
  │     WHERE user_id = auth.uid()              │
  │       AND last_verified > NOW() - '90m'     │
  │   )                                         │
  │  )                                          │
  └─────────────────────────────────────────────┘
        │
        ▼
  Return rows (never includes source_group_id field)
```

---

## 4. Environment Variables

### 4.1 FastAPI Backend (`api/.env`)

| Variable | Description | Example |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (frontend-safe) | `eyJhbGc...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key — **never expose to client** | `eyJhbGc...` |
| `ANTHROPIC_API_KEY` | Claude API key for extraction | `sk-ant-...` |
| `BAILEYS_WEBHOOK_SECRET` | HMAC secret shared with Baileys service | `random-256-bit-hex` |
| `BAILEYS_SERVICE_URL` | Internal URL of the Baileys microservice | `http://baileys:3001` |
| `CONFIDENCE_THRESHOLD` | Auto-publish threshold (default: `0.85`) | `0.85` |
| `NOMINATIM_USER_AGENT` | Required by OpenStreetMap ToS | `Jerusalem.live/1.0 (hello@jerusalem.live)` |
| `TWILIO_ACCOUNT_SID` | Twilio for OTP SMS | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `...` |
| `TWILIO_FROM_NUMBER` | Twilio sender number | `+12025551234` |
| `STRIPE_SECRET_KEY` | Stripe server-side key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `JWT_SECRET` | Internal service-to-service JWT (not Supabase) | `random-secret` |
| `ENVIRONMENT` | `development` or `production` | `production` |
| `LOG_LEVEL` | Python log level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `https://jerusalem.live,http://localhost:5173` |

### 4.2 Baileys WhatsApp Microservice (`baileys/.env`)

| Variable | Description | Example |
|---|---|---|
| `API_WEBHOOK_URL` | FastAPI webhook endpoint | `https://api.jerusalem.live/v1/webhook/whatsapp` |
| `BAILEYS_WEBHOOK_SECRET` | Shared HMAC secret (must match API) | `same-as-api` |
| `SUPABASE_URL` | For reading group table to resolve group UUIDs | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key | `eyJhbGc...` |
| `SUPABASE_STORAGE_BUCKET` | Bucket name for image uploads | `event-images` |
| `MAX_IMAGE_SIZE_KB` | Images above this are uploaded to Storage instead of b64 | `150` |
| `SESSION_PATH` | Path to persist Baileys session (WhatsApp QR auth state) | `/data/baileys-session` |
| `PORT` | HTTP port | `3001` |

### 4.3 Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public) | `eyJhbGc...` |
| `VITE_API_BASE_URL` | API base URL | `https://api.jerusalem.live/v1` |
| `VITE_MAPBOX_TOKEN` | Mapbox GL JS public token | `pk.eyJ1...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `VITE_ENVIRONMENT` | `development` or `production` | `production` |

---

## 5. Docker Compose — Local Development

```yaml
# docker-compose.yml
# Local development stack: FastAPI + Baileys + Supabase (local via supabase CLI)
#
# Prerequisites:
#   1. Install Supabase CLI: brew install supabase/tap/supabase
#   2. Run: supabase start   (starts local Postgres + Auth + Storage + Studio)
#   3. Copy .env.example to .env and fill in values
#   4. Run: docker compose up

version: "3.9"

services:

  # ── FastAPI backend ──────────────────────────────────────────────────────────
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./api:/app
    env_file:
      - ./api/.env
    environment:
      - SUPABASE_URL=http://kong:8000   # local Supabase Kong gateway
      - BAILEYS_SERVICE_URL=http://baileys:3001
      - ENVIRONMENT=development
    depends_on:
      - baileys
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Baileys WhatsApp microservice ────────────────────────────────────────────
  baileys:
    build:
      context: ./baileys
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    volumes:
      - ./baileys:/app
      - baileys-session:/data/baileys-session   # persist WhatsApp QR auth state
    env_file:
      - ./baileys/.env
    environment:
      - API_WEBHOOK_URL=http://api:8000/v1/webhook/whatsapp
      - SESSION_PATH=/data/baileys-session
      - PORT=3001
    command: node --watch src/index.js
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ── Frontend dev server ──────────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    env_file:
      - ./frontend/.env
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/v1
      - VITE_SUPABASE_URL=http://localhost:54321  # local Supabase
    depends_on:
      - api
    command: npm run dev -- --host 0.0.0.0

volumes:
  baileys-session:
    driver: local
```

### Dockerfile — FastAPI (`api/Dockerfile`)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile — Baileys (`baileys/Dockerfile`)

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Quick-start commands

```bash
# 1. Start local Supabase (runs Postgres, Auth, Storage, Studio on localhost:54323)
supabase start

# 2. Apply migrations
supabase db push

# 3. Start the full stack
docker compose up

# 4. Run extraction tests (no Docker needed)
cd api && pip install -r requirements-dev.txt
pytest extraction/test_extractor.py -v

# 5. Scan local Supabase Studio
open http://localhost:54323
```

---

## 6. Deployment Architecture

### 6.1 ASCII Diagram

```
                        ┌─────────────────────────────────────────────┐
                        │                   USERS                     │
                        │  Browser / PWA (mobile-first)               │
                        └──────────────────┬──────────────────────────┘
                                           │ HTTPS
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL (Frontend)                               │
│                                                                              │
│   React + TypeScript SPA                                                     │
│   ├── Mapbox GL JS (map rendering)                                           │
│   ├── Supabase JS client (auth, realtime)                                    │
│   └── Stripe.js (payment UI)                                                 │
│                                                                              │
│   CDN edge: 30+ global PoPs, automatic branch previews                       │
└───────────────┬──────────────────────────┬───────────────────────────────────┘
                │ REST /v1/*               │ Supabase realtime WS
                ▼                          ▼
┌───────────────────────────┐   ┌──────────────────────────────────────────────┐
│  RAILWAY (FastAPI + Ext.) │   │              SUPABASE                        │
│                           │   │                                              │
│  FastAPI (Python 3.12)    │◀──│  PostgreSQL + PostGIS                        │
│  ├── /events CRUD         │──▶│  ├── events (RLS enforced)                   │
│  ├── /webhook/whatsapp    │   │  ├── users                                   │
│  ├── /admin/*             │   │  ├── user_group_memberships                  │
│  └── /auth/*              │   │  ├── whatsapp_groups                         │
│                           │   │  ├── whatsapp_messages                       │
│  Extraction pipeline      │   │  └── organizers                              │
│  ├── Claude API calls     │   │                                              │
│  └── Nominatim geocoding  │   │  Auth (Google OAuth, email, phone OTP)       │
│                           │   │  Storage (event images / flyers)             │
│  Shared internal network  │   │  Realtime (event approvals → client push)    │
│  with Baileys service     │   └──────────────────────────────────────────────┘
└───────────────┬───────────┘
                │ HTTP (internal)
                ▼
┌───────────────────────────┐
│  RAILWAY (Baileys Service)│
│                           │
│  Node.js 20               │
│  └── Baileys (unofficial  │
│      WhatsApp Web client) │
│       ├── Listens to N    │
│       │   approved groups │
│       └── Forwards msgs   │
│           to FastAPI      │
│           /webhook        │
│                           │
│  Persistent volume for    │
│  WhatsApp session state   │
└───────────────────────────┘

External services:
  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
  │ Anthropic API  │  │  Mapbox API  │  │  Stripe API  │  │   Twilio    │
  │ (Claude extrac)│  │ (map tiles)  │  │ (payments)   │  │ (OTP SMS)   │
  └────────────────┘  └──────────────┘  └──────────────┘  └─────────────┘
  ┌────────────────┐
  │  Nominatim OSM │
  │ (free geocoding│
  │  max 1 req/s)  │
  └────────────────┘
```

### 6.2 Service Summary

| Service | Platform | Instance | Notes |
|---|---|---|---|
| Frontend | Vercel | Hobby/Pro | Auto-deploy from `main`; branch previews per PR |
| FastAPI API | Railway | Starter ($5/mo) | Auto-scale on traffic; persistent env vars |
| Baileys Service | Railway | Starter ($5/mo) | Persistent volume required for session state |
| Database | Supabase | Free/Pro | Managed Postgres + PostGIS + Auth + Storage |
| Map tiles | Mapbox | Pay-per-request | ~50k free tile loads/month |
| LLM Extraction | Anthropic | Pay-per-token | ~$0.003/message at claude-sonnet pricing |
| Geocoding | OSM Nominatim | Free | Rate-limited to 1 req/sec; cache aggressively |
| Payments | Stripe | Pay-as-you-go | 2.9% + $0.30 per transaction |
| SMS OTP | Twilio | Pay-per-SMS | ~$0.0075/SMS in Israel |

### 6.3 CI/CD Pipeline

```
Developer pushes to GitHub
        │
        ▼
GitHub Actions
  ├── pytest extraction/test_extractor.py
  ├── mypy --strict api/
  ├── tsc --noEmit (frontend)
  └── [all pass] ──▶ merge to main
                          │
                          ▼
              Vercel auto-deploy (frontend)
              Railway auto-deploy (api + baileys)
              Supabase migrations via:
                supabase db push --linked
```

---

*Jerusalem.live Engineering Specification v1.0 — Internal*
