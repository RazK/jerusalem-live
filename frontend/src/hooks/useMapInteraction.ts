// Jerusalem.live — Task D complete
// useMapInteraction: pan + zoom logic for the map container

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapBounds, MapOffset } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DragState {
  /** Pointer start X in client px */
  sx: number;
  /** Pointer start Y in client px */
  sy: number;
  /** Map offset at drag start */
  so: MapOffset;
  /** Whether the pointer has moved beyond the click-detection threshold */
  moved: boolean;
}

export interface UseMapInteractionReturn {
  /** Current zoom scale. 1 = no zoom. */
  scale: number;
  /** Current pan offset as percentage of container dimensions */
  offset: MapOffset;
  /** Current map bounds derived from scale + offset */
  bounds: MapBounds;
  /** Call to change zoom by a delta value. Positive = zoom in. */
  changeScale: (delta: number) => void;
  /** Pointer down handler — attach to the map container */
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer move handler — attach to the map container */
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer up handler — attach to the map container */
  onPointerUp: () => void;
  /** Pointer cancel handler — attach to the map container */
  onPointerCancel: () => void;
  /** Ref to attach to the map container div (for wheel + bounds calculation) */
  containerRef: React.RefObject<HTMLDivElement>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useMapInteraction
 *
 * Manages pan and zoom state for the Jerusalem.live map container.
 *
 * Design decisions:
 * - Uses pointer events (not mouse/touch) for unified desktop + mobile handling.
 * - Clamps offset so the map never pans beyond its boundaries at the current scale.
 * - Wheel events are attached imperatively (passive:false) to allow preventDefault,
 *   which stops the browser scrolling the page while zooming the map.
 * - Scale and offset are kept in separate state to enable independent updates.
 *
 * @param initialScale - Starting zoom level (default: 1)
 * @param initialOffset - Starting pan offset (default: {x:0, y:0})
 */
export function useMapInteraction(
  initialScale = 1,
  initialOffset: MapOffset = { x: 0, y: 0 },
): UseMapInteractionReturn {
  const [scale, setScale] = useState(initialScale);
  const [offset, setOffset] = useState<MapOffset>(initialOffset);
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Clamp the pan offset so the map stays within bounds at the current scale.
   * At scale=1 there is no room to pan; at scale=4 the map can move ±150%.
   */
  const clampOffset = useCallback(
    (ox: number, oy: number, sc: number): MapOffset => {
      const maxPan = (sc - 1) * 50;
      return {
        x: Math.max(-maxPan, Math.min(maxPan, ox)),
        y: Math.max(-maxPan, Math.min(maxPan, oy)),
      };
    },
    [],
  );

  /**
   * Compute map bounds from scale + offset.
   * Bounds are in the same coordinate system as Event.x / Event.y (0–100 percentage).
   */
  const computeBounds = useCallback(
    (sc: number, off: MapOffset): MapBounds => {
      const halfW = 50 / sc;
      const halfH = 50 / sc;
      const cx = 50 - off.x / sc;
      const cy = 50 - off.y / sc;
      return {
        minX: cx - halfW,
        maxX: cx + halfW,
        minY: cy - halfH,
        maxY: cy + halfH,
      };
    },
    [],
  );

  const [bounds, setBounds] = useState<MapBounds>(() =>
    computeBounds(initialScale, initialOffset),
  );

  // Keep bounds in sync with scale/offset
  useEffect(() => {
    setBounds(computeBounds(scale, offset));
  }, [scale, offset, computeBounds]);

  /** Change zoom by delta, clamped to [MIN_SCALE, MAX_SCALE]. */
  const changeScale = useCallback(
    (delta: number) => {
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta));
        // Re-clamp offset at new scale
        setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, next));
        return next;
      });
    },
    [clampOffset],
  );

  // Wheel → zoom (attached imperatively so we can call preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      changeScale(-e.deltaY * 0.005);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [changeScale]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        so: { ...offset },
        moved: false,
      };
    },
    [offset],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current || !containerRef.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }
      const { width, height } = containerRef.current.getBoundingClientRect();
      setOffset(
        clampOffset(
          dragRef.current.so.x + (dx / width) * 100,
          dragRef.current.so.y + (dy / height) * 100,
          scale,
        ),
      );
    },
    [scale, clampOffset],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    scale,
    offset,
    bounds,
    changeScale,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    containerRef,
  };
}
