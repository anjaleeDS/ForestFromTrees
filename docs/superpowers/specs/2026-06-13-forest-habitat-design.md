# Build Spec: Forest Habitat Game (v1 prototype)

**Reader:** Claude Code. This is an implementation spec, not a PRD. Decisions are stated as facts. Build in the phase order given. Each phase has acceptance checks; do not advance until they pass.

---

## TLDR

A relaxed, cozy single-screen game. The player places habitat (trees, water, plants) freely on a 2D tile grid. The game continuously evaluates the map against a set of animal needs-profiles. When an animal's required needs are met, it walks in, gets a name and a charm intro card, and becomes a permanent resident in a species journal. There is no fail state, no death, no timer, no resource budget. The only feedback is additive: more suitable habitat means more residents and higher contentment. Inspiration is Animal Crossing's "the place feels inhabited" warmth, expressed through a suitability-matching system.

---

## Decisions locked (do not reinterpret)

- **Model:** residence. Animals live in the forest, not passing through it.
- **Placement:** free placement on a grid. Player drops a placeable on any valid tile, like a level editor. No brush/paint.
- **Goal structure:** gentle goals via discovery. A species journal fills in as animals arrive. This is the progression spine.
- **Fail state:** none. Animals never die. An unmet animal simply has not arrived "yet." Scoring is additive only.
- **Disruption:** seasons, not disasters. Seasons gently toggle which resources are active. No fire, drought, or loss framing.
- **Charm layer:** every animal is a named character with a one-line personality and an arrival moment. The arrival is a small event, not a stat increment.
- **Stack:** React, single page, in-memory state only. No backend, no database, no persistence beyond the session for v1. 2D top-down tile grid rendered with DOM or canvas (builder's choice; DOM is fine at this grid size).
- **Scope:** 6 animals, 8 placeables. Enough to prove the matching loop is fun, small enough to finish.

## Assumption flagged (v1 written on this basis)

- **Relationship is one-shot.** Animal arrives, gets named, gets a journal entry, becomes a permanent resident. The relationship IS the arrival. Residents do not later make requests, react over time, or leave. Ongoing relationships (reactions, requests, moods over time) are a documented v2 non-goal below.

---

## Non-goals for v1 (explicitly out of scope; do not build)

- No save/load or persistence. Session-only state.
- No animals leaving, dying, or degrading. One-directional: arrive and stay.
- No ongoing resident behavior (no requests, gifts, dialogue trees, relationship meters). v2.
- No combat, predators, or inter-animal conflict. Competing *needs* exist; animals do not interact.
- No money, budget, or tile-cost economy. Placement is free and unlimited.
- No multiplayer, accounts, or sharing.
- No procedural map generation. Player starts with a blank grid.
- No sound design beyond simple optional cue hooks (see Phase 4). Do not block on audio.

---

## Core data model

The entire game is two things matching: what a placeable **provides**, and what an animal **needs**. Specify these as data, not logic. Animals and placeables must be defined in editable config arrays so content can be tuned without touching engine code.

### Placeable definition

```
Placeable {
  id: string            // 'oak'
  name: string          // 'Oak Tree'
  footprint: number     // tiles occupied, square. 1 = 1x1, 2 = 2x2
  canopy: boolean       // true = casts shade over its footprint + 1 tile radius
  provides: Provision[]
}

Provision {
  type: string          // see provision types below
  value: number         // level/quality, used by threshold needs. default 1
  radius: number        // how many tiles out this provision reaches. 0 = own footprint only
}
```

### Animal definition

```
Animal {
  id: string
  name: string          // the character name, e.g. 'Pip'
  species: string       // 'Songbird'
  personality: string   // one line of charm, shown on arrival + in journal
  light: 'open' | 'shade' | 'any'   // required ambient light at its home tile
  needs: Need[]
}

Need {
  type: string          // provision type this need looks for
  within: number        // max tile distance from a candidate home tile
  required: boolean      // required gates arrival. optional adds contentment only
  satisfiedBy?: string[] // optional: alternative provision types that also satisfy
}
```

### Provision types (the shared vocabulary)

`water`, `nest_high` (nestable branches in a tall tree), `shelter_ground` (den/cover at ground level), `berries`, `nuts` (acorns/pinecones), `nectar`, `insects`, `seeds`, `cover_low`, `bask` (sunny rock/open spot).

### Matching rules

1. For each animal, scan every grid tile as a candidate home tile.
2. A tile is a valid home if: ambient light at the tile matches the animal's `light` (or animal light is `any`), AND every `required` need has a matching provision within `within` tiles.
3. If at least one valid home tile exists, the animal **arrives** (once). Pick the best home tile (most optional needs also satisfied) as its spot.
4. **Contentment** = count of that animal's optional needs satisfied at its home tile, mapped to 1 to 3 stars. Contentment is cosmetic. It never gates anything and never decreases the experience. It exists purely as the "push it to 3 stars" optimization joy.
5. Re-run matching whenever the map changes (a placeable added or removed) and whenever the season changes.

### Ambient light

Compute a light map over the grid. A tile is `shade` if covered by any `canopy: true` placeable's footprint or 1-tile radius; otherwise `open`. This is what creates real tension: shade-lovers and open-lovers want incompatible layouts, so the player cannot blanket the map with one placeable.

---

## v1 content (ship exactly this set)

### Placeables (8)

| id | name | footprint | canopy | provides (type, radius) |
|---|---|---|---|---|
| oak | Oak Tree | 2 | yes | nest_high r0, nuts r3, insects r2 |
| pine | Pine Tree | 2 | yes | nest_high r0, seeds r3, shelter_ground r1 |
| berry | Berry Bush | 1 | no | berries r2, cover_low r1 |
| pond | Pond | 2 | no | water r4, insects r3 |
| wildflowers | Wildflowers | 1 | no | nectar r2, cover_low r1 |
| log | Fallen Log | 1 | no | shelter_ground r1, insects r2 |
| grass | Tall Grass | 1 | no | cover_low r1, seeds r2, shelter_ground r0 |
| rocks | Rock Pile | 1 | no | bask r1, shelter_ground r1 |

### Animals (6)

Personalities are placeholders; tune freely, keep them short and warm.

| id | species | light | required needs (type, within) | optional needs (type, within) | personality |
|---|---|---|---|---|---|
| pip | Songbird | any | nest_high w1, water w4 | berries w4, insects w3 | "Sings before you've had coffee." |
| quill | Hedgehog | shade | shelter_ground w1, insects w3 | cover_low w2 | "Grumpy, fond of dusk, secretly soft." |
| acorn | Squirrel | shade | nest_high w1, nuts w4 | seeds w4 | "Has buried more than it will ever find." |
| ribbit | Frog | any | water w1 (required), cover_low w2 | insects w3 | "Communicates exclusively in vibes." |
| flit | Butterfly | open | nectar w2 | nectar w4 (a second source = cluster), bask w4 | "Indecisive about flowers, committed to sunshine." |
| clover | Rabbit | open | cover_low w2, seeds w4, satisfiedBy berries | berries w4, nectar w4 | "Always mid-snack. No notes." |

This set is intentionally in tension. Butterfly and rabbit want `open`; squirrel and hedgehog want `shade`. A grid that is all trees gets you squirrels and no butterflies. The "good forest" is a mosaic. That mosaic-seeking is the game.

---

## Build order (phased, with acceptance checks)

### Phase 0: Scaffold
- React single-page app. Render a grid (start 16x12 tiles). Tiles are visually distinct, top-down.
- Load placeable and animal configs from editable arrays.
- **Accept:** grid renders; configs load; resizing the window does not break layout.

### Phase 1: Placement
- A palette of the 8 placeables. Player selects one, clicks a tile to place it. Respects footprint (2x2 placeables need a 2x2 clear space). An "erase" tool removes a placeable.
- Placed items render on the grid with clear, distinct visuals (emoji or simple sprites are fine for v1).
- **Accept:** player can place all 8 types, footprints are enforced, overlaps are blocked, erase works.

### Phase 2: Derived map state
- From placements, compute two derived layers, recomputed on every map change:
  - **Light map:** every tile is `open` or `shade` per the canopy rule.
  - **Provision field:** for each provision type, which tiles are within radius of a source.
- Add a debug overlay toggle that visualizes the light map and a selected provision field. This is for tuning, keep it behind a dev toggle.
- **Accept:** placing an oak turns nearby tiles to shade in the overlay; placing a pond shows a water field 4 tiles out; removing it clears them.

### Phase 3: Matching engine
- Implement the matching rules above. On every map change, evaluate all 6 animals: determine which have a valid home tile, pick best home tile, compute contentment stars.
- No UI yet beyond a dev readout listing which animals currently qualify and their star count.
- **Accept:** hand-built test layouts produce the expected arrivals. E.g. one pond + one patch of tall grass = frog qualifies; add wildflowers in range = frog gains a contentment star.

### Phase 4: Arrival and journal (the charm layer)
- When an animal newly qualifies, trigger an **arrival moment**: the animal appears at its home tile with a brief entrance (a small movement/settle animation or even a gentle fade-in), and a card slides in showing species, name, personality line, and contentment stars.
- A **species journal** panel lists all 6 animals. Undiscovered ones show as a silhouette/locked entry (silhouette only, no needs revealed unless you choose to show a hint). Discovered ones show the full card.
- Optional, non-blocking: a sound cue hook on arrival. Stub it; do not block the build on audio.
- **Accept:** building habitat for an animal triggers its arrival card exactly once; the journal entry flips from locked to filled; contentment stars on the card match the engine.

### Phase 5: Seasons (gentle change)
- A season control cycling Spring, Summer, Autumn, Winter. Changing season toggles which provisions are active:
  - berries: active spring/summer/autumn, dormant winter.
  - nectar: active spring/summer, dormant autumn/winter.
  - nuts: active autumn (acorns/pinecones drop), reduced otherwise.
  - water, nest_high, shelter_ground, cover_low, bask, seeds, insects: always active (tune insects down in winter if desired).
- Visual season shift (palette/tint) so the change reads. Already-arrived residents STAY even if a seasonal resource goes dormant (one-shot rule: arrival is permanent). Seasons affect *new* arrivals and contentment, never eviction.
- **Accept:** switching to winter makes berry-dependent *new* matches harder, existing residents remain, the grid visibly changes season, and cycling back to spring restores berry-based matching.

---

## Why redundancy is the skill (build-in, not a feature to add)

Because seasons toggle resources, a forest with a single berry bush loses berry coverage in winter for new arrivals. A forest with berries AND an insect source covers the songbird year-round via its `satisfiedBy` alternates. The engine already rewards this through `satisfiedBy` and proximity. Do not add a separate "resilience" mechanic; it emerges from the data. This is the quiet replay hook.

---

## v2 parking lot (design v1 so these stay possible; do not build)

- Ongoing residents: moods, small requests, reactions to map changes over time. (The biggest one. Keep animal state in a structure that could later hold per-resident mood/history.)
- Persistence (save/load the forest).
- More animals and placeables; rarer animals that need 3-star-quality habitat to appear.
- A soft "rare visitor" that only shows when overall habitat richness crosses a threshold (the gold-tier reveal, reframed cozy).
- Larger or scrollable grid.

---

## Journal hints (resolved)

Locked journal entries show a **gentle hint**, always visible (not unlockable, not gated). The hint points at a direction, never a recipe.

Rules:
- **One sensory or thematic clue per locked entry**, drawn from one or two of the animal's needs but worded as flavor. Examples: Frog "Heard near still water." Butterfly "Follows the sun and the flowers." Hedgehog "Rustles in the shadows, close to the ground." Squirrel "Wants a tall tree and something to hoard." Songbird "Nests high, never far from a drink." Rabbit "Likes low cover and an easy snack."
- **No mechanics language.** No tile counts, no `within`, no provision-type names, no numbers. The player learns the system by playing, not by reading it off a card.
- **Never list all of an animal's needs.** Gesture at the strongest one or two. The exact recipe stays a discovery.
- The hint sits on the locked entry beside the silhouette, soft and low-contrast, present the moment the journal opens.

Once discovered, the entry flips to the full card (name, personality, contentment stars) and the hint is replaced by the real thing.
