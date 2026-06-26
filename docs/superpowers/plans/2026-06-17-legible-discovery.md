# Legible Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game's discovery loop legible — a "getting warm" signal on locked journal entries, a discovered-counter, and an instructive tagline — without revealing recipes.

**Architecture:** Add a pure `unmetRequired` value to the matching engine (minimum unmet arrival conditions across all tiles, counting a wrong-light tile as +1). The reducer derives a `stirring` id list from it on every recompute. The Journal renders a warm "stirring" state for locked entries that are one condition away, plus a counter in its heading.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react (existing).

**Spec:** `docs/superpowers/specs/2026-06-17-legible-discovery-design.md`

---

### Task 1: Engine — `unmetRequired` on MatchResult

Add the minimum-unmet-conditions value to the matching engine. A wrong-light tile contributes +1; each unsatisfied required need contributes +1; `unmetRequired` is the minimum across all grid tiles. Qualifying animals get 0.

**Files:**
- Modify: `src/engine/types.ts` (add field to `MatchResult`)
- Modify: `src/engine/matching.ts` (`evaluateAnimal`)
- Test: `src/engine/__tests__/matching.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `src/engine/__tests__/matching.test.ts`:

```ts
describe('unmetRequired (stirring proximity)', () => {
  it('is 0 for a qualifying animal', () => {
    // Fixture 2: pond + grass -> frog qualifies
    const r = evaluateAll(ANIMALS, [place('pond', 2, 2), place('grass', 4, 3)], idx, 'all').get('ribbit')!
    expect(r.qualifies).toBe(true)
    expect(r.unmetRequired).toBe(0)
  })
  it('is exactly 1 when a frog has water but no cover (one need away)', () => {
    // pond alone: frog needs water (met) + cover_low (missing) -> 1 unmet
    const r = evaluateAll(ANIMALS, [place('pond', 2, 2)], idx, 'all').get('ribbit')!
    expect(r.qualifies).toBe(false)
    expect(r.unmetRequired).toBe(1)
  })
  it('counts a wrong-light tile as the one missing condition (hedgehog with food, no shade)', () => {
    // log + pond in the open: hedgehog gets shelter_ground (log) + insects (log/pond)
    // but there is no canopy, so no shade tile exists. Only the light condition is unmet.
    const r = evaluateAll(ANIMALS, [place('log', 8, 6), place('pond', 11, 6)], idx, 'all').get('quill')!
    expect(r.qualifies).toBe(false)
    expect(r.unmetRequired).toBe(1)
  })
  it('is >= 2 when two conditions are missing (empty map, frog)', () => {
    const r = evaluateAll(ANIMALS, [], idx, 'all').get('ribbit')!
    expect(r.unmetRequired).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- matching`
Expected: FAIL — `unmetRequired` is `undefined` / not on the type.

- [ ] **Step 3: Add the field to `MatchResult`** in `src/engine/types.ts`. Find:

```ts
export interface MatchResult {
  animalId: string
  qualifies: boolean
  homeTile: Tile | null
  homeLight: Light | null
  stars: number              // 0 if not qualifying
  optionalsSatisfied: number
  optionalsTotal: number
}
```

Replace with (one new field added):

```ts
export interface MatchResult {
  animalId: string
  qualifies: boolean
  homeTile: Tile | null
  homeLight: Light | null
  stars: number              // 0 if not qualifying
  optionalsSatisfied: number
  optionalsTotal: number
  unmetRequired: number      // min unmet arrival conditions across all tiles (0 = qualifies)
}
```

- [ ] **Step 4: Compute it in `evaluateAnimal`** — in `src/engine/matching.ts`, replace the entire `evaluateAnimal` function (lines 33–63) with:

```ts
export function evaluateAnimal(
  animal: Animal, placements: Placement[], idx: PlaceableIndex,
  lightMap: LightMap, season: Season | 'all',
): MatchResult {
  const required = animal.needs.filter(n => n.required)
  const optional = animal.needs.filter(n => !n.required)
  let best: { tile: Tile; light: Light; opt: number } | null = null
  let minUnmet = Infinity

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const home: Tile = { col, row }
      const light = lightAt(lightMap, home)
      const lightPenalty = animal.light !== 'any' && animal.light !== light ? 1 : 0
      const unmetNeeds = required.filter(n => !needMet(home, n, placements, idx, season)).length
      const unmet = lightPenalty + unmetNeeds
      if (unmet < minUnmet) minUnmet = unmet
      if (lightPenalty === 0 && unmetNeeds === 0) {
        const opt = optional.filter(n => needMet(home, n, placements, idx, season)).length
        if (best === null || opt > best.opt) best = { tile: home, light, opt }
      }
    }
  }

  if (!best) {
    return {
      animalId: animal.id, qualifies: false, homeTile: null, homeLight: null,
      stars: 0, optionalsSatisfied: 0, optionalsTotal: optional.length,
      unmetRequired: minUnmet,
    }
  }
  const ratio = optional.length === 0 ? 0 : best.opt / optional.length
  return {
    animalId: animal.id, qualifies: true, homeTile: best.tile, homeLight: best.light,
    stars: clampStars(ratio), optionalsSatisfied: best.opt, optionalsTotal: optional.length,
    unmetRequired: minUnmet,
  }
}
```

Note: the grid is never empty of tiles, so `minUnmet` is always assigned (never stays `Infinity`). A qualifying tile has `unmet === 0`, so for qualifiers `minUnmet === 0`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- matching && npm run typecheck`
Expected: PASS (existing matching tests + 4 new), no type errors.

- [ ] **Step 6: Run the full suite** (the fixtures use `MatchResult`; confirm nothing regressed)

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A && git -c commit.gpgsign=false commit -m "feat: compute unmetRequired (stirring proximity) in matching engine"
```

---

### Task 2: State — derive `stirring` in the reducer

Add a `stirring: string[]` field to `GameState`, derived on every recompute: non-resident animals whose `unmetRequired === 1`.

**Files:**
- Modify: `src/state/gameReducer.ts` (`GameState`, `initialState`, `recompute`)
- Test: `src/state/__tests__/gameReducer.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append inside the existing `describe('gameReducer', ...)` block in `src/state/__tests__/gameReducer.test.ts` (before its closing `})`):

```ts
  it('marks a one-need-away animal as stirring, not resident', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    // pond alone: frog has water but no cover_low -> one need away
    expect(s.stirring).toContain('ribbit')
    expect(s.residents.map(r => r.animalId)).not.toContain('ribbit')
  })
  it('once an animal qualifies it leaves stirring and becomes a resident', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    expect(s.stirring).not.toContain('ribbit')
    expect(s.residents.map(r => r.animalId)).toContain('ribbit')
  })
  it('RESET clears stirring', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    expect(s.stirring.length).toBeGreaterThan(0)
    s = gameReducer(s, { type: 'RESET' })
    expect(s.stirring).toHaveLength(0)
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- gameReducer`
Expected: FAIL — `stirring` is `undefined`.

- [ ] **Step 3: Add `stirring` to `GameState`** in `src/state/gameReducer.ts`. Find:

```ts
export interface GameState {
  placements: Placement[]
  season: Season
  residents: Resident[]
  lastArrivals: string[]
  nextId: number
  debug: { show: boolean; provisionType: ProvisionType }
}
```

Replace with:

```ts
export interface GameState {
  placements: Placement[]
  season: Season
  residents: Resident[]
  stirring: string[]   // animalIds one condition from arriving (not yet residents)
  lastArrivals: string[]
  nextId: number
  debug: { show: boolean; provisionType: ProvisionType }
}
```

- [ ] **Step 4: Initialise `stirring` in `initialState`.** Find:

```ts
export function initialState(): GameState {
  return {
    placements: [], season: 'spring', residents: [], lastArrivals: [], nextId: 1,
    debug: { show: false, provisionType: 'water' },
  }
}
```

Replace with:

```ts
export function initialState(): GameState {
  return {
    placements: [], season: 'spring', residents: [], stirring: [], lastArrivals: [], nextId: 1,
    debug: { show: false, provisionType: 'water' },
  }
}
```

- [ ] **Step 5: Derive `stirring` in `recompute`.** Find:

```ts
function recompute(state: GameState, placements: Placement[], season: Season): GameState {
  const results = evaluateAll(ANIMALS, placements, IDX, season)
  const { residents, arrivals } = reconcile(state.residents, results)
  return {
    ...state, placements, season, residents,
    lastArrivals: [...state.lastArrivals, ...arrivals],
  }
}
```

Replace with:

```ts
function recompute(state: GameState, placements: Placement[], season: Season): GameState {
  const results = evaluateAll(ANIMALS, placements, IDX, season)
  const { residents, arrivals } = reconcile(state.residents, results)
  const residentIds = new Set(residents.map(r => r.animalId))
  const stirring = [...results]
    .filter(([id, r]) => !residentIds.has(id) && r.unmetRequired === 1)
    .map(([id]) => id)
  return {
    ...state, placements, season, residents, stirring,
    lastArrivals: [...state.lastArrivals, ...arrivals],
  }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- gameReducer && npm run typecheck`
Expected: PASS (existing reducer tests + 3 new), no type errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git -c commit.gpgsign=false commit -m "feat: derive stirring id list in game reducer"
```

---

### Task 3: UI — Journal stirring state + discovered counter

Render the warm "stirring" state (tint + "Something stirs nearby…" + corner badge) for locked entries in the `stirring` list, and show "N of 6 discovered" in the heading.

**Files:**
- Modify: `src/components/Journal.tsx`
- Modify: `src/styles.css` (append)
- Test: `src/components/__tests__/Journal.test.tsx` (replace/extend)

- [ ] **Step 1: Write the failing test** — replace the entire contents of `src/components/__tests__/Journal.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Journal } from '../Journal'
import type { Resident } from '../../engine/types'

describe('Journal', () => {
  const ribbit: Resident = { animalId: 'ribbit', homeTile: { col: 4, row: 2 }, homeLight: 'open', stars: 3 }

  it('shows hints for locked animals and full cards for residents', () => {
    render(<Journal residents={[ribbit]} stirring={[]} />)
    expect(screen.getByText(/Ribbit/)).toBeInTheDocument()
    expect(screen.getByText(/exclusively in vibes/i)).toBeInTheDocument()
    expect(screen.getByText(/Follows the sun and the flowers/i)).toBeInTheDocument()
    expect(screen.queryByText(/committed to sunshine/i)).not.toBeInTheDocument()
  })

  it('shows the discovered counter reflecting residents', () => {
    render(<Journal residents={[ribbit]} stirring={[]} />)
    expect(screen.getByText(/1 of 6 discovered/i)).toBeInTheDocument()
  })

  it('renders a stirring locked animal with the nearby badge and stir copy, hiding its plain hint', () => {
    render(<Journal residents={[]} stirring={['quill']} />)
    expect(screen.getByText(/Something stirs nearby/i)).toBeInTheDocument()
    expect(screen.getByText('👀 nearby')).toBeInTheDocument()
    // its normal hint should be replaced, not shown
    expect(screen.queryByText(/Rustles in the shadows/i)).not.toBeInTheDocument()
  })

  it('a non-stirring locked animal keeps its grey hint and no stir copy', () => {
    render(<Journal residents={[]} stirring={[]} />)
    expect(screen.getByText(/Rustles in the shadows/i)).toBeInTheDocument()
    expect(screen.queryByText(/Something stirs nearby/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- Journal`
Expected: FAIL — `Journal` doesn't accept `stirring`, no counter, no stir state.

- [ ] **Step 3: Rewrite `src/components/Journal.tsx`** entirely:

```tsx
import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

function Stars({ n }: { n: number }) {
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(3 - n)}</span>
}

interface Props {
  residents: Resident[]
  stirring: string[]
}

export function Journal({ residents, stirring }: Props) {
  const byId = new Map(residents.map(r => [r.animalId, r]))
  const stirringSet = new Set(stirring)
  return (
    <div className="journal">
      <h2>Species Journal <span className="journal-count">{residents.length} of {ANIMALS.length} discovered</span></h2>
      <div className="journal-list">
        {ANIMALS.map(a => {
          const res = byId.get(a.id)
          if (res) {
            return (
              <div className="journal-entry discovered" key={a.id}>
                <div className="journal-emoji">{a.emoji}</div>
                <div className="journal-name">{a.name} <span className="journal-species">{a.species}</span></div>
                <Stars n={res.stars} />
                <div className="journal-personality">{a.personality}</div>
              </div>
            )
          }
          const isStirring = stirringSet.has(a.id)
          if (isStirring) {
            return (
              <div className="journal-entry locked stirring" key={a.id}>
                <span className="journal-nearby-badge">👀 nearby</span>
                <div className="journal-emoji stirring-emoji">{a.emoji}</div>
                <div className="journal-name">???</div>
                <div className="journal-hint stirring">Something stirs nearby…</div>
              </div>
            )
          }
          return (
            <div className="journal-entry locked" key={a.id}>
              <div className="journal-emoji silhouette">{a.emoji}</div>
              <div className="journal-name">???</div>
              <div className="journal-hint">{a.hint}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Append stirring styles to `src/styles.css`:**

```css
.journal-count { font-weight: 400; font-size: 13px; color: #5a6b4a; }
.journal-entry { position: relative; }
.journal-entry.stirring { background: #fbf4e2; border-color: #e0c067; }
.journal-emoji.stirring-emoji { filter: grayscale(0.4) brightness(0.85); }
.journal-hint.stirring { color: #a8761b; font-style: italic; }
.journal-nearby-badge {
  position: absolute; top: 8px; right: 8px;
  background: #f0e2bd; color: #8a6a16; font-size: 11px;
  padding: 2px 7px; border-radius: 8px;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- Journal && npm run typecheck`
Expected: PASS (4 tests), no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git -c commit.gpgsign=false commit -m "feat: journal stirring state and discovered counter"
```

---

### Task 4: Wire `stirring` into App + instructive tagline

Pass `state.stirring` to the Journal and replace the tagline with the tutorial line.

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/App.test.tsx` (append)

- [ ] **Step 1: Write the failing test** — append a new test inside the existing `describe('App integration', ...)` block in `src/__tests__/App.test.tsx` (before its closing `})`):

```tsx
  it('shows the discovered counter and the instructive tagline on load', () => {
    render(<App />)
    expect(screen.getByText(/0 of 6 discovered/i)).toBeInTheDocument()
    expect(screen.getByText(/build the habitat it wants/i)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- App`
Expected: FAIL — tagline text and counter not present (Journal currently called without `stirring`, and tagline is the old copy).

- [ ] **Step 3: Update the tagline** in `src/App.tsx`. Find:

```tsx
        <p className="tagline">Place habitat. Animals move in when it feels like home.</p>
```

Replace with:

```tsx
        <p className="tagline">Read each animal's clue in the journal, build the habitat it wants, and it'll move in.</p>
```

- [ ] **Step 4: Pass `stirring` to the Journal** in `src/App.tsx`. Find:

```tsx
      <Journal residents={state.residents} />
```

Replace with:

```tsx
      <Journal residents={state.residents} stirring={state.stirring} />
```

- [ ] **Step 5: Run to verify it passes + full suite + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all tests green (incl. the new App test), no type errors, build succeeds.

- [ ] **Step 6: Manual check**

Run `npm run dev`. Confirm: tagline reads the new instructive copy; journal heading shows "0 of 6 discovered"; placing only a Pond makes the Frog's journal card turn amber with a "👀 nearby" badge and "Something stirs nearby…"; adding Tall Grass next to it flips the Frog to a discovered card and the counter increments.

- [ ] **Step 7: Commit**

```bash
git add -A && git -c commit.gpgsign=false commit -m "feat: wire stirring into journal and add instructive tagline"
```

---

## Self-review checklist

- **Spec coverage:** stirring definition → Task 1 (`unmetRequired`, incl. the light-gap test); stirring derivation → Task 2 (`stirring` list, RESET clears it); stirring presentation (tint + copy + badge) → Task 3; discovered counter → Task 3; tutorial tagline → Task 4; non-goal (no "almost 3★" signal) → respected (nothing added there).
- **Placeholder scan:** every step has concrete code/commands. None found.
- **Type consistency:** `unmetRequired: number` defined in Task 1 and consumed by name in Task 2; `stirring: string[]` defined in Task 2 and consumed as the `Journal` prop in Tasks 3–4; `Journal` prop signature `{ residents, stirring }` matches the call site in Task 4.
- **Light-gap correctness:** Task 1's hedgehog test asserts the wrong-light-only case yields `unmetRequired === 1`, matching the spec's headline example.
