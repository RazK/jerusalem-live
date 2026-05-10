# Jerusalem.live — Baileys WhatsApp Microservice

Node.js 20 service that connects to WhatsApp Web and forwards messages
to the FastAPI extraction pipeline.

## Setup

```bash
cd baileys
cp .env.example .env   # fill in keys
npm install
npm run dev
```

On first run, a QR code is printed to the terminal. Scan it with the
**bot WhatsApp account** (not your personal account). The session is
saved to `SESSION_PATH` and persists across restarts.

## Architecture

```
WhatsApp groups
      │  (approved groups only)
      ▼
Baileys listener
      │
      ├── Filter: is this group in whatsapp_groups table?
      ├── Media: upload images > MAX_IMAGE_SIZE_KB to Supabase Storage
      │
      ▼
POST /v1/webhook/whatsapp  (FastAPI)
  Headers: X-Baileys-Signature: HMAC-SHA256(body, BAILEYS_WEBHOOK_SECRET)
  Body: { message_id, group_id, text, image_b64?, image_url?, raw_payload }
```

## Important

- **Never commit `baileys-session/`** — it contains WhatsApp auth credentials
- The bot uses the unofficial Baileys library which violates WhatsApp ToS.
  Keep usage small-scale. See PRD Section 9 (Risks).
- If the session expires, delete `baileys-session/` and re-scan the QR code.
