// Jerusalem.live — Task D complete
// useTimelineInteraction: drag handles + time range logic for the horizontal timeline

import { useCallback, useRef, useState } from "react";
import type { TimeRange } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** The full day axis spans from DAY_START to DAY_END (hours). */
const DAY_START = 6;
const DAY_END = 30; // 30 = 06:00 next day, allowing late-night events

// ── Types ─────────────────────────────────────────────────────────────────────

type DragHandle = "start" | "end" | null;

export interface UseTimelineInteractionReturn {
  /** Current time range (hours on the day axis) */
  range: TimeRange;
  /** Set a new range programmatically */
  setRange: (range: TimeRange) => void;
  /** Ref to attach to the scrollable timeline container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Pointer move handler — attach to the timeline container */
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer up / cancel handler — attach to the timeline container */
  onPointerUp: () => void;
  /**
   * Returns pointer down handler for a specific handle.
   * Attach to each range handle element.
   *
   * @example
   * <div onPointerDown={getHandlePointerDown("start")} />
   */
  getHandlePointerDown: (
    handle: "start" | "end",
  ) => (e: React.PointerEvent<HTMLDivElement>) => void;
  /**
   * Convert an hour value to a percentage position along the timeline axis.
   * Use this for positioning pins, pills, the NOW line, and handles.
   */
  hourToPercent: (hour: number) => number;
  /**
   * Convert a percentage position to an hour value.
   * Use this when translating a pointer position into a time.
   */
  percentToHour: (pct: number) => number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useTimelineInteraction
 *
 * Manages the draggable time range handles and range state for the timeline.
 *
 * Design decisions:
 * - The drag state is stored in a ref (not state) to avoid re-renders during
 *   pointer move, which would cause jank at high pointer rates.
 * - Range values are snapped to the nearest whole hour to keep the UI clean.
 * - The start handle cannot be dragged past end-1, and vice versa, ensuring
 *   the range always has at least 1 hour of width.
 * - percentToHour and hourToPercent are stable functions (no deps) safe to use
 *   in useMemo / useCallback without adding to dependency arrays.
 *
 * @param initialRange - Starting range (default: 18:00–26:00)
 */
export function useTimelineInteraction(
  initialRange: TimeRange = { start: 18, end: 26 },
): UseTimelineInteractionReturn {
  const [range, setRange] = useState<TimeRange>(initialRange);
  const dragRef = useRef<DragHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Convert hour → percentage along the timeline axis. */
  const hourToPercent = useCallback(
    (hour: number): number =>
      ((hour - DAY_START) / (DAY_END - DAY_START)) * 100,
    [],
  );

  /** Convert percentage → hour, snapped to nearest integer. */
  const percentToHour = useCallback(
    (pct: number): number =>
      Math.round((pct / 100) * (DAY_END - DAY_START) + DAY_START),
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
      );
      const hour = percentToHour(pct);

      setRange((prev) => {
        if (dragRef.current === "start") {
          return { ...prev, start: Math.min(hour, prev.end - 1) };
        }
        return { ...prev, end: Math.max(hour, prev.start + 1) };
      });
    },
    [percentToHour],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const getHandlePointerDown = useCallback(
    (handle: "start" | "end") =>
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = handle;
      },
    [],
  );

  return {
    range,
    setRange,
    containerRef,
    onPointerMove,
    onPointerUp,
    getHandlePointerDown,
    hourToPercent,
    percentToHour,
  };
}
