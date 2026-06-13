# Phase 3 Acceptance Fixtures: Matching Engine

**Reader:** Claude Code. Companion to `forest-habitat-game-spec.md`. These are deterministic test layouts for the Phase 3 matching engine. Build the engine so these exact placements produce these exact arrivals and star counts. If engine output and a fixture disagree, one of them is wrong; check the rules below before assuming the fixture is right.

> All expected values here are hand-derived from the rules below, not machine-verified. Treat them as the intended behavior. Encode them as automated tests so future tuning surfaces drift.

---

## Three rule clarifications (these refine the main spec; apply them)

The main spec left these loose. Pin them exactly or the fixtures are not reproducible.

1. **Distance is Chebyshev** (king-move): `dist = max(|dx|, |dy|)`. Distance to a 2x2 placeable is the minimum Chebyshev distance to any of its four occupied tiles.

2. **Matching uses one distance, not two.** A need `{type T, within W}` at home tile H is satisfied if the nearest placeable providing T sits at Chebyshev distance <= W from H. The provision `radius` field is NOT used in matching for v1. It is used only for the Phase 2 debug overlay. This removes the compounding-radius ambiguity in the original spec (radius + within was double-counting reach). Matching = `within` only.

3. **Contentment star formula.** Required needs met = the animal lives there (baseline). Stars layer the optionals on top:
   `stars = 1 + round( (optionalsSatisfied / optionalsTotal) * 2 )`, clamped to 1..3, round half up.
   - 0% optionals → 1 star, 50% → 2 stars, 100% → 3 stars.
   - Animals with one optional jump 1 → 3. Acceptable for v1. Giving every animal two optionals is a clean v1.1 tuning pass; do not do it now.

**Shade rule (restated for clarity):** a tile is `shade` if it is within Chebyshev distance 1 of any canopy placeable's footprint (covered or adjacent, diagonals included). A 2x2 canopy at top-left (c, r) therefore shades the 4x4 block cols `c-1..c+2`, rows `r-1..r+2`. Canopy placeables: oak, pine. Everything else is `open`.

---

## Coordinate convention

- Grid 16 wide (cols 0..15) by 12 tall (rows 0..11). Tiles as `(col, row)`, zero-indexed.
- 2x2 placeables are anchored at their top-left tile and occupy `(c,r), (c+1,r), (c,r+1), (c+1,r+1)`.
- Home tiles may be any tile, occupied or not; the animal nests among the foliage.

---

## Fixtures

### Fixture 1 — Empty map (negative test)

Placeables: none.

| Animal | Arrives | Stars | Reason |
|---|---|---|---|
| all 6 | no | — | nothing to satisfy any required need |

Expected: zero arrivals, journal fully locked. Confirms the engine does not produce phantom arrivals.

---

### Fixture 2 — One pond, one grass (single-placeable sufficiency)

Placeables: `pond (2,2)`, `grass (4,3)`.
(pond occupies (2,2),(3,2),(2,3),(3,3); grass occupies (4,3).)

| Animal | Arrives | Stars | Reason |
|---|---|---|---|
| Frog | yes | 3 | water within 1 + cover_low within 2 both met at e.g. (4,2); optional insects (pond) met → 1/1 |
| Rabbit | yes | 1 | grass gives cover_low + seeds, light open; no berries/nectar → 0/2 optionals |
| Songbird | no | — | no nest_high (no tall tree) |
| Squirrel | no | — | no nest_high |
| Butterfly | no | — | no nectar |
| Hedgehog | no | — | needs shade; no canopy exists, so no shade tiles |

Teaches: tall grass alone is a rabbit magnet; pond+cover is enough for a frog. A single placeable can satisfy an animal.

---

### Fixture 3 — Oak plus pond (one placeable serves two animals)

Placeables: `oak (8,5)`, `pond (12,5)`.
(oak occupies (8,5),(9,5),(8,6),(9,6), canopy; pond occupies (12,5),(13,5),(12,6),(13,6).)

| Animal | Arrives | Stars | Reason |
|---|---|---|---|
| Songbird | yes | 2 | nest_high (oak) within 1 + water (pond) within 4 at e.g. (10,5); optional insects met, berries not → 1/2 |
| Squirrel | yes | 1 | shade (under oak) + nest_high + nuts all from oak at (10,5); no seeds → 0/1 |
| Frog | no | — | water present but no cover_low anywhere |
| Rabbit | no | — | no cover_low; also needs open + seeds/berries |
| Butterfly | no | — | no nectar |
| Hedgehog | no | — | no shelter_ground source |

