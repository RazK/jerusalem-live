// Jerusalem.live — Task D complete
// MapView: zoomable/pannable map with event pins, filter chips, and neighbourhood labels

import { EventPin } from "./EventPin";
import { FilterBar } from "./FilterBar";
import type {
  CategoryKey,
  CategoryMap,
  Event,
  EventHandlers,
  LayoutMode,
  MapBounds,
  MapOffset,
} from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

// Google Maps dark palette
const MAP_NAVY = "#1a1c2e";
const MAP_ROAD = "#2d3047";
const MAP_BLOCK = "#1e2035";
const MAP_WATER = "#172033";
const MAP_PARK = "#1a2a1e";

const USER_X = 50;
const USER_Y = 45;

const NEIGHBOURHOODS = [
  { name: "Mahane Yehuda", x: 35, y: 36 },
  { name: "Nachlaot", x: 30, y: 44 },
  { name: "Nahalat Shiva", x: 51, y: 35 },
  { name: "German Colony", x: 44, y: 55 },
  { name: "Musrara", x: 58, y: 26 },
  { name: "Talpiot", x: 60, y: 62 },
  { name: "Ein Karem", x: 20, y: 54 },
  { name: "Katamon", x: 42, y: 50 },
];

const STREET_PATHS = [
  "M10,30 Q35,27 55,32 Q70,36 88,29",
  "M8,45 Q30,42 52,44 Q70,46 90,41",
  "M10,58 Q33,55 56,57 Q74,59 88,54",
  "M28,15 Q31,35 34,52 Q36,65 37,82",
  "M47,12 Q49,30 50,48 Q51,62 52,80",
  "M64,18 Q63,36 61,52 Q60,65 62,80",
  "M20,37 Q40,35 62,39",
  "M23,52 Q42,50 64,53",
];

