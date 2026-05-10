// Jerusalem.live — Task D complete
// useCrossHighlight: shared hover + selection state between map and timeline

import { useCallback, useRef, useState } from "react";
import type { Event, EventHandlers } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Duration (ms) a finger must be held before triggering a highlight on mobile */
const LONG_PRESS_MS = 400;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCrossHighlightReturn {
  /** ID of the currently hovered event, or null */
  hoveredId: number | string | null;
  /** Currently selected event, or null */
  selectedEvent: Event | null;
  /** Whether the bottom sheet is open */
  sheetOpen: boolean;
  /** Open the detail sheet for an event */
  selectEvent: (event: Event) => void;
  /** Close the detail sheet */
  closeSheet: () => void;
  /**
   * Returns the full set of interaction handlers for a given event.
   * Attach the returned object as props to both map pins and timeline pills.
   *
   * @example
   * <EventPin {...makeEventHandlers(event)} />
   * <PillLane {...makeEventHandlers(event)} />
   */
  makeEventHandlers: (event: Event) => EventHandlers;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useCrossHighlight
 *
 * Provides a single source of truth for hover + selection state that is shared
 * between the map pins and timeline pills, enabling cross-highlight behaviour:
 * hovering a pin highlights the corresponding pill and vice versa.
 *
 * Design decisions:
 * - Desktop hover uses onMouseEnter/onMouseLeave. We intentionally avoid using
 *   pointer events for hover because pointer capture (used for map pan) would
 *   interfere with hover detection.
 * - Mobile long-press is implemented via touch events. A quick tap still fires
 *   onClick and opens the sheet; a sustained press for 400 ms triggers hover
 *   (cross-highlight) without opening the sheet.
 * - lpFired ref tracks whether a long press fired, so the subsequent touchEnd
 *   does not also trigger a click/select.
 * - The sheet close uses a 300 ms timeout before nulling selectedEvent so the
 *   sheet slide-out animation completes before the content disappears.
 */
export function useCrossHighlight(): UseCrossHighlightReturn {
  const [hoveredId, setHoveredId] = useState<number | string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Long-press tracking refs (not state — no re-render needed)
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFired = useRef(false);
  const lpDownXY = useRef<{ x: number; y: number } | null>(null);

  const selectEvent = useCallback((event: Event) => {
    setSelectedEvent(event);
    setSheetOpen(true);
    setHoveredId(null);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    // Delay null so animation completes before content disappears
    setTimeout(() => setSelectedEvent(null), 300);
  }, []);

  const makeEventHandlers = useCallback(
    (event: Event): EventHandlers => ({
      // ── Desktop hover ──────────────────────────────────────────────────────
      onMouseEnter: () => setHoveredId(event.id),
      onMouseLeave: () => setHoveredId(null),

      // ── Mobile long-press ──────────────────────────────────────────────────
      onTouchStart: (e) => {
        lpFired.current = false;
        lpDownXY.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        lpTimer.current = setTimeout(() => {
          lpFired.current = true;
          setHoveredId(event.id);
        }, LONG_PRESS_MS);
      },

      onTouchMove: (e) => {
        // Cancel long press if the finger moves significantly (user is scrolling)
        const dx = Math.abs(e.touches[0].clientX - (lpDownXY.current?.x ?? 0));
        const dy = Math.abs(e.touches[0].clientY - (lpDownXY.current?.y ?? 0));
        if (dx > 8 || dy > 8) {
          if (lpTimer.current) clearTimeout(lpTimer.current);
          lpFired.current = false;
        }
      },

      onTouchEnd: () => {
        if (lpTimer.current) clearTimeout(lpTimer.current);
        if (lpFired.current) {
          // Long press ended — clear highlight, don't open sheet
          setHoveredId(null);
          lpFired.current = false;
        }
        // If NOT a long press, the onClick below fires naturally via the browser
      },

      // ── Click / quick tap ──────────────────────────────────────────────────
      onClick: () => {
        // Only open sheet if this wasn't the end of a long press
        if (!lpFired.current) {
          selectEvent(event);
        }
      },
    }),
    [selectEvent],
  );

  return {
    hoveredId,
    selectedEvent,
    sheetOpen,
    selectEvent,
    closeSheet,
    makeEventHandlers,
  };
}
