# Jerusalem.live — Product Requirements Document

**Version:** 1.2  
**Status:** Draft  
**Phase:** Phase 1 — MVP  
**Date:** May 2026  
**Classification:** Confidential  
**Changelog:** v1.2 — Added Section 5.8 Google Calendar Integration; updated Section 5.2 event detail actions; updated data model and open questions

---

## 1. Executive Summary

Jerusalem.live is a city-events discovery platform built for Jerusalem's liberal student community. It aggregates event data from WhatsApp groups, manual submissions, and curated sources, and surfaces them through a novel dual-axis UI — a real-time map and a horizontal timeline — so users can instantly understand what is happening where and when.

> **One-line pitch:** Discover what's happening in Jerusalem tonight — on a map, on a timeline, in real time.

The platform is free for consumers and monetized through organizer subscriptions and featured placements. The core technical differentiator is an LLM-powered WhatsApp crawler that converts unstructured group messages into structured event data automatically.

---

## 2. Problem Statement

Jerusalem has a rich and diverse cultural scene — parties, live music, markets, pop-ups, outdoor festivals — but event discovery is deeply fragmented. Most event information lives inside private WhatsApp groups, word-of-mouth, or buried in social media feeds. There is no single, reliable, visually compelling place to answer the simple question: "What is happening in Jerusalem this week?"

### 2.1 Pain Points

- Events are scattered across dozens of WhatsApp groups, Facebook events, and Instagram stories
- No spatial context — users cannot see at a glance what neighborhoods are active
- No temporal context — existing tools show lists, not intuitive time-based views
- FOMO is high — students frequently miss events they would have attended if they had known
- Organizers have no reliable channel to reach their target audience affordably

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Become the default event discovery tool for Jerusalem students within 12 months
- Achieve 500 monthly active users within 3 months of launch
- Generate first organizer revenue within 6 months

### 3.2 Key Metrics

| Metric | Definition |
|---|---|
| Weekly Active Users (WAU) | Users who open the app and interact with at least one event |
| Event Coverage Rate | % of real Jerusalem events captured in the platform |
| WhatsApp Extraction Accuracy | % of auto-extracted events with correct date, time, and location |
| Organizer Conversion Rate | % of event submitters who upgrade to paid tier |
| Session Duration | Average time spent per session — proxy for discovery quality |

---

## 4. Users & Personas

### 4.1 Primary Persona — The Jerusalem Student

**Maya, 24 — Hebrew University student**
- Lives in Rehavia, goes out 2–3 times per week
- Follows 8+ WhatsApp groups but misses events constantly due to message volume
- Wants to know: "What's happening tonight near me?" in under 30 seconds
- Speaks Hebrew natively, comfortable with English
- Will not pay for a discovery app but will share it virally if it's genuinely useful

### 4.2 Secondary Persona — The Event Organizer

**Rotem, 31 — Independent event promoter**
- Runs 2–4 events per month in Jerusalem — rooftop parties, art shows, DJ nights
- Currently promotes via WhatsApp groups and Instagram; struggles with reach
- Wants: more ticket sales, better audience targeting, event analytics
- Will pay for a featured placement if it demonstrably increases attendance

### 4.3 Out of Scope — Initial Launch

- Tourists (language and context barriers require separate product thinking)
- Religious community events (different discovery patterns and sensitivity)
- Corporate or private events

---

## 5. Feature Requirements

### 5.1 Map + Timeline Viewer (Core UI)

The signature UI consists of two synchronized views: a map and a horizontal timeline. Both views show the same event dataset filtered by the user's current selections.

#### 5.1.1 Map View

- Full-screen interactive map centered on Jerusalem (Mapbox or Google Maps)
- Event pins color-coded by category (parties, live music, markets, outdoor, culture)
- Pins inside the selected time range: full color, prominent
- Pins outside the selected time range: grayed out, still visible for context
- Tapping a pin: selects the event, highlights its pill on the timeline, opens detail bottom sheet
- Clustering for dense areas — tap cluster to expand

#### 5.1.2 Horizontal Timeline

