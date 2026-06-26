# Where things stand & what's next

_Last updated: 2026-06-25_

## Current state

v1 prototype **plus the "legible discovery" feature** are complete and merged to `main`. 63 tests passing, typecheck clean (`tsc -b --noEmit`), production build works.

Shipped so far:
- v1: placement, light/shade, debug overlay, matching (all Phase-3 fixtures), arrival + journal, seasons incl. seasonal gating of new arrivals.
- Legible discovery: a "stirring" warm signal on locked journal entries (one condition from arriving), a "N of 6 discovered" counter, and an instructive tagline. Engine value `MatchResult.unmetRequired` + reducer `stirring` list drive it.

To run: `npm install && npm run dev` (Vite, opens http://localhost:5173). Tests: `npm test`. Typecheck: `npm run typecheck`.

Key docs:
- Spec (v1): `docs/superpowers/specs/2026-06-13-forest-habitat-design.md`
- Fixtures: `docs/superpowers/specs/2026-06-13-forest-habitat-phase3-fixtures.md`
- Spec (legible discovery): `docs/superpowers/specs/2026-06-17-legible-discovery-design.md`
- Plans: `docs/superpowers/plans/2026-06-13-forest-habitat.md`, `docs/superpowers/plans/2026-06-17-legible-discovery.md`

## Next up (recommended order)

1. **Persistence** — save/load the forest (currently session-only, vanishes on refresh). Highest-value gap now that the core loop is legible and satisfying. Likely localStorage: serialize `placements` + `residents` + `season`, restore on load. Decide whether residents persist or get re-derived.
2. **Ongoing residents** — moods, small requests, reactions over time. Biggest design lift; turns a one-shot puzzle into something living. Residents structure already allows per-resident history.
3. **More content** — additional animals/placeables, including rare ones needing 3★-quality habitat.
4. **Rare visitor** — special animal that appears only when overall habitat richness crosses a threshold.
5. **Larger / scrollable grid.**

To resume any of these in a fresh session: "continue from docs/NEXT.md — let's do <item>."
