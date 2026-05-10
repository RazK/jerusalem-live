// Jerusalem.live — Task D complete
// TimeRangeHandle: draggable range handle for the timeline

import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeRangeHandleProps {
  /** "start" or "end" — determines which side of the range this controls */
  type: "start" | "end";
  /** Position as a percentage [0, 100] along the timeline */
  positionPct: number;
  /** Full height of the timeline lane area in px — handle spans this height */
  laneAreaHeight: number;
  /** Called when the user starts dragging this handle */
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Human-readable label shown near the handle, e.g. "21:00" */
  timeLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * TimeRangeHandle
 *
 * Renders a single draggable handle on the timeline that the user can drag
 * to adjust the start or end of the active time window.
 *
 * Design decisions:
 * - The hit area is wider (48 px) than the visual handle (3 px line + 18 px knob)
 *   to make it easy to grab on touch devices.
 * - The knob is a white circle, matching the Google Maps location handle style.
 * - Pointer capture is set on pointer down so the drag continues even if the
 *   pointer leaves the element (handled by parent via onPointerMove).
 * - The time label floats above the knob and fades in on hover via CSS.
 *
 * @example
 * <TimeRangeHandle
 *   type="start"
 *   positionPct={hourToPercent(rangeStart)}
 *   laneAreaHeight={laneCount * LANE_H}
 *   onPointerDown={getHandlePointerDown("start")}
 *   timeLabel="21:00"
 * />
 */
export function TimeRangeHandle({
  type,
  positionPct,
  laneAreaHeight,
  onPointerDown,
  timeLabel,
}: TimeRangeHandleProps) {
  const containerStyle: CSSProperties = {
    position: "absolute",
    // Centre the handle visually on positionPct
    left: `${positionPct}%`,
    top: 0,
    height: laneAreaHeight,
    // Wide invisible hit area for touch
    width: 48,
    transform: "translateX(-50%)",
    cursor: "ew-resize",
    zIndex: 25,
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    userSelect: "none",
    touchAction: "none",
  };

  const lineStyle: CSSProperties = {
    width: 3,
    background: "rgba(255,255,255,0.5)",
    borderRadius: 2,
    position: "relative",
    flexShrink: 0,
  };

  const knobStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    border: "2px solid rgba(0,0,0,0.1)",
  };

  const labelStyle: CSSProperties = {
    position: "absolute",
    // Label floats above the handle line
    top: -20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(15,15,30,0.9)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 4,
    padding: "2px 6px",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle} onPointerDown={onPointerDown}>
      <div style={lineStyle}>
        {/* Knob */}
        <div style={knobStyle} />
        {/* Time label */}
        {timeLabel && <div style={labelStyle}>{timeLabel}</div>}
      </div>
    </div>
  );
}
