# CLAUDE.md — Jerusalem.live

This file gives Claude Code full context on this project.
Read this before touching any file.

---

## What this is

**Jerusalem.live** — city-events discovery platform for Jerusalem's liberal student community.
Aggregates events from WhatsApp groups via an LLM extraction pipeline.
Displays them on a synchronized map + horizontal timeline UI.

One-line pitch: *Discover what's happening in Jerusalem tonight — on a map, on a timeline, in real time.*

---

## Repo structure

```
jerusalem-live/
├── frontend/          React 18 + TypeScript + Vite SPA
├── api/               Python 3.12 + FastAPI backend
├── baileys/           Node.js 20 WhatsApp microservice (Baileys)
├── docs/
│   ├── PRD.md         Product requirements v1.2
│   └── ENGINEERING_SPEC.md   API endpoints, DB schema, env vars, Docker, deployment
├── docker-compose.yml Local dev stack
└── CLAUDE.md          ← you are here
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Mapbox GL JS, Supabase JS |
| Backend | Python 3.12, FastAPI, Supabase (PostgreSQL + PostGIS) |
| WhatsApp | Node.js 20, Baileys (unofficial WhatsApp Web client) |
| LLM | Claude API — model: `claude-sonnet-4-20250514` |
| Auth | Supabase Auth (Google OAuth + email/password + phone OTP) |
| Payments | Stripe |
| Hosting | Vercel (frontend), Railway (api + baileys) |

---

## Current state

### What exists (working code)

**Frontend (`frontend/src/`)**
- `jerusalem-live-v2.jsx` — full interactive prototype with mock data. Google Maps dark style. This is the visual reference. **Do not delete.**
- `admin-dashboard.jsx` — admin review queue UI with mock data. **Do not delete.**
- `components/` — TypeScript component library decomposed from the prototype:
  `MapView`, `Timeline`, `EventPin`, `PillLane`, `BottomSheet`, `FilterBar`, `TimeRangeHandle`
- `hooks/` — `useMapInteraction`, `useTimelineInteraction`, `useCrossHighlight`
- `types/index.ts` — all TypeScript interfaces

**API (`api/`)**
- `extraction/extractor.py` — Claude API extraction pipeline (Hebrew/English/images)
- `extraction/pipeline.py` — orchestration: webhook → extract → geocode → Supabase
- `extraction/test_extractor.py` — 10-message test suite (run with `pytest -v`)
- `main.py` — FastAPI app stub (CORS + health check; routers not yet implemented)

**Baileys (`baileys/`)**
- `src/index.js` — stub with health check server; WhatsApp connection not yet implemented

### What needs to be built (priority order)

1. **FastAPI routers** — `src/routers/events.py`, `auth.py`, `webhook.py`, `admin.py`
   → Full spec in `docs/ENGINEERING_SPEC.md` Section 1
2. **Supabase DB migrations** — SQL in `docs/ENGINEERING_SPEC.md` Section 2
3. **Baileys connection** — implement `baileys/src/index.js` per spec Section 3.1
4. **Wire frontend to API** — replace mock `EVENTS` array in prototype with real `/v1/events` calls
5. **Auth flow** — Supabase Google OAuth + phone OTP

---

## Conventions — follow these always

- **Never** use Florentin (it's Tel Aviv, not Jerusalem)
- **Never** use `localStorage`
- React: functional components + hooks only — no class components
- Hebrew text: always `direction: 'rtl'` when displaying Hebrew strings
- Python: type hints everywhere, `async` where appropriate
- File naming: `kebab-case` for TSX/JSX, `snake_case` for Python
- Commit header on every file: `// Jerusalem.live — [description]`

---

## Key constants

```
DAY_START = 6          # Timeline axis start hour
DAY_END   = 30         # Timeline axis end (30 = 06:00 next day)
CONFIDENCE_THRESHOLD = 0.85   # Auto-publish cutoff

# Category colors
party:   #FF3366
music:   #FF9500
market:  #30D158
outdoor: #64D2FF
culture: #BF5AF2

# Map dark palette (Google Maps style)
navy:   #1a1c2e   (base)
roads:  #2d3047
blocks: #1e2035
```

---

## Jerusalem neighbourhoods in scope

Mahane Yehuda, Nachlaot, Nahalat Shiva, German Colony, Musrara,
Talpiot, Ein Karem, Katamon, Rehavia, Baka, Abu Tor, Har Nof,
Givat Ram, French Hill, Ramot, Ramat Eshkol, Pisgat Ze'ev

---

## Local dev quick start

```bash
# 1. Start Supabase locally
supabase start

# 2. Apply DB migrations (from ENGINEERING_SPEC.md Section 2)
supabase db push

# 3. Start API + Baileys
docker compose up

# 4. Start frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173

# 5. Run extraction tests
cd api && pytest extraction/test_extractor.py -v
```

---

## Important files to read first for any task

| Task | Read first |
|---|---|
| Any frontend work | `frontend/src/jerusalem-live-v2.jsx` (visual reference) + `frontend/src/types/index.ts` |
| API endpoints | `docs/ENGINEERING_SPEC.md` Section 1 |
| DB schema | `docs/ENGINEERING_SPEC.md` Section 2 |
| Extraction pipeline | `api/extraction/extractor.py` + `api/extraction/pipeline.py` |
| Baileys service | `docs/ENGINEERING_SPEC.md` Section 3.1 (sequence diagram) |
| Deployment | `docs/ENGINEERING_SPEC.md` Sections 5–6 |
| Product decisions | `docs/PRD.md` |