- Fixed panel at the bottom of the screen (approximately 25% of screen height)
- Horizontal axis represents time — scrollable across the current week
- Events appear as colored duration pills (width = event duration, color = category)
- A vertical "NOW" line in the same color as the user's location dot on the map
- Range selector with two drag handles (start time, end time) to define active window
- Pills inside the active window: full color
- Pills outside the active window: grayed out but visible
- Tapping a pill: selects the event, bounces its pin on the map, opens detail bottom sheet

#### 5.1.3 Layout Modes

- Default: map 75%, timeline 25%
- Expanded timeline: map 50%, timeline 50% — triggered by pulling timeline up
- Map fullscreen: timeline minimized to thin strip — triggered by pulling timeline down

#### 5.1.4 Filter Bar

- Horizontal pill/chip filters at the top of the screen
- Categories: Parties, Live Music, Markets, Outdoor, Culture, All
- Selecting a filter updates both map and timeline simultaneously
- Multiple categories can be selected simultaneously

### 5.2 Event Detail — Bottom Sheet

- Slides up from bottom when an event is tapped (pin or pill)
- Header color matches event category color
- Content: event name, date & time, venue name, neighborhood, description, photo (if available)
- Actions: Get Directions (opens Maps), Share to WhatsApp, 📅 Add to Calendar, Interested
- Swipe down to dismiss
- Selected pin pulses on map while sheet is open

#### 5.2.1 Add to Calendar — Implementation

"Add to Calendar" opens a pre-filled Google Calendar event creation URL in the browser. No OAuth or API key required — Google handles authentication on their end since the user is already logged in.

URL format:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={event_name}
  &dates={start_datetime}/{end_datetime}  ← ISO 8601 UTC format: 20260507T210000Z
  &details={description}
  &location={venue}, Jerusalem
