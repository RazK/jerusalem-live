/**
 * App.tsx
 *
 * Top-level shell. Currently renders the v2 prototype directly.
 *
 * Next steps for Claude Code:
 * 1. Replace JerusalemLiveV2 with a proper router (React Router or TanStack Router)
 * 2. Add Supabase auth provider wrapper
 * 3. Wire /events API to replace MOCK_EVENTS in the prototype
 * 4. Split into proper route pages: /, /admin, /submit
 *
 * The prototype (jerusalem-live-v2.jsx) uses mock data and inline styles.
 * It is the visual reference — migrate its UI piece by piece into the
 * TypeScript component library in src/components/.
 */

// @ts-ignore — prototype is JSX, will be migrated to TSX
import JerusalemLiveV2 from "./jerusalem-live-v2.jsx";

export default function App() {
  return <JerusalemLiveV2 />;
}
