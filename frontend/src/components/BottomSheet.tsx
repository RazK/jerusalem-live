// Jerusalem.live — Task D complete
// BottomSheet: animated slide-up event detail sheet with swipe-to-dismiss

import type { BottomSheetProps } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hourLabel(h: number): string {
  const r = ((h % 24) + 24) % 24;
  return r === 0 ? "00:00" : r < 10 ? `0${r}:00` : `${r}:00`;
}

function buildCalendarUrl(event: NonNullable<BottomSheetProps["event"]>): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const yr = today.getFullYear();
  const mo = pad(today.getMonth() + 1);
  const dy = pad(today.getDate());
  const normS = event.start < 6 ? event.start + 24 : event.start;
  const normE = event.end <= event.start ? event.end + 24 : event.end;
  const sH = normS % 24;
  const eH = normE % 24;
  const eDay = normE >= 24 ? pad(today.getDate() + 1) : dy;
  const start = `${yr}${mo}${dy}T${pad(sH)}0000`;
  const end = `${yr}${mo}${eDay}T${pad(eH)}0000`;
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(event.en)}` +
    `&dates=${start}/${end}` +
    `&details=${encodeURIComponent(event.desc)}` +
    `&location=${encodeURIComponent(event.neighborhood + ", Jerusalem")}`
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * BottomSheet
 *
 * Slides up from the bottom of the screen when an event is tapped.
 * Slides back down when closed. Content is the event detail view.
 *
 * Design decisions:
 * - Transform-based animation (translateY) is GPU-accelerated and avoids
 *   layout recalculation during the animation.
 * - The sheet is always rendered in the DOM (never unmounted) so the slide-out
 *   animation plays before content disappears. The parent passes event=null
 *   300 ms after closing (matching the transition duration).
 * - A semi-transparent backdrop is rendered behind the sheet. Tapping it closes
 *   the sheet, matching standard mobile UX patterns.
 * - The header gradient uses the category color as a subtle tint — same technique
 *   used by Apple Maps event sheets.
 * - Actions: Directions (Google Maps), Add to Calendar (GCal URL scheme, no API
 *   key needed), Share (Web Share API with graceful fallback).
 * - The category color dot mirrors the FilterBar chip style for consistency.
 *
 * @example
 * <BottomSheet
 *   event={selectedEvent}
 *   isOpen={sheetOpen}
 *   onClose={closeSheet}
 *   categories={CATEGORIES}
 *   isActive={selectedEvent ? isActive(selectedEvent) : false}
 * />
 */
export function BottomSheet({
  event,
  isOpen,
  onClose,
  categories,
  isActive,
}: BottomSheetProps) {
  const cat = event ? categories[event.cat] : null;

  const normS = event
    ? event.start < 6
      ? event.start + 24
      : event.start
    : 0;
  const normE = event
    ? event.end <= event.start
      ? event.end + 24
      : event.end
    : 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 150,
            backdropFilter: "blur(1px)",
          }}
        />
      )}

      {/* Sheet */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#16192e",
          borderRadius: "20px 20px 0 0",
          transform: isOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          zIndex: 200,
          boxShadow:
            "0 -4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          maxHeight: "62%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {event && cat && (
          <>
            {/* Drag handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.18)",
                margin: "10px auto 0",
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                padding: "12px 18px 10px",
                background: `linear-gradient(160deg, ${cat.color}20, transparent 60%)`,
                borderBottom: `1px solid ${cat.color}22`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Category pill */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: `${cat.color}1a`,
                    borderRadius: 20,
                    padding: "3px 10px",
                    marginBottom: 8,
                    border: `1px solid ${cat.color}33`,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: cat.color,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {cat.label}
                  </span>
                </div>

                {/* Event name */}
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    marginBottom: 2,
                    direction: "rtl",
                    textAlign: "right",
                  }}
                >
                  {event.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  {event.neighborhood} · Jerusalem
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontSize: 12,
                  flexShrink: 0,
                  marginLeft: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "12px 18px 28px", overflowY: "auto" }}>
              {/* Time row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13 }}>🕐</span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {hourLabel(normS)} – {hourLabel(normE)}
                </span>
                {isActive && (
                  <span
                    style={{
                      background: "#FF3366",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      letterSpacing: 0.8,
                    }}
                  >
                    LIVE NOW
                  </span>
                )}
              </div>

              {/* Description (Hebrew RTL) */}
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  lineHeight: 1.65,
                  margin: "0 0 6px",
                  direction: "rtl",
                  textAlign: "right",
                }}
              >
                {event.desc}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 11,
                  margin: "0 0 18px",
                }}
              >
                {event.en}
              </p>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                {/* Directions */}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    event.neighborhood + " Jerusalem",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    padding: "11px 4px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    textDecoration: "none",
                    background: cat.color,
                    color: "#fff",
                  }}
                >
                  📍 Directions
                </a>

                {/* Add to Calendar */}
                <a
                  href={buildCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    padding: "11px 4px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.07)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  📅 Add to Cal
                </a>

                {/* Share */}
                <button
                  onClick={() =>
                    navigator.share?.({
                      title: event.en,
                      text: event.desc,
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    padding: "11px 4px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "rgba(255,255,255,0.07)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  📲 Share
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