const CITY_BLOCKS = [
  "M30,20 L45,18 L47,30 L32,32 Z",
  "M50,22 L65,20 L66,32 L51,33 Z",
  "M20,35 L33,33 L34,45 L21,46 Z",
  "M48,36 L62,34 L63,47 L49,48 Z",
  "M33,48 L46,47 L47,58 L34,59 Z",
  "M52,50 L66,48 L67,60 L53,61 Z",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MapViewProps {
  /** All visible events (filtered by active categories) */
  events: Event[];
  /** Category definitions */
  categories: CategoryMap;
  /** Active category filters */
  activeFilters: Set<CategoryKey>;
  /** Toggle a category filter */
  onToggleFilter: (key: CategoryKey) => void;
  /** Currently selected event */
  selectedEvent: Event | null;
  /** Currently hovered event id */
  hoveredId: number | string | null;
  /** Current zoom scale */
  scale: number;
  /** Current pan offset */
  offset: MapOffset;
  /** Current map bounds */
  bounds: MapBounds;
  /** Change zoom by delta */
  onChangeScale: (delta: number) => void;
  /** Pointer down handler (pan) */
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer move handler (pan) */
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Pointer up handler */
  onPointerUp: () => void;
  /** Pointer cancel handler */
  onPointerCancel: () => void;
  /** Ref to the map container div */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Current layout mode */
  layout: LayoutMode;
  /** Change layout */
  onChangeLayout: (mode: LayoutMode) => void;
  /** Count of currently active events (for header display) */
  activeCount: number;
  /** Whether the timeline panel is visible (controls bottom gradient) */
  showTimeline: boolean;
  /** Factory for event interaction handlers */
  makeEventHandlers: (ev: Event) => EventHandlers;
  /** Normalised start hour */
  normStart: (ev: Event) => number;
  /** Normalised end hour */
  normEnd: (ev: Event) => number;
  /** Hour label formatter */
  formatHour: (h: number) => string;
  /** Returns true if the event is inside the active time range */
  isActive: (ev: Event) => boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * MapView
 *
 * Renders the full-screen interactive map with:
 * - SVG tile (Google Maps dark style: navy base, road lines, city blocks, water, parks)
 * - Neighbourhood labels
 * - User location dot (blue, pulsing)
 * - Event pins (sorted so later-starting events render on top)
 * - Floating filter chips at the bottom of the map
 * - Floating header (Jerusalem logo + layout toggle) at the top
 * - Zoom controls (top-right)
 * - Bottom gradient fade into timeline
 *
 * Design decisions:
 * - Pan/zoom state lives in the parent (via useMapInteraction) — MapView is a
 *   pure presentational component that receives all state as props.
 * - Pins are sorted by normStart descending so later events (which are typically
 *   the "tonight" events) render above earlier ones in z-order.
 * - The SVG map uses viewBox="0 0 100 100" so all coordinate math stays in
 *   the same percentage space as Event.x / Event.y. No unit conversions needed.
 *
 * @example
 * <MapView
 *   events={visibleEvents}
 *   categories={CATEGORIES}
 *   activeFilters={activeFilters}
 *   onToggleFilter={toggleFilter}
 *   selectedEvent={selectedEvent}
 *   hoveredId={hoveredId}
 *   scale={scale}
 *   offset={offset}
 *   bounds={bounds}
 *   onChangeScale={changeScale}
 *   onPointerDown={onPointerDown}
 *   onPointerMove={onPointerMove}
 *   onPointerUp={onPointerUp}
 *   onPointerCancel={onPointerCancel}
 *   containerRef={containerRef}
 *   layout={layout}
 *   onChangeLayout={setLayout}
 *   activeCount={activeCount}
 *   showTimeline={layout !== "map"}
 *   makeEventHandlers={makeEventHandlers}
 *   normStart={normStart}
 *   normEnd={normEnd}
 *   formatHour={hourLabel}
 *   isActive={isActive}
 * />
 */
export function MapView({
  events,
  categories,
  activeFilters,
  onToggleFilter,
  selectedEvent,
  hoveredId,
  scale,
  offset,
  bounds,
  onChangeScale,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  containerRef,
  layout,
  onChangeLayout,
  activeCount,
  showTimeline,
  makeEventHandlers,
  normStart,
  normEnd,
  formatHour,
  isActive,
}: MapViewProps) {
  const isInBounds = (ev: Event) =>
    ev.x >= bounds.minX &&
    ev.x <= bounds.maxX &&
    ev.y >= bounds.minY &&
    ev.y <= bounds.maxY;

  const sortedEvents = [...events].sort(
    (a, b) => normStart(b) - normStart(a),
  );

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      {/* Map container */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: MAP_NAVY,
          cursor: scale > 1 ? "grab" : "default",
          touchAction: "none",
          overflow: "hidden",
        }}
      >
        {/* Zoomable/pannable inner layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale}) translate(${offset.x}%, ${offset.y}%)`,
            transformOrigin: "center center",
          }}
        >
          {/* SVG map tile */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0 }}
          >
            <rect width="100" height="100" fill={MAP_NAVY} />

            {/* Water */}
            <ellipse cx="12" cy="72" rx="18" ry="14" fill={MAP_WATER} opacity="0.7" />

            {/* Parks */}
            <ellipse cx="24" cy="56" rx="9" ry="7" fill={MAP_PARK} opacity="0.8" />
            <ellipse cx="68" cy="34" rx="7" ry="5" fill={MAP_PARK} opacity="0.6" />
            <ellipse cx="45" cy="72" rx="6" ry="4" fill={MAP_PARK} opacity="0.6" />

            {/* City blocks */}
            {CITY_BLOCKS.map((d, i) => (
              <path key={i} d={d} fill={MAP_BLOCK} opacity="0.9" />
            ))}

            {/* Minor roads */}
            {STREET_PATHS.slice(6).map((d, i) => (
              <path
                key={`minor-${i}`}
                d={d}
                stroke="#232540"
                strokeWidth="0.6"
                fill="none"
                opacity="0.8"
              />
            ))}

            {/* Major roads */}
            {STREET_PATHS.slice(0, 6).map((d, i) => (
              <path
                key={`major-${i}`}
                d={d}
                stroke={MAP_ROAD}
                strokeWidth={i < 3 ? 1.6 : 1.1}
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {/* Road labels */}
            <text x="37" y="27" fill="rgba(255,255,255,0.22)" fontSize="2.2" fontFamily="DM Sans" textAnchor="middle">
              Jaffa Rd
            </text>
            <text x="49" y="43" fill="rgba(255,255,255,0.18)" fontSize="1.8" fontFamily="DM Sans" textAnchor="middle" transform="rotate(-8,49,43)">
              King George St
            </text>
          </svg>

          {/* Neighbourhood labels */}
          {NEIGHBOURHOODS.map((nb) => (
            <div
              key={nb.name}
              style={{
                position: "absolute",
                left: `${nb.x}%`,
                top: `${nb.y}%`,
                transform: "translate(-50%, -50%)",
                color: "rgba(255,255,255,0.28)",
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                userSelect: "none",
              }}
            >
              {nb.name}
            </div>
          ))}

          {/* User location dot */}
          <div
            style={{
              position: "absolute",
              left: `${USER_X}%`,
              top: `${USER_Y}%`,
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#4285F4",
              border: "2.5px solid #fff",
              boxShadow: "0 2px 8px rgba(66,133,244,0.6)",
              animation: "gmPulse 2.5s infinite",
              zIndex: 50,
            }}
          >
            {/* Accuracy ring */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(66,133,244,0.12)",
                border: "1px solid rgba(66,133,244,0.25)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Event pins */}
          {sortedEvents.map((ev) => (
            <EventPin
              key={ev.id}
              event={ev}
              category={categories[ev.cat]}
              state={{
                isActive: isActive(ev) && isInBounds(ev),
                isSelected: selectedEvent?.id === ev.id,
                isHovered: hoveredId === ev.id,
                isInBounds: isInBounds(ev),
              }}
              baseSize={30}
              handlers={makeEventHandlers(ev)}
              formatHour={formatHour}
              normStart={normStart(ev)}
              normEnd={normEnd(ev)}
            />
          ))}
        </div>

        {/* Floating filter chips */}
        <FilterBar
          categories={categories}
          activeFilters={activeFilters}
          onToggle={onToggleFilter}
          position="floating"
        />

        {/* Floating header */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 14px",
            zIndex: 35,
            pointerEvents: "none",
          }}
        >
          {/* Logo */}
          <div
            style={{
              background: "rgba(26,28,46,0.88)",
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              padding: "6px 12px",
              boxShadow:
                "0 2px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: -0.3,
                lineHeight: 1,
              }}
            >
              ירושלים{" "}
              <span style={{ color: "#FF3366", fontSize: 12 }}>•</span>
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                marginTop: 1,
                letterSpacing: 0.3,
              }}
            >
              {activeCount} events now
            </div>
          </div>

          {/* Layout toggle */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "rgba(26,28,46,0.88)",
              backdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: 3,
              boxShadow:
                "0 2px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
              pointerEvents: "auto",
            }}
          >
            {(
              [
                { k: "map" as LayoutMode, icon: "🗺️", title: "Map only" },
                { k: "both" as LayoutMode, icon: "⊟", title: "Map + Timeline" },
                { k: "timeline" as LayoutMode, icon: "⏱️", title: "Timeline only" },
              ] as const
            ).map(({ k, icon, title }) => (
              <button
                key={k}
                title={title}
                onClick={() => onChangeLayout(k)}
                style={{
                  width: 32,
                  height: 26,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  background:
                    layout === k ? "rgba(255,255,255,0.2)" : "transparent",
                  color:
                    layout === k ? "#fff" : "rgba(255,255,255,0.4)",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom controls */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 52,
            background: "rgba(26,28,46,0.92)",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            zIndex: 30,
          }}
        >
          {[
            { l: "+", fn: () => onChangeScale(0.5) },
            { l: "−", fn: () => onChangeScale(-0.5) },
          ].map(({ l, fn }, i) => (
            <button
              key={l}
              onClick={fn}
              style={{
                display: "block",
                width: 32,
                height: 32,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
                fontSize: 18,
                fontWeight: 300,
                borderBottom:
                  i === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Bottom fade gradient */}
        {showTimeline && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              background: `linear-gradient(to top, ${MAP_NAVY}, transparent)`,
              pointerEvents: "none",
              zIndex: 20,
            }}
          />
        )}

        <style>{`
          @keyframes gmPulse {
            0%, 100% {
              box-shadow: 0 2px 8px rgba(66,133,244,0.6), 0 0 0 0 rgba(66,133,244,0.3);
            }
            50% {
              box-shadow: 0 2px 8px rgba(66,133,244,0.6), 0 0 0 14px rgba(66,133,244,0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
