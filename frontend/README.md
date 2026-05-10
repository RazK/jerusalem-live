# Jerusalem.live — Frontend

React 18 + TypeScript + Vite SPA.

## Setup

```bash
cp .env.example .env   # fill in Supabase + Mapbox + Stripe keys
npm install
npm run dev            # http://localhost:5173
```

## Structure

```
src/
├── App.tsx                      # Top-level shell (currently renders prototype)
├── main.tsx                     # React entry point
├── index.css                    # Global resets
├── jerusalem-live-v2.jsx        # ← PROTOTYPE (visual reference, mock data)
├── admin-dashboard.jsx          # ← PROTOTYPE (admin UI, mock data)
├── components/                  # TypeScript component library
│   ├── MapView.tsx
│   ├── Timeline.tsx
│   ├── EventPin.tsx
│   ├── PillLane.tsx
│   ├── BottomSheet.tsx
│   ├── FilterBar.tsx
│   └── TimeRangeHandle.tsx
├── hooks/
│   ├── useMapInteraction.ts
│   ├── useTimelineInteraction.ts
│   └── useCrossHighlight.ts
└── types/
    └── index.ts                 # All TypeScript interfaces
```

## Migration plan

The two `.jsx` prototype files are the **visual reference and starting point**.
The `components/` and `hooks/` folders are the **production TypeScript library**.

Claude Code task: wire the component library to the real Supabase API and
replace the prototype's mock data, one component at a time.

## Key constants

| Constant | Value | Notes |
|---|---|---|
| `DAY_START` | `6` | Hour axis start (06:00) |
| `DAY_END` | `30` | Hour axis end (06:00 next day) |
| `CONFIDENCE_THRESHOLD` | `0.85` | Auto-publish cutoff |
| Map navy | `#1a1c2e` | Base map background |
| Party | `#FF3366` | Category color |
| Music | `#FF9500` | Category color |
| Market | `#30D158` | Category color |
| Outdoor | `#64D2FF` | Category color |
| Culture | `#BF5AF2` | Category color |