```

This works on all platforms (iOS, Android, desktop) and requires zero backend infrastructure. The user lands on a pre-filled GCal form and taps Save — the event appears in their personal calendar immediately.

**Future premium feature:** Silent background sync via Google Calendar API — add events without leaving the app, batch-save multiple events, auto-sync events the user marks as "Interested".

### 5.3 WhatsApp Crawler

The WhatsApp crawler is the primary event data pipeline. It listens to approved WhatsApp groups and uses an LLM to extract structured event data from messages.

#### 5.3.1 Architecture

- WhatsApp client: Baileys (Node.js unofficial library) running as a separate microservice
- The bot account is manually added to each group by the group administrator
- Messages (text, images, PDFs) are forwarded to the extraction pipeline
- LLM layer (Claude API) extracts structured fields from each message
- Extracted events are stored as "pending" and reviewed via admin dashboard
- Confidence scoring: high-confidence extractions auto-publish, low-confidence require review

#### 5.3.2 Extraction Fields

| Field | Description |
|---|---|
| event_name | Name or title of the event |
| date | Date in ISO 8601 format |
| start_time | Start time (24h) |
| end_time | End time if mentioned (24h) |
| venue_name | Name of the venue or location |
| address | Street address or neighborhood |
| coordinates | Geocoded lat/lng from address |
| category | Auto-classified: party, music, market, outdoor, culture |
| description | Short description (max 280 chars) |
| image_url | Extracted flyer image if present |
| source_group | WhatsApp group name (internal only) |
| confidence_score | 0–1 float indicating extraction reliability |

#### 5.3.3 Language Support

- Hebrew, English, and mixed Hebrew-English messages
- Claude prompt instructs extraction in both languages simultaneously
- Output is always stored in structured JSON regardless of source language

### 5.4 Manual Event Submission

- Any logged-in user can submit an event via a simple form
- Fields: name, date, time, venue, description, category, image upload
- Submitted events go to admin review queue
- Organizer accounts (paid) get priority review and featured placement option

### 5.5 Authentication

- Google Sign-In (OAuth 2.0) — primary auth method
- Email/password as fallback
- Auth handled via Supabase Auth
- **Phone number is required at registration** — used to verify WhatsApp group membership (see 5.7)
- Guest browsing allowed for public events only — sign-in required to see group-private events, save events, or submit

### 5.6 Organizer Tier (Premium)

- Monthly subscription via Stripe
- Benefits: featured pin on map (larger, animated), priority review, event analytics dashboard
- Analytics: views, clicks, "interested" count, share count
- Organizer badge on event detail sheet

### 5.7 Privacy & Event Visibility Model

#### 5.7.1 Visibility Tiers

Every event has a `visibility` field with one of three values:

| Tier | Visible To | Default For |
|---|---|---|
| `private` | Verified members of the source WhatsApp group only | All WhatsApp-crawled events |
| `registered` | Any logged-in user regardless of group membership | — |
| `public` | Everyone including unauthenticated guests | Manually promoted events |

All WhatsApp-crawled events default to `private`. Admin or organizer can manually promote to `registered` or `public`. Automation rules for promotion may be added in a future version.

#### 5.7.2 Membership Verification Flow

1. User registers with phone number (verified via OTP at signup)
2. On session start, the backend queries the Baileys service: "which monitored groups contain this phone number?"
3. Backend builds the user's `allowed_groups` list and stores it server-side in the session
4. Every events API query applies a server-side filter: `visibility = 'public' OR visibility = 'registered' OR (visibility = 'private' AND source_group_id IN user.allowed_groups)`
5. The frontend receives only permitted events — group names and membership data are never exposed to the client

#### 5.7.3 Membership Sync

- Group membership is re-synced from Baileys every 60 minutes per user session
- If a user is removed from a WhatsApp group, their access to that group's private events lapses at the next sync
- Sync status is stored in `user_group_memberships.last_verified_at`

#### 5.7.4 Security Constraints

- Visibility filtering is enforced exclusively server-side in the SQL query — never in frontend logic
- Group names and group IDs are internal-only; the API never returns them to the client
- A user cannot enumerate which groups exist or which groups other users belong to

### 5.8 Google Calendar Integration

#### 5.8.1 Architecture Decision — DB as Source of Truth

Events are stored in the PostgreSQL database (Supabase), not in Google Calendar. Google Calendar plays two supporting roles only:

| Role | Description |
|---|---|
| Personal "Add to Calendar" | User taps button → opens GCal pre-filled form → saves to their own calendar |
| Public calendar subscription (future) | Read-only GCal calendar of approved public events that users can subscribe to |

Google Calendar is never the primary store. This preserves the privacy model, confidence scoring, WhatsApp source metadata, and server-side visibility filtering — none of which GCal supports.

#### 5.8.2 "Add to Calendar" Button — v1

Implementation: Google Calendar URL scheme, no API key required.

```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text=EVENT_NAME
  &dates=START_UTC/END_UTC
  &details=DESCRIPTION
  &location=VENUE, Jerusalem
