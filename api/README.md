# Jerusalem.live — API

Python 3.12 + FastAPI backend.

## Setup

```bash
cd api
cp .env.example .env        # fill in keys
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

## Structure

```
api/
├── main.py              # FastAPI app, CORS, router wiring
├── requirements.txt
├── .env.example
├── extraction/
│   ├── extractor.py     # Claude API call → structured event JSON
│   ├── pipeline.py      # WhatsApp msg → extract → geocode → Supabase
│   └── test_extractor.py
└── src/
    └── routers/         # TODO: implement per ENGINEERING_SPEC.md
        ├── events.py
        ├── auth.py
        ├── webhook.py
        └── admin.py
```

## Run tests

```bash
pytest extraction/test_extractor.py -v
# No API key needed — Anthropic client is mocked in tests
```

## Extraction pipeline

See `extraction/extractor.py` for the Claude API extraction logic.
See `extraction/pipeline.py` for the full orchestration flow.
See `docs/ENGINEERING_SPEC.md` Section 3.1 for the sequence diagram.

Auto-publish threshold: confidence ≥ **0.85** (set via `CONFIDENCE_THRESHOLD` env var).
