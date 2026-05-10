"""
Jerusalem.live — FastAPI backend entry point

Run locally:
    uvicorn main:app --reload --port 8000

All routes are in src/routers/. This file wires them together and
configures CORS, auth middleware, and error handlers.

TODO for Claude Code:
  - Implement src/routers/events.py  (GET/POST/PATCH/DELETE /v1/events)
  - Implement src/routers/auth.py    (phone register/verify, memberships)
  - Implement src/routers/webhook.py (POST /v1/webhook/whatsapp)
  - Implement src/routers/admin.py   (queue, approve, reject, bulk, groups)
  - Add Supabase JWT middleware for auth.uid() extraction
  - Add membership sync background task (60-min interval per user)

See docs/ENGINEERING_SPEC.md for full endpoint definitions.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Jerusalem.live API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Routers (stub — implement in src/routers/) ────────────────────────────────

# from src.routers import events, auth, webhook, admin
# app.include_router(events.router,  prefix="/v1")
# app.include_router(auth.router,    prefix="/v1")
# app.include_router(webhook.router, prefix="/v1")
# app.include_router(admin.router,   prefix="/v1/admin")
