// Jerusalem.live — Task D complete
// FilterBar: floating Google Maps-style category filter chips

import type { CategoryKey, FilterBarProps } from "../types";

/**
 * FilterBar
 *
 * Renders horizontal category filter chips. When position="floating" the chips
 * sit directly on the map surface (Google Maps "Restaurants / Gas / Groceries"
 * style). When position="bar" they render above the map in a dedicated strip.
 *
 * Design decisions:
 * - Active chips use a white background with a color-coded dot indicator,
 *   matching Google Maps' selected chip style.
 * - Inactive chips use a semi-transparent dark background for legibility on
 *   both light and dark map tiles.
 * - The chip list scrolls horizontally with hidden scrollbar to handle overflow
 *   on narrow screens without wrapping.
 * - The color dot (8 px circle) replaces an emoji icon for a cleaner, more
 *   Google Maps-aligned aesthetic.
 *
 * @example
 * <FilterBar
 *   categories={CATEGORIES}
 *   activeFilters={activeFilters}
 *   onToggle={toggleFilter}
 *   position="floating"
 * />
 */
export function FilterBar({
  categories,
  activeFilters,
  onToggle,
  position = "floating",
}: FilterBarProps) {
  const isFloating = position === "floating";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: isFloating ? "0 14px" : "6px 14px",
        overflowX: "auto",
        scrollbarWidth: "none",
        // Floating: chips sit at the bottom of the map, above the timeline
        ...(isFloating
          ? {
              position: "absolute",
              bottom: 14,
              left: 0,
              right: 0,
              zIndex: 40,
              pointerEvents: "auto",
            }
          : {
              flexShrink: 0,
              background: "rgba(26,28,46,0.95)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }),
      }}
    >
      {(Object.entries(categories) as [CategoryKey, (typeof categories)[CategoryKey]][]).map(
        ([key, cat]) => {
          const isActive = activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 13px 7px 9px",
                borderRadius: 20,
                border: "none",
                // Active: white pill; inactive: dark translucent pill
                background: isActive
                  ? "#ffffff"
                  : "rgba(26,28,46,0.92)",
                color: isActive ? "#202124" : "rgba(255,255,255,0.75)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: isActive
                  ? `0 2px 10px rgba(0,0,0,0.35), 0 0 0 2px ${cat.color}`
                  : "0 2px 8px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)",
                transition: "all 0.18s ease",
                backdropFilter: "blur(8px)",
                whiteSpace: "nowrap",
              }}
            >
              {/* Color indicator dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: cat.color,
                  flexShrink: 0,
                  boxShadow: isActive ? `0 0 0 2px ${cat.color}44` : "none",
                }}
              />
              {cat.label}
            </button>
          );
        },
      )}

      {/* Hide scrollbar in WebKit */}
      <style>{`::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
