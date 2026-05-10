// Jerusalem.live — Task D complete
// Timeline: horizontal timeline with lanes, range handles, and NOW line

import { useMemo } from "react";
import { PillLane } from "./PillLane";
import { TimeRangeHandle } from "./TimeRangeHandle";
import type {
  Category,
  Event,
  EventHandlers,
  LaneAssignment,
  LayoutMode,
  TimeRange,
} from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_START = 6;
const DAY_END = 30;
const NOW_HOUR = 21; // In production, derive from new Date().getHours()
const TICK_H = 24; // Height reserved for hour tick marks

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimelineProps {
  /** Events to render (already filtered to map bounds + active category filters) */
  events: Event[];
  /** Lane assignment from assignLanes() */
  lanes: LaneAssignment;
  /** Active time range */
  range: TimeRange;
  /** Currently selected event id */
  selectedId: number | string | null;
  /** Currently hovered event id */
  hoveredId: number | string | null;
  /** Category definitions */
  categories: Record<string, Category>;
  /** Current layout mode (affects pill size + whether timeline is shown at all) */
  layout: LayoutMode;
  /** Ref to attach to the scrollable timeline inner container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Pointer move handler for drag (timeline container) */
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer up handler */
  onPointerUp: () => void;
  /** Factory for handle pointer-down handlers */
  getHandlePointerDown: (
    handle: "start" | "end",
  ) => (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Hour → percentage converter */
  hourToPercent: (h: number) => number;
  /** Normalised start hour for an event */
  normStart: (ev: Event) => number;
  /** Normalised end hour for an event */
  normEnd: (ev: Event) => number;
  /** Returns true if the event falls inside the active time range */
  isActive: (ev: Event) => boolean;
  /** Interaction handlers factory */
  makeEventHandlers: (ev: Event) => EventHandlers;
}

// ── Hour label helper ─────────────────────────────────────────────────────────

function hourLabel(h: number): string {
  const r = ((h % 24) + 24) % 24;
  return r === 0 ? "00:00" : r < 10 ? `0${r}:00` : `${r}:00`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Timeline
 *
 * Full horizontal timeline panel. Renders:
 * - N lane rows of event pills (one per assignLanes() lane)
 * - A vertical "NOW" line with a dot cap
 * - Two draggable range handles (start + end)
 * - Hour tick marks below the pill area
 * - A subtle active-range background highlight
 *
 * Design decisions:
 * - In "both" layout the timeline is a fixed-height strip (laneCount * LANE_H + ticks).
 *   In "timeline" layout it fills remaining vertical space and becomes scrollable.
 * - The NOW line is the same #4285F4 blue as the user location dot on the map —
 *   a deliberate visual link between "where you are" (map) and "when it is" (timeline).
 * - Hour ticks at 3-hour intervals (06, 09, 12, 15, 18, 21, 00, 03, 06) cover
 *   the full 24h of the Jerusalem night scene (DAY_START=6, DAY_END=30).
 * - Active range ticks are rendered at higher opacity to reinforce the selection.
 *
 * @example
 * <Timeline
 *   events={tlEvents}
 *   lanes={lanes}
 *   range={range}
 *   selectedId={selectedEvent?.id ?? null}
 *   hoveredId={hoveredId}
 *   categories={CATEGORIES}
 *   layout={layout}
 *   containerRef={tlContainerRef}
 *   onPointerMove={onPointerMove}
 *   onPointerUp={onPointerUp}
 *   getHandlePointerDown={getHandlePointerDown}
 *   hourToPercent={hourToPercent}
 *   normStart={normStart}
 *   normEnd={normEnd}
 *   isActive={isActive}
 *   makeEventHandlers={makeEventHandlers}
 * />
 */
export function Timeline({
  events,
  lanes,
  range,
  selectedId,
  hoveredId,
  categories,
  layout,
  containerRef,
  onPointerMove,
  onPointerUp,
  getHandlePointerDown,
  hourToPercent,
  normStart,
  normEnd,
  isActive,
  makeEventHandlers,
}: TimelineProps) {
  const showMap = layout === "map" || layout === "both";
  const isExpanded = layout === "timeline";

  const PILL_H = isExpanded ? 30 : 14;
  const PILL_GAP = isExpanded ? 6 : 3;
  const LANE_H = PILL_H + PILL_GAP;
  const { laneMap, laneCount } = lanes;

  const laneAreaHeight = laneCount * LANE_H;
  const totalHeight = laneAreaHeight + TICK_H;

  // Build per-event active map to avoid calling isActive() inside each pill
  const activeMap = useMemo(
    () =>
      Object.fromEntries(events.map((ev) => [ev.id, isActive(ev)])),
    [events, isActive],
  );

  // Group events by lane
  const eventsByLane = useMemo(() => {
    const byLane: Record<number, Event[]> = {};
    for (const ev of events) {
      const lane = laneMap[ev.id] ?? 0;
      if (!byLane[lane]) byLane[lane] = [];
      byLane[lane].push(ev);
    }
    return byLane;
  }, [events, laneMap]);

  return (
    <div
      style={{
        ...(showMap
          ? {
              flexShrink: 0,
              height: totalHeight + 26 + 6 + 20, // pills + ticks + label + padding + home bar
            }
          : { flex: 1, minHeight: 0 }),
        background: "#1a1c2e",
        borderTop: showMap ? "1px solid rgba(255,255,255,0.05)" : "none",
        display: "flex",
        flexDirection: "column",
        paddingTop: 4,
      }}
    >
      {/* Scrollable pill + tick area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: showMap ? "hidden" : "auto",
        }}
      >
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "relative",
            height: showMap ? totalHeight : undefined,
            minHeight: totalHeight,
            margin: "0 14px",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          {/* Active range background highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              height: laneAreaHeight,
              left: `${hourToPercent(range.start)}%`,
              width: `${hourToPercent(range.end) - hourToPercent(range.start)}%`,
              background: "rgba(255,255,255,0.035)",
              borderRadius: 4,
              pointerEvents: "none",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}
          />

          {/* Pill lanes */}
          {Array.from({ length: laneCount }).map((_, laneIndex) => (
            <PillLane
              key={laneIndex}
              events={eventsByLane[laneIndex] ?? []}
              laneIndex={laneIndex}
              pillHeight={PILL_H}
              laneGap={PILL_GAP}
              activeMap={activeMap}
              selectedId={selectedId}
              hoveredId={hoveredId}
              categories={categories}
              hourToPercent={hourToPercent}
              normStart={normStart}
              normEnd={normEnd}
              makeEventHandlers={makeEventHandlers}
              isExpanded={isExpanded}
            />
          ))}

          {/* NOW line */}
          <div
            style={{
              position: "absolute",
              left: `${hourToPercent(NOW_HOUR)}%`,
              top: 0,
              height: laneAreaHeight,
              width: 2,
              background: "#4285F4",
              boxShadow: "0 0 8px #4285F4",
              borderRadius: 1,
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            {/* NOW dot cap */}
            <div
              style={{
                position: "absolute",
                top: -3,
                left: "50%",
                transform: "translateX(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#4285F4",
                boxShadow: "0 0 8px #4285F4",
              }}
            />
          </div>

          {/* Range handles */}
          <TimeRangeHandle
            type="start"
            positionPct={hourToPercent(range.start)}
            laneAreaHeight={laneAreaHeight}
            onPointerDown={getHandlePointerDown("start")}
            timeLabel={hourLabel(range.start)}
          />
          <TimeRangeHandle
            type="end"
            positionPct={hourToPercent(range.end)}
            laneAreaHeight={laneAreaHeight}
            onPointerDown={getHandlePointerDown("end")}
            timeLabel={hourLabel(range.end)}
          />

          {/* Hour tick marks */}
          <div
            style={{
              position: "absolute",
              top: laneAreaHeight,
              left: 0,
              right: 0,
              height: TICK_H,
              pointerEvents: "none",
            }}
          >
            {[6, 9, 12, 15, 18, 21, 24, 27, 30].map((h) => {
              const inRange = h >= range.start && h <= range.end;
              return (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${hourToPercent(h)}%`,
                    top: 0,
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      width: 1,
                      height: 4,
                      background: inRange
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(255,255,255,0.12)",
                    }}
                  />
                  <span
                    style={{
                      color: inRange
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(255,255,255,0.18)",
                      fontSize: 8,
                      fontWeight: 500,
                      fontFamily: "'DM Mono', monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hourLabel(h)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Range label strip */}
      <div
        style={{
          flexShrink: 0,
          padding: "3px 16px 0",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {hourLabel(range.start)} → {hourLabel(range.end)}
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 9 }}>
          {events.filter(isActive).length} active · {events.length} in view
        </span>
      </div>

      {/* Home bar spacer */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "5px 0 4px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 100,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.14)",
          }}
        />
      </div>
    </div>
  );
}
