# Jerusalem.live

> Discover what's happening in Jerusalem tonight — on a map, on a timeline, in real time.

City-events discovery platform for Jerusalem's liberal student community. Aggregates events from WhatsApp groups via an LLM extraction pipeline and surfaces them on a synchronized map + horizontal timeline UI.

## Repo Structure

```
jerusalem-live/
├── frontend/          # React + TypeScript SPA (Vite)
├── api/               # Python FastAPI backend
├── baileys/           # Node.js WhatsApp microservice
└── docs/              # PRD + Engineering Spec
```

## Quick Start (local dev)

**Prerequisites:** Node 20+, Python 3.12+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
# 1. Start local Supabase (Postgres + Auth + Storage + Studio)
supabase start

# 2. Apply DB migrations
supabase db push

# 3. Start all services
docker compose up

# 4. Frontend only (faster iteration)
cd frontend && npm install && npm run dev
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Mapbox GL JS |
| Backend | Python 3.12, FastAPI, Supabase (PostgreSQL + PostGIS) |
| WhatsApp | Node.js 20, Baileys |
| LLM | Claude API (`claude-sonnet-4-20250514`) |
| Payments | Stripe |
| Hosting | Vercel (frontend), Railway (api + baileys) |

## Docs

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements v1.2
- [`docs/ENGINEERING_SPEC.md`](docs/ENGINEERING_SPEC.md) — API endpoints, DB schema, sequence diagrams, env vars, Docker Compose, deployment architecture

## Key Conventions

- **Never** use Florentin (it's Tel Aviv, not Jerusalem)
- **Never** use `localStorage`
- React: functional components + hooks only, no class components
- Hebrew text: always `direction: 'rtl'`
- Python: type hints everywhere, `async` where appropriate
- File naming: `kebab-case` for TSX/JSX, `snake_case` for Python
- Auto-publish threshold: confidence ≥ 0.85
- Category colors: `#FF3366` party · `#FF9500` music · `#30D158` market · `#64D2FF` outdoor · `#BF5AF2` culture