```

- `dates` must be in UTC format: `20260507T190000Z/20260507T230000Z`
- Works on all platforms — opens in browser, user already logged into Google
- Zero backend infrastructure required
- Available to all users (free tier)

#### 5.8.3 Public Calendar Subscription — v2 (Future)

A read-only Google Calendar containing all `visibility = 'public'` events, updated automatically when new public events are approved. Users can subscribe via a single "Subscribe" link. This is a distribution channel only — events are still mastered in the DB.

#### 5.8.4 Silent Sync — Premium (Future)

Via Google Calendar API with OAuth: silently add events to user's calendar without leaving the app. Batch-save all "Interested" events. Auto-sync when event details change. Premium organizer feature only.

---

## 6. Technical Architecture

### 6.1 Stack Overview

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (TypeScript) | Mobile-first web app, Tailwind CSS, Mapbox GL JS |
| Backend API | Python (FastAPI) | REST API, event CRUD, user management |
| Database | Supabase (PostgreSQL) | Events, users, organizer accounts, PostGIS for geo queries |
| Auth | Supabase Auth | Google OAuth, email/password |
| WhatsApp Service | Node.js + Baileys | Separate microservice, forwards messages to API |
| LLM Extraction | Claude API (Anthropic) | claude-sonnet-4-20250514, structured JSON output |
| Maps | Mapbox GL JS | Tile rendering, custom pins, clustering |
| Payments | Stripe | Organizer subscriptions, one-time featured placements |
| Hosting | Railway or Render | Backend + WhatsApp service; Vercel for frontend |
| Storage | Supabase Storage | Event images, flyers |

### 6.2 Data Model — Core Tables

| Table | Key Columns |
|---|---|
| events | id, name, date, start_time, end_time, venue, address, coordinates (PostGIS Point), category, description, image_url, source, source_group_id, **visibility** (private/registered/public), status, confidence_score, organizer_id, created_at |
| users | id, email, phone_number, display_name, avatar_url, role (user/organizer/admin), created_at |
| **user_group_memberships** | **user_id, group_id, last_verified_at** |
| whatsapp_groups | id, baileys_group_id, display_name (internal only), created_at |
| organizers | id, user_id, stripe_customer_id, subscription_status, plan, created_at |
| whatsapp_messages | id, group_id, message_text, image_url, raw_payload, processed_at, event_id (nullable) |

---

## 7. Build Phases & Milestones

### Phase 1 — Foundation (Weeks 1–3)

- Database schema + Supabase setup
- Basic FastAPI backend with event CRUD
- Frontend scaffold: map view with hardcoded sample events
- Timeline component with range selector
- Map + timeline synchronization (select event → highlight both)

### Phase 2 — Data Pipeline (Weeks 4–6)

- WhatsApp microservice (Baileys) — connect and listen to first group
- Claude extraction pipeline — text and image messages
- Admin review dashboard — approve / reject / edit extracted events
- Manual event submission form

### Phase 3 — Auth & Accounts (Weeks 7–8)

- Google Sign-In via Supabase Auth
- User profiles — saved events, submission history
- Organizer account creation flow

### Phase 4 — Monetization (Weeks 9–10)

- Stripe integration — organizer subscription checkout
- Featured pin styling on map
- Organizer analytics dashboard

### Phase 5 — Polish & Launch (Weeks 11–12)

- Hebrew RTL support throughout UI
- Push notifications (event starting soon)
- Performance optimization — map clustering, lazy loading
- Beta launch with 5 WhatsApp groups onboarded

---

## 8. Out of Scope — v1

- Native iOS / Android app (PWA first)
- Multi-city support (Jerusalem only at launch)
- Ticket purchasing / e-commerce
- Social features (friends, following, comments)
- Scrapers for Instagram, Facebook, Eventbrite
- Arabic language UI

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| WhatsApp ToS violation | High | Baileys violates Meta ToS. Mitigate by keeping usage small-scale and manual. Explore WhatsApp Business API as long-term alternative. |
| LLM extraction errors | Medium | Low-confidence extractions require human review. Build admin queue from day one. |
| Group admin approval | Medium | Dependency on 5 specific group admins. Begin outreach early; have fallback manual entry pipeline ready. |
| Hebrew NLP edge cases | Medium | Test extraction prompt extensively with real Hebrew messages before launch. |
| Low organizer adoption | Low-Medium | Free tier must be excellent to drive consumer growth that makes organizer tier attractive. |
| Membership sync delay | Low-Medium | 60-minute re-sync window means a removed member retains access briefly. Acceptable for v1; reduce interval if abuse is detected. |
| Phone number spoofing | Low | OTP verification at signup mitigates this. Monitor for anomalous access patterns. |

---

## 10. Open Questions

- Should the WhatsApp bot reply to groups to confirm event capture, or stay silent?
- What is the moderation policy for politically sensitive events in Jerusalem?
- At what confidence score threshold should events auto-publish vs. require review?
- How do we handle recurring events (weekly markets, regular club nights)?
- Should organizer analytics be real-time or daily digest?
- What automation rules should trigger promotion from `private` to `public`? (e.g. X reactions in the group, admin approval, organizer flag)
- Should users be notified when a private event they can see gets promoted to public?

---

*Jerusalem.live PRD v1.2 — Confidential*