Teaches: the oak feeds two animals at once (the "one oak does triple duty" payoff). Songbird tolerates the shade (light any); squirrel requires it.

---

### Fixture 4 — Two zones (open and shade coexist, never share a tile)

Placeables: `wildflowers (3,3)`, `wildflowers (4,3)`, `rocks (5,3)`, `oak (10,5)`.

| Animal | Arrives | Stars | Reason |
|---|---|---|---|
| Butterfly | yes | 3 | nectar within 2 at open tile e.g. (3,2); second nectar source (cluster) + bask (rocks) both within 4 → 2/2 |
| Squirrel | yes | 1 | shade + nest_high + nuts from oak at e.g. (12,5); no seeds → 0/1 |
| Rabbit | yes | 1 | wildflowers give cover_low + nectar; open home near flowers; required met, but seeds/berries absent... see note |
| Frog | no | — | no water |
| Songbird | no | — | no water |
| Hedgehog | no | — | no shelter_ground source |

Note on Rabbit: rabbit required is `cover_low within 2` AND `seeds within 4 (satisfiedBy berries)`. Wildflowers provide cover_low and nectar but NOT seeds or berries, so **rabbit does NOT arrive** in this layout. Corrected row:

| Rabbit | no | — | cover_low present but no seeds and no berries |

Teaches the core spatial truth: butterfly home tiles are all `open`, squirrel home tiles are all `shade`, and the two sets never intersect. You host both by building two zones, not one clever tile. No fail state: adding the oak adds the squirrel without displacing the butterfly.

**Engine assertion for this fixture:** verify butterfly's chosen home tile is `open` and squirrel's is `shade`, and that no tile qualifies as home for both.

---

### Fixture 5 — Contentment increment (before / after one placeable)

**5a, before.** Placeables: `oak (5,5)`, `pond (8,5)`.

| Animal | Arrives | Stars |
|---|---|---|
| Songbird | yes | 2 (insects yes, berries no → 1/2) |
| Squirrel | yes | 1 |

**5b, after** adding `berry (7,5)` (col 7 is free between oak cols 5-6 and pond cols 8-9):

| Animal | Arrives | Stars | Change |
|---|---|---|---|
| Songbird | yes | 3 | berries now within 4 → 2/2 optionals. **2 → 3** |
| Squirrel | yes | 1 | unchanged |
| Frog | yes | 3 | berry adds cover_low; water+cover_low now both present |
| Rabbit | yes | 2 | berry gives cover_low + berries (satisfies seeds-or-berries); open home tile outside the oak shade; berries optional met → 1/2 |

**Primary assertion:** songbird goes 2 → 3 stars the instant the berry bush is placed, with no other change to songbird. This is the contentment loop working. The frog and rabbit arrivals are expected and additive (the berry bush helped them too); list them so they are not mistaken for bugs.

---

### Fixture 6 — Hedgehog (the shade-plus-ground-shelter case)

Placeables: `oak (6,4)`, `log (8,6)`.
(oak canopy shades cols 5..8, rows 3..6; log at (8,6) provides shelter_ground + insects.)

| Animal | Arrives | Stars | Reason |
|---|---|---|---|
| Hedgehog | yes | — | shade (from oak) + shelter_ground within 1 (log) + insects within 3 (log, oak); compute stars: optional cover_low within 2 absent → 0/1 → 1 star |
| Squirrel | yes | 1 | oak gives shade + nest_high + nuts |
| Songbird | no | — | no water |
| others | no | — | missing required needs |

Hedgehog stars: 1. Add a `grass` or `berry` within 2 of the hedgehog home to deliver cover_low and it jumps to 3 (its single optional). Good manual follow-on test.

Teaches: hedgehog is the one animal needing BOTH shade and a ground-shelter source, so it gates on a tree-plus-log combo, not either alone.

---

## What these fixtures collectively prove

- Required needs gate arrival (Fixtures 1, 3, 4).
- A single placeable can satisfy an animal (Fixture 2).
- One placeable can serve multiple animals (Fixtures 3, 6).
- Light splits the animal roster into incompatible home-tile sets (Fixture 4). This is the puzzle.
- Optional needs move contentment without ever gating (Fixture 5).
- `satisfiedBy` alternates work (Fixture 5 rabbit: berries standing in for seeds).

Seasonal fixtures belong with Phase 5; build these first against a single fixed season (treat all resources active).
