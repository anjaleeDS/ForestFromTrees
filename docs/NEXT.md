# Where things stand & what's next

_Last updated: 2026-06-16_

## Current state

v1 prototype is **complete, merged to `main`, and pushed.** 52 tests passing, typecheck clean, production build works. All 6 spec phases verified (placement, light/shade, debug overlay, matching against all Phase-3 fixtures, arrival + journal, seasons incl. seasonal gating of new arrivals).

To run: `npm install && npm run dev` (Vite, opens http://localhost:5173). Tests: `npm test`.

Key docs:
- Spec: `docs/superpowers/specs/2026-06-13-forest-habitat-design.md`
- Fixtures: `docs/superpowers/specs/2026-06-13-forest-habitat-phase3-fixtures.md`
- Build plan: `docs/superpowers/plans/2026-06-13-forest-habitat.md`

## In progress: "Legible but still discovery" (NOT yet built)

**Problem it solves:** the game reads as "drop things randomly, sometimes animals appear." The discovery loop (read journal hint → deduce habitat → build it → animal arrives → optimize to 3★) isn't legible, and there's no feedback telling you you're getting closer.

**Direction chosen:** make the goal and feedback legible *without* revealing exact recipes. Four pieces:
1. **Discovered counter** — e.g. "2 of 6 species discovered" so the journal reads as the objective.
2. **Journal-as-objective framing** — make clear the journal is what you're filling.
3. **One-line tutorial** — first-run hint: "Read each animal's clue, build the habitat it wants, and it'll move in."
4. **"Getting warm" signal** — the tricky one. Open question below.

**OPEN QUESTION (resume here):** what should the "warm" signal be?
- **Option 1 (recommended):** "one need away" — when an animal has all-but-one *required* need met somewhere on the grid, its locked journal entry wakes up (silhouette tints in, label → "Something stirs nearby…"). Grey → stirring → arrived. Warm without saying what's missing.
- Option 2: partial meter ("2 of 3 needs met") — more informative, leaks how many needs exist.
- Option 3: whole-forest vibe line — atmospheric, but doesn't connect a placement to a specific animal.

After the signal is chosen: ~2 more design questions, then design doc → implementation plan → build.

**To resume from a fresh session, say:** "continue the 'legible but still discovery' feature per docs/NEXT.md."

## Backlog (v2 parking lot, from the spec — none started)

- **Persistence** — save/load the forest (currently session-only, in-memory).
- **Ongoing residents** — moods, small requests, reactions over time (residents structure is already shaped to allow per-resident history).
- **More content** — additional animals/placeables; rarer animals needing 3★-quality habitat.
- **Rare visitor** — a special animal that appears only when overall habitat richness crosses a threshold.
- **Larger / scrollable grid.**
