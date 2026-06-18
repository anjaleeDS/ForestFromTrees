# Design: "Legible but still discovery"

_Date: 2026-06-17 · Status: approved, ready for planning_

## Problem

The v1 prototype reads as "drop things randomly, sometimes animals appear." The intended loop — read an animal's journal hint → deduce the habitat it wants → build it → it moves in → optimize to 3★ — isn't legible. Two gaps:

1. The journal never announces itself as the objective.
2. There is **no in-progress feedback** — an animal either arrives or doesn't, with no "you're getting warmer," so intentional play feels indistinguishable from guessing.

## Goal

Make the goal and the feedback legible **without revealing exact recipes**. Preserve deduction; remove the "is this doing anything?" feeling.

## Decisions (locked)

Four pieces. Three are chrome; one (the stirring signal) carries real engine logic.

### 1. The "stirring" signal — core

Definition of "one need away," chosen to be fair across all animals including light-gated ones:

> For each grid tile, count the animal's **unmet arrival conditions**:
> `unmetAtTile = (animal.light !== 'any' && lightAt(tile) !== animal.light ? 1 : 0) + (number of REQUIRED needs not satisfied at this tile)`
>
> `unmetRequired` = the **minimum** of `unmetAtTile` over **all** grid tiles (every tile, not only correctly-lit ones — so a wrong-light tile contributes its +1 and the light gap is counted like any other missing condition).
>
> - `unmetRequired === 0` ⇒ the animal qualifies / arrives (today's behavior).
> - `unmetRequired === 1` ⇒ the animal is **stirring** (exactly one condition away).
> - `unmetRequired >= 2` ⇒ not stirring.

This unifies light and needs into one "conditions" count. Worked cases:
- Hedgehog (needs shade + shelter_ground + insects): food placed in the open, no canopy → best tile has light gap only → `unmetRequired = 1` → stirs.
- Shade animal sitting in correct shade but missing one food source → `unmetRequired = 1` → stirs.
- Empty map → every animal `unmetRequired >= 2` (or more) → nothing stirs.

The signal never reveals *which* condition is missing — only that the animal is close.

Optional needs are irrelevant to stirring (they affect stars, not arrival).

### 2. Stirring presentation (hybrid)

A locked journal entry whose animal is currently stirring renders:
- warm amber card background + amber border,
- the silhouette partially de-greyed (tinted, not full color),
- hint line replaced with _"Something stirs nearby…"_ in a warm tone,
- a small "👀 nearby" badge in the card's top-right corner.

A locked entry that is **not** stirring keeps the existing flat grey silhouette + italic hint. A discovered entry is unchanged (full card with name/species/stars/personality).

Stirring is **derived, not permanent** — it reflects the current map and updates on every change. (Contrast residents, which are permanent.)

### 3. Discovered counter

The journal heading becomes **"Species Journal — N of 6 discovered"**, where `N = residents.length` and `6 = ANIMALS.length`. Phrased dynamically from config, not hardcoded to 6.

### 4. Tutorial line

Replace the current App tagline (`"Place habitat. Animals move in when it feels like home."`) with:

> _"Read each animal's clue in the journal, build the habitat it wants, and it'll move in."_

Always visible, no dismiss logic.

## Non-goals

- **No "almost 3 stars" signal.** The 1★→3★ optimization already has feedback (visible star changes). A second proximity signal there would be noise.
- No change to matching, arrival, permanence, or seasons behavior. Stirring is purely additive/observational.
- No reveal of which specific need/light condition is missing.
- No persistence, no new animals/placeables (separate backlog items).

## Architecture & data flow

```
matching.evaluateAnimal  ──> MatchResult { ...existing, unmetRequired }
gameReducer.recompute     ──> derives stirring: string[]  (non-resident animals with unmetRequired === 1)
GameState                 ──> { ...existing, stirring }
App                       ──> passes residents + stirring to Journal; new tagline
Journal                   ──> per locked animal: stirring? -> warm state : grey state; heading counter
```

### Engine (`src/engine/matching.ts`, `types.ts`)

- Add `unmetRequired: number` to `MatchResult` (`types.ts`).
- In `evaluateAnimal`, while scanning tiles, also track the minimum `unmetAtTile` across all tiles (with the light penalty), independent of the existing best-home/optionals scan. Set `unmetRequired` on the result. For a qualifying animal `unmetRequired` is 0 (a 0-unmet tile exists). For a non-qualifier it is `>= 1`.
- `evaluateAll` unchanged in shape (still returns `Map<string, MatchResult>`).

### State (`src/state/gameReducer.ts`)

- Add `stirring: string[]` to `GameState`; initialise `[]` in `initialState()` (so `RESET` clears it).
- In `recompute()`, after `reconcile`, compute the resident id set and derive:
  `stirring = [...results].filter(([id, r]) => !residentIds.has(id) && r.unmetRequired === 1).map(([id]) => id)`
  and include it in the returned state.

### UI (`src/components/Journal.tsx`, `App.tsx`, `styles.css`)

- `Journal` gains a `stirring: string[]` prop. For each undiscovered animal, if its id is in `stirring`, render the warm/badge state; else the grey state. Heading shows the counter.
- `App` passes `state.stirring` to `Journal`; tagline text updated.
- `styles.css`: `.journal-entry.stirring` (bg/border), tinted silhouette, `.journal-hint.stirring` (warm color), `.journal-nearby-badge`.

## Testing

- **Engine** (`matching.test.ts`): `unmetRequired` is 0 for a qualifying animal; exactly 1 for a one-need-away animal; the **light-gap case** — hedgehog with `log` + `pond` (shelter + insects) but no canopy reads `unmetRequired === 1` (only the shade condition missing); `>= 2` when two conditions are missing.
- **State** (`gameReducer.test.ts`): placing partial habitat puts the right animal id in `stirring` and not in `residents`; once it qualifies it leaves `stirring` and enters `residents`; `RESET` empties `stirring`.
- **Component** (`Journal.test.tsx`): a stirring animal shows "Something stirs nearby…" and the nearby badge and hides its plain hint; a non-stirring locked animal shows its grey hint and no badge; the heading shows "N of 6 discovered" reflecting residents.

## Files touched

- `src/engine/types.ts` — add `unmetRequired` to `MatchResult`
- `src/engine/matching.ts` — compute `unmetRequired`
- `src/state/gameReducer.ts` — add/derive `stirring`
- `src/components/Journal.tsx` — stirring states + counter
- `src/App.tsx` — pass `stirring`, new tagline
- `src/styles.css` — stirring styles + badge
- tests: `matching.test.ts`, `gameReducer.test.ts`, `Journal.test.tsx`
