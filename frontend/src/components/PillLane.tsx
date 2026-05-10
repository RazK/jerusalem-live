// Jerusalem.live — Task D complete
// PillLane: renders one horizontal lane of event pills on the timeline

import type { Category, Event, EventHandlers } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PillLaneProps {
  /** The events assigned to this lane (pre-filtered, pre-assigned by assignLanes) */
  events: Event[];
  /** Lane index (0-based) used for vertical positioning */
  laneIndex: number;
  /** Height of a single pill in px */
  pillHeight: number;
  /** Vertical gap between lanes in px */
  laneGap: number;
  /** Map from event id → whether it falls inside the active time range */
  activeMap: Record<number | string, boolean>;
  /** The currently selected event id (or null) */
  selectedId: number | string | null;
  /** The currently hovered event id (or null) */
  hoveredId: number | string | null;
  /** Category definitions for color lookup */
  categories: Record<string, Category>;
  /** Convert hour to percentage along timeline axis */
  hourToPercent: (h: number) => number;
  /** Normalised start hour for a given event */
  normStart: (ev: Event) => number;
  /** Normalised end hour for a given event */
  normEnd: (ev: Event) => number;
  /** Interaction handlers factory from useCrossHighlight */
  makeEventHandlers: (ev: Event) => EventHandlers;
  /** Whether the timeline is in expanded (timeline-only) mode */
  isExpanded?: boolean;
  /** Total timeline container width in px — used to decide whether to show title */
  containerWidth?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * PillLane
 *
 * Renders a single horizontal lane of event pills on the timeline.
 * Each pill's width corresponds to the event's duration; its left position
 * corresponds to the event's start time, both on the [0, 100%] axis.
 *
 * Design decisions:
 * - Pills outside the active time range are rendered at low opacity and desaturated
 *   so the user can see the full day's schedule at a glance but focus on active events.
 * - The pill title is shown only in expanded mode AND when the pill is wide enough
 *   to display it without truncation — below ~55 px wide the text is hidden.
 * - Hover: pill scales up (scaleY 1.06) with a glow shadow matching category color.
 * - Selected: pill gets a white border glow.
 * - The lane background alternates between very-slight-white and transparent to
 *   provide a subtle lane separator without a visible divider line.
 *
 * @example
 * // Render all lanes:
 * Array.from({ length: laneCount }).map((_, laneIndex) => (
 *   <PillLane
 *     key={laneIndex}
 *     events={tlEvents.filter(ev => laneMap[ev.id] === laneIndex)}
 *     laneIndex={laneIndex}
 *     pillHeight={PILL_H}
 *     laneGap={PILL_GAP}
 *     activeMap={activeMap}
 *     selectedId={selectedEvent?.id ?? null}
 *     hoveredId={hoveredId}
 *     categories={CATEGORIES}
 *     hourToPercent={hourToPercent}
 *     normStart={normStart}
 *     normEnd={normEnd}
 *     makeEventHandlers={makeEventHandlers}
 *     isExpanded={layout === "timeline"}
 *   />
 * ))
 */
export function PillLane({
  events,
  laneIndex,
  pillHeight,
  laneGap,
  activeMap,
  selectedId,
  hoveredId,
  categories,
  hourToPercent,
  normStart,
  normEnd,
  makeEventHandlers,
  isExpanded = false,
  containerWidth = 340,
}: PillLaneProps) {
  const laneH = pillHeight + laneGap;
  const top = laneIndex * laneH;

  return (
    <>
      {/* Lane background stripe (alternating) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top,
          height: pillHeight,
          background:
            laneIndex % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />

      {/* Pills */}
      {events.map((ev) => {
        const s = normStart(ev);
        const e = normEnd(ev);
        const leftPct = Math.max(0, hourToPercent(s));
        const widthPct = Math.max(1.5, hourToPercent(e) - hourToPercent(s));
        const isActive = activeMap[ev.id] ?? false;
        const isSelected = selectedId === ev.id;
        const isHovered = hoveredId === ev.id;
        const cat = categories[ev.cat] ?? { color: "#888", icon: "📌", label: "" };

        const pillOpacity = isSelected || isHovered ? 1 : isActive ? 0.9 : 0.2;
        const pillGlow = isSelected
          ? `0 0 0 1.5px white, 0 0 12px ${cat.color}`
          : isHovered
            ? `0 0 0 1.5px ${cat.color}, 0 0 10px ${cat.color}88`
            : "none";

        // Show label only in expanded mode when pill is wide enough
        const pillWidthPx = (widthPct / 100) * containerWidth;
        const showTitle = isExpanded && pillHeight >= 22 && pillWidthPx > 55;

        const handlers = makeEventHandlers(ev);

        return (
          <div
            key={ev.id}
            {...handlers}
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top,
              height: pillHeight,
              borderRadius: isExpanded ? 7 : 3,
              background: isActive || isHovered ? cat.color : "rgba(255,255,255,0.09)",
              opacity: pillOpacity,
              cursor: "pointer",
              transition:
                "opacity 0.15s, box-shadow 0.15s, transform 0.12s",
              transform: isHovered ? "scaleY(1.06)" : "scaleY(1)",
              boxShadow: pillGlow,
              display: "flex",
              alignItems: "center",
              paddingLeft: showTitle ? 7 : 3,
              overflow: "hidden",
              gap: 4,
              filter: isActive || isHovered ? "none" : "grayscale(0.6)",
            }}
          >
            {/* Category icon */}
            <span
              style={{
                fontSize: isExpanded ? 12 : 7,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {cat.icon}
            </span>
            {/* Event title (expanded mode only) */}
            {showTitle && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.95)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {ev.name}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
