// Jerusalem.live — Task D complete
// EventPin: Google Maps-style teardrop pin with hover/select states

import type { CSSProperties } from "react";
import type { Category, Event, EventHandlers, PinState } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventPinProps {
  event: Event;
  category: Category;
  state: PinState;
  /** Base pin size in px (before scale transform). Default: 30 */
  baseSize?: number;
  /** Interaction handlers from useCrossHighlight */
  handlers: EventHandlers;
  /** Hour label formatter, e.g. (h) => "21:00" */
  formatHour: (h: number) => string;
  /** Normalised start hour for tooltip display */
  normStart: number;
  /** Normalised end hour for tooltip display */
  normEnd: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TearDropSVGProps {
  category: Category;
  isSelected: boolean;
  isHovered: boolean;
  isActive: boolean;
  size: number;
}

/**
 * TearDropSVG
 *
 * Renders a Google Maps-style teardrop pin as an inline SVG.
 *
 * Design decisions:
 * - SVG teardrop via a cubic bezier path — matches Google Maps proportions closely.
 * - White circle inside the pin mirrors Google Maps' icon container.
 * - When selected: pin body turns white, inner circle takes the category color.
 *   This is the Google Maps "active" state.
 * - Drop shadow via SVG filter for performance (avoids CSS box-shadow on non-rect).
 * - Icon is rendered as a text element; emoji render consistently across platforms.
 */
function TearDropSVG({
  category,
  isSelected,
  isHovered,
  isActive,
  size,
}: TearDropSVGProps) {
  const { color, icon } = category;

  // Determine visual scale multiplier
  const scale = isSelected ? 1.4 : isHovered ? 1.2 : isActive ? 1 : 0.75;
  const w = size * scale;
  const h = w * 1.35; // teardrop aspect ratio

  const shadowColor = isSelected
    ? `${color}cc`
    : isHovered
      ? `${color}99`
      : isActive
        ? `${color}55`
        : "rgba(0,0,0,0.4)";

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 36 49"
      style={{
        display: "block",
        filter: `drop-shadow(0 ${isSelected ? 3 : 2}px ${isSelected ? 10 : 5}px ${shadowColor})`,
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Ground shadow ellipse */}
      <ellipse cx="18" cy="47" rx="7" ry="2.5" fill="rgba(0,0,0,0.3)" />

      {/* Pin body */}
      <path
        d="M18 2 C9.16 2 2 9.16 2 18 C2 28 18 44 18 44 C18 44 34 28 34 18 C34 9.16 26.84 2 18 2 Z"
        fill={isSelected ? "#ffffff" : color}
        stroke={isSelected ? color : "rgba(255,255,255,0.2)"}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Inner circle */}
      <circle
        cx="18"
        cy="18"
        r="11"
        fill={isSelected ? color : "rgba(255,255,255,0.95)"}
      />

      {/* Category icon */}
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontSize="13"
        fontFamily="Apple Color Emoji, Segoe UI Emoji, sans-serif"
      >
        {icon}
      </text>
    </svg>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface PinTooltipProps {
  event: Event;
  category: Category;
  formatHour: (h: number) => string;
  normStart: number;
  normEnd: number;
}

/** Google Maps-style white callout tooltip above the pin */
function PinTooltip({
  event,
  category,
  formatHour,
  normStart,
  normEnd,
}: PinTooltipProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        borderRadius: 6,
        padding: "6px 10px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
        zIndex: 100,
        minWidth: 120,
      }}
    >
      <div
        style={{
          color: "#202124",
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        {event.en}
      </div>
      <div style={{ color: "#5f6368", fontSize: 10 }}>
        {event.neighborhood} · {formatHour(normStart)}–{formatHour(normEnd)}
      </div>
      {/* Tooltip caret */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid #ffffff",
        }}
      />
    </div>
  );
}

// ── EventPin ──────────────────────────────────────────────────────────────────

/**
 * EventPin
 *
 * Renders a single event marker on the map in Google Maps teardrop style.
 *
 * Positioning is handled by the parent (MapView), which sets absolute left/top
 * from event.x / event.y percentages. This component handles only the visual
 * rendering and interaction delegation.
 *
 * @example
 * <EventPin
 *   event={event}
 *   category={CATEGORIES[event.cat]}
 *   state={{ isActive, isSelected, isHovered, isInBounds }}
 *   handlers={makeEventHandlers(event)}
 *   baseSize={30}
 *   formatHour={hourLabel}
 *   normStart={normStart(event)}
 *   normEnd={normEnd(event)}
 * />
 */
export function EventPin({
  event,
  category,
  state,
  baseSize = 30,
  handlers,
  formatHour,
  normStart,
  normEnd,
}: EventPinProps) {
  const { isActive, isSelected, isHovered, isInBounds } = state;
  const showTooltip = isHovered && !isSelected;

  const opacity =
    isSelected || isHovered ? 1 : isActive && isInBounds ? 1 : 0.18;

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: `${event.x}%`,
    top: `${event.y}%`,
    // Anchor the pin tip to the event coordinates
    transform: "translate(-50%, -100%)",
    zIndex: isSelected ? 999 : isHovered ? 998 : 100 - normStart + 6,
    cursor: "pointer",
    opacity,
    transition: "opacity 0.2s",
    userSelect: "none",
  };

  return (
    <div style={containerStyle} {...handlers}>
      <TearDropSVG
        category={category}
        isSelected={isSelected}
        isHovered={isHovered}
        isActive={isActive && isInBounds}
        size={baseSize}
      />
      {showTooltip && (
        <PinTooltip
          event={event}
          category={category}
          formatHour={formatHour}
          normStart={normStart}
          normEnd={normEnd}
        />
      )}
    </div>
  );
}
