// Jerusalem.live — Task D complete
// Central TypeScript type definitions for all components and hooks

// ── Category ─────────────────────────────────────────────────────────────────

export type CategoryKey = "party" | "music" | "market" | "outdoor" | "culture";

export interface Category {
  /** Display label, e.g. "Live Music" */
  label: string;
  /** Hex color string, e.g. "#FF9500" */
  color: string;
  /** Emoji icon */
  icon: string;
}

export type CategoryMap = Record<CategoryKey, Category>;

// ── Event ────────────────────────────────────────────────────────────────────

export interface Event {
  /** Unique event ID */
  id: number | string;
  /** Hebrew event name */
  name: string;
  /** English event name */
  en: string;
  /** Category key */
  cat: CategoryKey;
  /**
   * Start hour on the day axis. Hours ≥ 24 represent next-day times
   * (e.g. 25 = 01:00 the following day). Range: [0, 30].
   */
  start: number;
  /**
   * End hour on the day axis. May be > 24 for late-night events.
   * Guaranteed: end > start after normalisation.
   */
  end: number;
  /**
   * Map x-position as a percentage of the map container width. [0, 100]
   */
  x: number;
  /**
   * Map y-position as a percentage of the map container height. [0, 100]
   */
  y: number;
  /** Jerusalem neighbourhood name */
  neighborhood: string;
  /** Short description (Hebrew or English) */
  desc: string;
  /** Optional photo URL */
  imageUrl?: string;
  /** Optional ticket or info URL */
  ticketUrl?: string;
  /** Confidence score from LLM extraction, [0, 1] */
  confidenceScore?: number;
  /** Visibility level (server-enforced) */
  visibility?: "private" | "registered" | "public";
}

// ── Map ──────────────────────────────────────────────────────────────────────

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapOffset {
  x: number;
  y: number;
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** Three-state layout mode for the map/timeline split */
export type LayoutMode = "map" | "both" | "timeline";

// ── Timeline ─────────────────────────────────────────────────────────────────

export interface LaneAssignment {
  /** Map from event id → lane index */
  laneMap: Record<number | string, number>;
  /** Total number of lanes required */
  laneCount: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

// ── Cross-highlight ───────────────────────────────────────────────────────────

export interface HighlightState {
  /** ID of the currently hovered event, or null */
  hoveredId: number | string | null;
  /** ID of the currently selected event, or null */
  selectedId: number | string | null;
}

// ── Bottom sheet ─────────────────────────────────────────────────────────────

export interface BottomSheetProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  /** Category map for resolving colors/icons */
  categories: CategoryMap;
  /** Whether the event falls inside the current time range */
  isActive: boolean;
}

// ── Pin ──────────────────────────────────────────────────────────────────────

export interface PinState {
  isActive: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isInBounds: boolean;
}

// ── Filter bar ───────────────────────────────────────────────────────────────

export interface FilterBarProps {
  categories: CategoryMap;
  activeFilters: Set<CategoryKey>;
  onToggle: (key: CategoryKey) => void;
  /** Position: "floating" renders pills on top of map; "bar" renders above map */
  position?: "floating" | "bar";
}

// ── Interaction event handlers ────────────────────────────────────────────────

export interface EventHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onClick: () => void;
}

// ── Geocoding ────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

// ── Neighbourhood ────────────────────────────────────────────────────────────

export interface Neighbourhood {
  name: string;
  /** x-position percentage on the map SVG */
  x: number;
  /** y-position percentage on the map SVG */
  y: number;
}
