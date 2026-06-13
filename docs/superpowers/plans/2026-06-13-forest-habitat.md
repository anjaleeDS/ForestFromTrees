# Forest Habitat Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 prototype of a cozy, fail-state-free habitat game where the player freely places trees/water/plants on a tile grid and animals move in permanently when their needs are met.

**Architecture:** A pure, framework-free engine (grid math, light map, provision fields, seasons, matching, residency reconciliation) sits under a thin React UI. All engine functions are pure and unit-tested against the spec's deterministic fixtures before any UI is built. UI state is a single `useReducer` that calls the engine on every map/season change; "arrival" is a one-shot event derived by diffing the residents set.

**Tech Stack:** Vite + React 18 + TypeScript, Vitest + @testing-library/react for tests, DOM/CSS-grid rendering (no canvas), in-memory state only (no persistence).

**Source specs (read before starting):**
- `docs/superpowers/specs/2026-06-13-forest-habitat-design.md`
- `docs/superpowers/specs/2026-06-13-forest-habitat-phase3-fixtures.md`

---

## Resolved spec ambiguities (apply these — they refine the spec)

1. **Distance is Chebyshev; matching ignores `radius`.** Per the fixtures file: `dist = max(|dx|,|dy|)`. Distance to a multi-tile placeable is the minimum Chebyshev distance to any occupied cell. A need `{type, within}` is met by the nearest source within `within`. The `radius` field is used ONLY by the Phase 2 debug overlay, never by matching.

2. **`minSources` on `Need` (NEW field).** The butterfly's optional "second nectar source = cluster" cannot be expressed by nearest-source matching. Add `minSources?: number` (default 1). A need is met when the count of distinct placements providing a matching type within `within` is `>= minSources`. Butterfly's optional nectar gets `minSources: 2`.

3. **Residency is separate from qualification (one-shot permanence).** The engine produces "who currently qualifies"; a separate `reconcile` step maintains the permanent `residents` list. Once an animal is a resident it never leaves. If a still-resident animal still qualifies, its home tile and stars are refreshed (this is how Fixture 5's songbird goes 2→3). If it no longer qualifies, its last-known home/stars are frozen — never removed.

4. **Seasonal active rules (simplified, no half-states).** `berries` dormant in winter only; `nectar` active spring+summer only; everything else (incl. `nuts`, `insects`) always active. Phase 3 fixtures run with season `'all'` (filtering disabled), matching the fixtures file's "treat all resources active."

5. **Star rounding:** `stars = clamp(1 + round(optionalsSatisfied/optionalsTotal * 2), 1, 3)`, round half up. If an animal has 0 optionals, stars = 1.

6. **Best-home tie-break:** scan tiles row-major (row 0→11, col 0→15); keep the first tile with the maximum optionals-satisfied count. Stars depend only on that max, so they are deterministic; exact home coordinates are never asserted by fixtures (only the `open`/`shade` property in Fixture 4).

---

## File structure

```
package.json, vite.config.ts, tsconfig.json, index.html
src/
  main.tsx                      App entry
  App.tsx                       Top-level layout + state wiring
  engine/
    types.ts                    Core types (Placeable, Animal, Need, Tile, Placement, Resident, MatchResult, Season, Light)
    grid.ts                     COLS/ROWS, placementCells, inBounds, canPlace, placementAtTile
    distance.ts                 chebyshev, occupiedCells, distanceToPlacement
    lightMap.ts                 computeLightMap, lightAt
    seasons.ts                  SEASONS, provisionActive
    provisionField.ts           computeProvisionField (debug overlay only; radius-based)
    matching.ts                 evaluateAnimal, evaluateAll
    reconcile.ts                reconcile (residents + arrivals)
    placeableIndex.ts           buildPlaceableIndex
    __tests__/                  one spec file per engine module + fixtures.test.ts
  config/
    placeables.ts               the 8 placeables + emoji/color
    animals.ts                  the 6 animals + hints + emoji
  state/
    gameReducer.ts              GameState, Action, gameReducer
  components/
    Grid.tsx, Tile.tsx, Palette.tsx, DebugOverlay.tsx,
    ArrivalCard.tsx, Journal.tsx, SeasonControl.tsx
  styles.css
```

---

### Task 0: Scaffold Vite + React + TS + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `vitest.setup.ts`

- [ ] **Step 1: Scaffold with Vite**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
If it refuses because the directory is non-empty, scaffold in a temp dir and copy in:
```bash
npm create vite@latest .vite-tmp -- --template react-ts && \
  cp -r .vite-tmp/. . && rm -rf .vite-tmp
```

- [ ] **Step 2: Install deps**

Run:
```bash
npm install && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Replace `vite.config.ts` with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Add scripts to `package.json` (merge into existing `"scripts"`):
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Smoke test the toolchain**

Create `src/engine/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('toolchain', () => {
  it('runs', () => { expect(1 + 1).toBe(2) })
})
```

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Verify dev server boots**

Run: `npm run dev` (then Ctrl-C). Expected: Vite prints a local URL with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest"
```

---

### Task 1: Core types and config data

**Files:**
- Create: `src/engine/types.ts`, `src/config/placeables.ts`, `src/config/animals.ts`, `src/engine/placeableIndex.ts`
- Test: `src/engine/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

`src/engine/__tests__/config.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PLACEABLES } from '../../config/placeables'
import { ANIMALS } from '../../config/animals'
import { buildPlaceableIndex } from '../placeableIndex'

describe('config', () => {
  it('ships exactly 8 placeables and 6 animals', () => {
    expect(PLACEABLES).toHaveLength(8)
    expect(ANIMALS).toHaveLength(6)
  })
  it('every animal need type is provided by some placeable', () => {
    const provided = new Set(PLACEABLES.flatMap(p => p.provides.map(pr => pr.type)))
    for (const a of ANIMALS) {
      for (const n of a.needs) {
        const types = [n.type, ...(n.satisfiedBy ?? [])]
        expect(types.some(t => provided.has(t))).toBe(true)
      }
    }
  })
  it('builds an index keyed by id', () => {
    const idx = buildPlaceableIndex(PLACEABLES)
    expect(idx.oak.footprint).toBe(2)
    expect(idx.oak.canopy).toBe(true)
    expect(idx.berry.canopy).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- config`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write `src/engine/types.ts`**

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Light = 'open' | 'shade'
export type AnimalLight = Light | 'any'

export type ProvisionType =
  | 'water' | 'nest_high' | 'shelter_ground' | 'berries' | 'nuts'
  | 'nectar' | 'insects' | 'seeds' | 'cover_low' | 'bask'

export interface Provision {
  type: ProvisionType
  value: number   // default 1; quality, unused by v1 matching
  radius: number  // overlay reach only; NOT used by matching
}

export interface Placeable {
  id: string
  name: string
  footprint: number   // 1 => 1x1, 2 => 2x2
  canopy: boolean
  provides: Provision[]
  emoji: string
  color: string       // tile background when placed
}

export interface Need {
  type: ProvisionType
  within: number
  required: boolean
  satisfiedBy?: ProvisionType[]
  minSources?: number  // default 1; e.g. butterfly nectar cluster = 2
}

export interface Animal {
  id: string
  name: string
  species: string
  personality: string
  hint: string         // journal locked-entry hint (flavor, no mechanics)
  light: AnimalLight
  needs: Need[]
  emoji: string
}

export interface Tile { col: number; row: number }

export interface Placement {
  id: string           // unique instance id
  placeableId: string  // -> Placeable.id
  anchor: Tile         // top-left cell
}

export interface MatchResult {
  animalId: string
  qualifies: boolean
  homeTile: Tile | null
  homeLight: Light | null
  stars: number              // 0 if not qualifying
  optionalsSatisfied: number
  optionalsTotal: number
}

export interface Resident {
  animalId: string
  homeTile: Tile
  homeLight: Light
  stars: number
}

export type PlaceableIndex = Record<string, Placeable>
```

- [ ] **Step 4: Write `src/engine/placeableIndex.ts`**

```ts
import type { Placeable, PlaceableIndex } from './types'

export function buildPlaceableIndex(placeables: Placeable[]): PlaceableIndex {
  const idx: PlaceableIndex = {}
  for (const p of placeables) idx[p.id] = p
  return idx
}
```

- [ ] **Step 5: Write `src/config/placeables.ts`**

```ts
import type { Placeable } from '../engine/types'

export const PLACEABLES: Placeable[] = [
  { id: 'oak', name: 'Oak Tree', footprint: 2, canopy: true, emoji: '🌳', color: '#3f6f3f',
    provides: [
      { type: 'nest_high', value: 1, radius: 0 },
      { type: 'nuts', value: 1, radius: 3 },
      { type: 'insects', value: 1, radius: 2 },
    ] },
  { id: 'pine', name: 'Pine Tree', footprint: 2, canopy: true, emoji: '🌲', color: '#2f5d4a',
    provides: [
      { type: 'nest_high', value: 1, radius: 0 },
      { type: 'seeds', value: 1, radius: 3 },
      { type: 'shelter_ground', value: 1, radius: 1 },
    ] },
  { id: 'berry', name: 'Berry Bush', footprint: 1, canopy: false, emoji: '🫐', color: '#6b4a7a',
    provides: [
      { type: 'berries', value: 1, radius: 2 },
      { type: 'cover_low', value: 1, radius: 1 },
    ] },
  { id: 'pond', name: 'Pond', footprint: 2, canopy: false, emoji: '💧', color: '#3b6ea5',
    provides: [
      { type: 'water', value: 1, radius: 4 },
      { type: 'insects', value: 1, radius: 3 },
    ] },
  { id: 'wildflowers', name: 'Wildflowers', footprint: 1, canopy: false, emoji: '🌼', color: '#caa83a',
    provides: [
      { type: 'nectar', value: 1, radius: 2 },
      { type: 'cover_low', value: 1, radius: 1 },
    ] },
  { id: 'log', name: 'Fallen Log', footprint: 1, canopy: false, emoji: '🪵', color: '#6e4d33',
    provides: [
      { type: 'shelter_ground', value: 1, radius: 1 },
      { type: 'insects', value: 1, radius: 2 },
    ] },
  { id: 'grass', name: 'Tall Grass', footprint: 1, canopy: false, emoji: '🌾', color: '#7a8a3a',
    provides: [
      { type: 'cover_low', value: 1, radius: 1 },
      { type: 'seeds', value: 1, radius: 2 },
      { type: 'shelter_ground', value: 1, radius: 0 },
    ] },
  { id: 'rocks', name: 'Rock Pile', footprint: 1, canopy: false, emoji: '🪨', color: '#8a8a8a',
    provides: [
      { type: 'bask', value: 1, radius: 1 },
      { type: 'shelter_ground', value: 1, radius: 1 },
    ] },
]
```

- [ ] **Step 6: Write `src/config/animals.ts`**

```ts
import type { Animal } from '../engine/types'

export const ANIMALS: Animal[] = [
  { id: 'pip', name: 'Pip', species: 'Songbird', light: 'any', emoji: '🐦',
    personality: "Sings before you've had coffee.",
    hint: 'Nests high, never far from a drink.',
    needs: [
      { type: 'nest_high', within: 1, required: true },
      { type: 'water', within: 4, required: true },
      { type: 'berries', within: 4, required: false },
      { type: 'insects', within: 3, required: false },
    ] },
  { id: 'quill', name: 'Quill', species: 'Hedgehog', light: 'shade', emoji: '🦔',
    personality: 'Grumpy, fond of dusk, secretly soft.',
    hint: 'Rustles in the shadows, close to the ground.',
    needs: [
      { type: 'shelter_ground', within: 1, required: true },
      { type: 'insects', within: 3, required: true },
      { type: 'cover_low', within: 2, required: false },
    ] },
  { id: 'acorn', name: 'Acorn', species: 'Squirrel', light: 'shade', emoji: '🐿️',
    personality: 'Has buried more than it will ever find.',
    hint: 'Wants a tall tree and something to hoard.',
    needs: [
      { type: 'nest_high', within: 1, required: true },
      { type: 'nuts', within: 4, required: true },
      { type: 'seeds', within: 4, required: false },
    ] },
  { id: 'ribbit', name: 'Ribbit', species: 'Frog', light: 'any', emoji: '🐸',
    personality: 'Communicates exclusively in vibes.',
    hint: 'Heard near still water.',
    needs: [
      { type: 'water', within: 1, required: true },
      { type: 'cover_low', within: 2, required: true },
      { type: 'insects', within: 3, required: false },
    ] },
  { id: 'flit', name: 'Flit', species: 'Butterfly', light: 'open', emoji: '🦋',
    personality: 'Indecisive about flowers, committed to sunshine.',
    hint: 'Follows the sun and the flowers.',
    needs: [
      { type: 'nectar', within: 2, required: true },
      { type: 'nectar', within: 4, required: false, minSources: 2 },
      { type: 'bask', within: 4, required: false },
    ] },
  { id: 'clover', name: 'Clover', species: 'Rabbit', light: 'open', emoji: '🐰',
    personality: 'Always mid-snack. No notes.',
    hint: 'Likes low cover and an easy snack.',
    needs: [
      { type: 'cover_low', within: 2, required: true },
      { type: 'seeds', within: 4, required: true, satisfiedBy: ['berries'] },
      { type: 'berries', within: 4, required: false },
      { type: 'nectar', within: 4, required: false },
    ] },
]
```

- [ ] **Step 7: Run tests**

Run: `npm test -- config`
Expected: PASS (3 tests). Also run `npm run typecheck` — expect no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: core engine types and 8-placeable / 6-animal config"
```

---

### Task 2: Grid math, distance, and placement validity

**Files:**
- Create: `src/engine/distance.ts`, `src/engine/grid.ts`
- Test: `src/engine/__tests__/distance.test.ts`, `src/engine/__tests__/grid.test.ts`

- [ ] **Step 1: Write the failing distance test**

`src/engine/__tests__/distance.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { chebyshev, occupiedCells, distanceToPlacement } from '../distance'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'

const idx = buildPlaceableIndex(PLACEABLES)

describe('distance', () => {
  it('chebyshev is king-move distance', () => {
    expect(chebyshev({ col: 0, row: 0 }, { col: 3, row: 1 })).toBe(3)
    expect(chebyshev({ col: 2, row: 2 }, { col: 2, row: 2 })).toBe(0)
  })
  it('occupiedCells covers a 2x2 footprint', () => {
    const cells = occupiedCells({ id: 'p', placeableId: 'oak', anchor: { col: 8, row: 5 } }, 2)
    expect(cells).toEqual([
      { col: 8, row: 5 }, { col: 9, row: 5 }, { col: 8, row: 6 }, { col: 9, row: 6 },
    ])
  })
  it('distanceToPlacement is min Chebyshev to any occupied cell', () => {
    const pond = { id: 'p', placeableId: 'pond', anchor: { col: 12, row: 5 } }
    // home (10,5): nearest pond cell is (12,5) => dist 2
    expect(distanceToPlacement({ col: 10, row: 5 }, pond, idx.pond.footprint)).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- distance`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/distance.ts`**

```ts
import type { Placement, Tile } from './types'

export function chebyshev(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
}

export function occupiedCells(p: Placement, footprint: number): Tile[] {
  const cells: Tile[] = []
  for (let dr = 0; dr < footprint; dr++) {
    for (let dc = 0; dc < footprint; dc++) {
      cells.push({ col: p.anchor.col + dc, row: p.anchor.row + dr })
    }
  }
  return cells
}

export function distanceToPlacement(home: Tile, p: Placement, footprint: number): number {
  let min = Infinity
  for (const cell of occupiedCells(p, footprint)) {
    const d = chebyshev(home, cell)
    if (d < min) min = d
  }
  return min
}
```

- [ ] **Step 4: Run distance test**

Run: `npm test -- distance`
Expected: PASS.

- [ ] **Step 5: Write the failing grid test**

`src/engine/__tests__/grid.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { COLS, ROWS, placementCells, inBounds, canPlace, placementAtTile } from '../grid'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)

describe('grid', () => {
  it('has 16x12 dimensions', () => {
    expect(COLS).toBe(16)
    expect(ROWS).toBe(12)
  })
  it('placementCells respects footprint', () => {
    expect(placementCells('oak', { col: 0, row: 0 }, idx)).toHaveLength(4)
    expect(placementCells('berry', { col: 0, row: 0 }, idx)).toHaveLength(1)
  })
  it('inBounds rejects off-grid cells', () => {
    expect(inBounds({ col: 0, row: 0 })).toBe(true)
    expect(inBounds({ col: 15, row: 11 })).toBe(true)
    expect(inBounds({ col: 16, row: 0 })).toBe(false)
    expect(inBounds({ col: 0, row: -1 })).toBe(false)
  })
  it('canPlace blocks out-of-bounds 2x2 at edge', () => {
    expect(canPlace([], idx, 'oak', { col: 15, row: 11 })).toBe(false)
    expect(canPlace([], idx, 'oak', { col: 14, row: 10 })).toBe(true)
  })
  it('canPlace blocks overlaps', () => {
    const existing: Placement[] = [{ id: 'a', placeableId: 'oak', anchor: { col: 5, row: 5 } }]
    expect(canPlace(existing, idx, 'berry', { col: 6, row: 6 })).toBe(false) // inside oak
    expect(canPlace(existing, idx, 'berry', { col: 7, row: 5 })).toBe(true)  // clear
  })
  it('placementAtTile finds the placement occupying a cell', () => {
    const existing: Placement[] = [{ id: 'a', placeableId: 'oak', anchor: { col: 5, row: 5 } }]
    expect(placementAtTile(existing, idx, { col: 6, row: 6 })?.id).toBe('a')
    expect(placementAtTile(existing, idx, { col: 0, row: 0 })).toBeUndefined()
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- grid`
Expected: FAIL — module not found.

- [ ] **Step 7: Write `src/engine/grid.ts`**

```ts
import type { PlaceableIndex, Placement, Tile } from './types'
import { occupiedCells } from './distance'

export const COLS = 16
export const ROWS = 12

export function inBounds(tile: Tile): boolean {
  return tile.col >= 0 && tile.col < COLS && tile.row >= 0 && tile.row < ROWS
}

export function placementCells(placeableId: string, anchor: Tile, idx: PlaceableIndex): Tile[] {
  const footprint = idx[placeableId].footprint
  return occupiedCells({ id: '_', placeableId, anchor }, footprint)
}

export function canPlace(
  placements: Placement[], idx: PlaceableIndex, placeableId: string, anchor: Tile,
): boolean {
  const cells = placementCells(placeableId, anchor, idx)
  if (!cells.every(inBounds)) return false
  const occupied = new Set(
    placements.flatMap(p => occupiedCells(p, idx[p.placeableId].footprint))
      .map(c => `${c.col},${c.row}`),
  )
  return cells.every(c => !occupied.has(`${c.col},${c.row}`))
}

export function placementAtTile(
  placements: Placement[], idx: PlaceableIndex, tile: Tile,
): Placement | undefined {
  return placements.find(p =>
    occupiedCells(p, idx[p.placeableId].footprint)
      .some(c => c.col === tile.col && c.row === tile.row),
  )
}
```

- [ ] **Step 8: Run grid test + typecheck**

Run: `npm test -- grid && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: grid dimensions, Chebyshev distance, placement validity"
```

---

### Task 3: Light map

**Files:**
- Create: `src/engine/lightMap.ts`
- Test: `src/engine/__tests__/lightMap.test.ts`

- [ ] **Step 1: Write the failing test**

`src/engine/__tests__/lightMap.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeLightMap, lightAt } from '../lightMap'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)

describe('lightMap', () => {
  it('empty map is all open', () => {
    const m = computeLightMap([], idx)
    expect(lightAt(m, { col: 0, row: 0 })).toBe('open')
    expect(lightAt(m, { col: 15, row: 11 })).toBe('open')
  })
  it('a 2x2 oak shades the 4x4 block around its footprint', () => {
    // oak at (8,5) occupies (8,5),(9,5),(8,6),(9,6); shade = cols 7..10, rows 4..7
    const placements: Placement[] = [{ id: 'o', placeableId: 'oak', anchor: { col: 8, row: 5 } }]
    const m = computeLightMap(placements, idx)
    expect(lightAt(m, { col: 7, row: 4 })).toBe('shade') // corner of block
    expect(lightAt(m, { col: 10, row: 7 })).toBe('shade') // opposite corner
    expect(lightAt(m, { col: 8, row: 5 })).toBe('shade') // under canopy
    expect(lightAt(m, { col: 11, row: 5 })).toBe('open')  // just outside
    expect(lightAt(m, { col: 6, row: 5 })).toBe('open')   // just outside
  })
  it('non-canopy placeables cast no shade', () => {
    const placements: Placement[] = [{ id: 'p', placeableId: 'pond', anchor: { col: 2, row: 2 } }]
    const m = computeLightMap(placements, idx)
    expect(lightAt(m, { col: 2, row: 2 })).toBe('open')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lightMap`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/lightMap.ts`**

```ts
import type { Light, PlaceableIndex, Placement, Tile } from './types'
import { COLS, ROWS, inBounds } from './grid'
import { occupiedCells } from './distance'

export type LightMap = Light[][] // [row][col]

export function computeLightMap(placements: Placement[], idx: PlaceableIndex): LightMap {
  const map: LightMap = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 'open' as Light))
  for (const p of placements) {
    const def = idx[p.placeableId]
    if (!def.canopy) continue
    for (const cell of occupiedCells(p, def.footprint)) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const t: Tile = { col: cell.col + dc, row: cell.row + dr }
          if (inBounds(t)) map[t.row][t.col] = 'shade'
        }
      }
    }
  }
  return map
}

export function lightAt(map: LightMap, tile: Tile): Light {
  return map[tile.row][tile.col]
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npm test -- lightMap && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ambient light map (canopy shade rule)"
```

---

### Task 4: Seasons

**Files:**
- Create: `src/engine/seasons.ts`
- Test: `src/engine/__tests__/seasons.test.ts`

- [ ] **Step 1: Write the failing test**

`src/engine/__tests__/seasons.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { SEASONS, provisionActive } from '../seasons'

describe('seasons', () => {
  it('cycles four seasons', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter'])
  })
  it("'all' enables every provision", () => {
    expect(provisionActive('berries', 'all')).toBe(true)
    expect(provisionActive('nectar', 'all')).toBe(true)
  })
  it('berries dormant only in winter', () => {
    expect(provisionActive('berries', 'spring')).toBe(true)
    expect(provisionActive('berries', 'autumn')).toBe(true)
    expect(provisionActive('berries', 'winter')).toBe(false)
  })
  it('nectar active only spring and summer', () => {
    expect(provisionActive('nectar', 'spring')).toBe(true)
    expect(provisionActive('nectar', 'summer')).toBe(true)
    expect(provisionActive('nectar', 'autumn')).toBe(false)
    expect(provisionActive('nectar', 'winter')).toBe(false)
  })
  it('water and nest_high always active', () => {
    expect(provisionActive('water', 'winter')).toBe(true)
    expect(provisionActive('nest_high', 'winter')).toBe(true)
    expect(provisionActive('nuts', 'winter')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- seasons`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/seasons.ts`**

```ts
import type { ProvisionType, Season } from './types'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// 'all' disables seasonal filtering (used by Phase 3 fixtures and the overlay).
export function provisionActive(type: ProvisionType, season: Season | 'all'): boolean {
  if (season === 'all') return true
  if (type === 'berries') return season !== 'winter'
  if (type === 'nectar') return season === 'spring' || season === 'summer'
  return true // water, nest_high, shelter_ground, nuts, insects, seeds, cover_low, bask
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- seasons`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seasonal provision activation rules"
```

---

### Task 5: Provision field (debug overlay source)

**Files:**
- Create: `src/engine/provisionField.ts`
- Test: `src/engine/__tests__/provisionField.test.ts`

This is the ONLY consumer of `Provision.radius`. Matching does not use it.

- [ ] **Step 1: Write the failing test**

`src/engine/__tests__/provisionField.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeProvisionField } from '../provisionField'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)

describe('provisionField', () => {
  it('pond water reaches 4 tiles out (Chebyshev) from its footprint', () => {
    const placements: Placement[] = [{ id: 'p', placeableId: 'pond', anchor: { col: 5, row: 5 } }]
    // pond occupies (5,5),(6,5),(5,6),(6,6); radius 4
    const field = computeProvisionField(placements, idx, 'water', 'all')
    expect(field[5][9]).toBe(true)   // (col 9,row 5): dist 3 from (6,5) -> within 4
    expect(field[5][10]).toBe(true)  // dist 4 -> within
    expect(field[5][11]).toBe(false) // dist 5 -> outside
  })
  it('respects seasonal dormancy', () => {
    const placements: Placement[] = [{ id: 'b', placeableId: 'berry', anchor: { col: 5, row: 5 } }]
    const summer = computeProvisionField(placements, idx, 'berries', 'summer')
    const winter = computeProvisionField(placements, idx, 'berries', 'winter')
    expect(summer[5][5]).toBe(true)
    expect(winter[5][5]).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- provisionField`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/provisionField.ts`**

```ts
import type { PlaceableIndex, Placement, ProvisionType, Season, Tile } from './types'
import { COLS, ROWS, inBounds } from './grid'
import { chebyshev, occupiedCells } from './distance'
import { provisionActive } from './seasons'

export function computeProvisionField(
  placements: Placement[], idx: PlaceableIndex,
  type: ProvisionType, season: Season | 'all',
): boolean[][] {
  const field: boolean[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => false))
  if (!provisionActive(type, season)) return field
  for (const p of placements) {
    const def = idx[p.placeableId]
    for (const prov of def.provides) {
      if (prov.type !== type) continue
      const cells = occupiedCells(p, def.footprint)
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const t: Tile = { col, row }
          if (!inBounds(t)) continue
          if (cells.some(c => chebyshev(t, c) <= prov.radius)) field[row][col] = true
        }
      }
    }
  }
  return field
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- provisionField`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: provision field computation for debug overlay (radius-based)"
```

---

### Task 6: Matching engine + ALL Phase 3 fixtures

This is the core. Build `evaluateAnimal`/`evaluateAll`, then encode every fixture from `2026-06-13-forest-habitat-phase3-fixtures.md` as a test. Matching uses `within` only (never `radius`), Chebyshev distance, `minSources`, `satisfiedBy`, and the star formula.

**Files:**
- Create: `src/engine/matching.ts`
- Test: `src/engine/__tests__/matching.test.ts`, `src/engine/__tests__/fixtures.test.ts`

- [ ] **Step 1: Write the failing unit test**

`src/engine/__tests__/matching.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../matching'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import { ANIMALS } from '../../config/animals'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)
const place = (placeableId: string, col: number, row: number, id = `${placeableId}-${col}-${row}`): Placement =>
  ({ id, placeableId, anchor: { col, row } })

describe('matching basics', () => {
  it('empty map: nobody qualifies', () => {
    const r = evaluateAll(ANIMALS, [], idx, 'all')
    for (const a of ANIMALS) expect(r.get(a.id)!.qualifies).toBe(false)
  })
  it('butterfly needs two distinct nectar sources for its cluster optional', () => {
    const one = evaluateAll(ANIMALS, [place('wildflowers', 3, 3)], idx, 'all').get('flit')!
    expect(one.qualifies).toBe(true)        // required nectar w2 met by one source
    expect(one.optionalsSatisfied).toBe(0)  // no second nectar source, no bask
    const two = evaluateAll(ANIMALS, [place('wildflowers', 3, 3), place('wildflowers', 4, 3)], idx, 'all').get('flit')!
    expect(two.optionalsSatisfied).toBe(1)  // cluster optional now met
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- matching`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/matching.ts`**

```ts
import type {
  Animal, Light, MatchResult, Need, PlaceableIndex, Placement, Season, Tile,
} from './types'
import { COLS, ROWS } from './grid'
import { distanceToPlacement } from './distance'
import { computeLightMap, lightAt, type LightMap } from './lightMap'
import { provisionActive } from './seasons'

function countSources(
  home: Tile, need: Need, placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): number {
  const types = new Set([need.type, ...(need.satisfiedBy ?? [])])
  let count = 0
  for (const p of placements) {
    const def = idx[p.placeableId]
    const provides = def.provides.some(pr => types.has(pr.type) && provisionActive(pr.type, season))
    if (!provides) continue
    if (distanceToPlacement(home, p, def.footprint) <= need.within) count++
  }
  return count
}

function needMet(
  home: Tile, need: Need, placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): boolean {
  return countSources(home, need, placements, idx, season) >= (need.minSources ?? 1)
}

function clampStars(ratio: number): number {
  return Math.min(3, Math.max(1, 1 + Math.round(ratio * 2)))
}

export function evaluateAnimal(
  animal: Animal, placements: Placement[], idx: PlaceableIndex,
  lightMap: LightMap, season: Season | 'all',
): MatchResult {
  const required = animal.needs.filter(n => n.required)
  const optional = animal.needs.filter(n => !n.required)
  let best: { tile: Tile; light: Light; opt: number } | null = null

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const home: Tile = { col, row }
      const light = lightAt(lightMap, home)
      if (animal.light !== 'any' && animal.light !== light) continue
      if (!required.every(n => needMet(home, n, placements, idx, season))) continue
      const opt = optional.filter(n => needMet(home, n, placements, idx, season)).length
      if (best === null || opt > best.opt) best = { tile: home, light, opt }
    }
  }

  if (!best) {
    return {
      animalId: animal.id, qualifies: false, homeTile: null, homeLight: null,
      stars: 0, optionalsSatisfied: 0, optionalsTotal: optional.length,
    }
  }
  const ratio = optional.length === 0 ? 0 : best.opt / optional.length
  return {
    animalId: animal.id, qualifies: true, homeTile: best.tile, homeLight: best.light,
    stars: clampStars(ratio), optionalsSatisfied: best.opt, optionalsTotal: optional.length,
  }
}

export function evaluateAll(
  animals: Animal[], placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): Map<string, MatchResult> {
  const lightMap = computeLightMap(placements, idx)
  const out = new Map<string, MatchResult>()
  for (const a of animals) out.set(a.id, evaluateAnimal(a, placements, idx, lightMap, season))
  return out
}
```

- [ ] **Step 4: Run unit test**

Run: `npm test -- matching`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the fixtures test (all 6 fixtures)**

`src/engine/__tests__/fixtures.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../matching'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import { ANIMALS } from '../../config/animals'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)
let seq = 0
const place = (placeableId: string, col: number, row: number): Placement =>
  ({ id: `f${seq++}`, placeableId, anchor: { col, row } })

// helper: assert a full expected table { animalId: stars|false }
function expectArrivals(placements: Placement[], table: Record<string, number | false>) {
  const r = evaluateAll(ANIMALS, placements, idx, 'all')
  for (const a of ANIMALS) {
    const res = r.get(a.id)!
    const exp = table[a.id]
    if (exp === false) {
      expect(res.qualifies, `${a.id} should NOT qualify`).toBe(false)
    } else {
      expect(res.qualifies, `${a.id} should qualify`).toBe(true)
      expect(res.stars, `${a.id} stars`).toBe(exp)
    }
  }
}

describe('Fixture 1 — empty map', () => {
  it('no arrivals', () => {
    expectArrivals([], { pip: false, quill: false, acorn: false, ribbit: false, flit: false, clover: false })
  })
})

describe('Fixture 2 — one pond, one grass', () => {
  it('frog 3, rabbit 1, rest none', () => {
    expectArrivals([place('pond', 2, 2), place('grass', 4, 3)], {
      ribbit: 3, clover: 1, pip: false, acorn: false, flit: false, quill: false,
    })
  })
})

describe('Fixture 3 — oak plus pond', () => {
  it('songbird 2, squirrel 1, rest none', () => {
    expectArrivals([place('oak', 8, 5), place('pond', 12, 5)], {
      pip: 2, acorn: 1, ribbit: false, clover: false, flit: false, quill: false,
    })
  })
})

describe('Fixture 4 — two zones', () => {
  const placements = [
    place('wildflowers', 3, 3), place('wildflowers', 4, 3),
    place('rocks', 5, 3), place('oak', 10, 5),
  ]
  it('butterfly 3, squirrel 1, rabbit none, rest none', () => {
    expectArrivals(placements, {
      flit: 3, acorn: 1, clover: false, ribbit: false, pip: false, quill: false,
    })
  })
  it('butterfly home is open, squirrel home is shade, never the same tile', () => {
    const r = evaluateAll(ANIMALS, placements, idx, 'all')
    const fl = r.get('flit')!, sq = r.get('acorn')!
    expect(fl.homeLight).toBe('open')
    expect(sq.homeLight).toBe('shade')
    expect(fl.homeTile).not.toEqual(sq.homeTile)
  })
})

describe('Fixture 5 — contentment increment', () => {
  const before = [place('oak', 5, 5), place('pond', 8, 5)]
  it('5a before: songbird 2, squirrel 1', () => {
    const r = evaluateAll(ANIMALS, before, idx, 'all')
    expect(r.get('pip')!.stars).toBe(2)
    expect(r.get('acorn')!.stars).toBe(1)
  })
  it('5b after adding berry(7,5): songbird 3, squirrel 1, frog 3, rabbit 2', () => {
    expectArrivals([...before, place('berry', 7, 5)], {
      pip: 3, acorn: 1, ribbit: 3, clover: 2, flit: false, quill: false,
    })
  })
})

describe('Fixture 6 — hedgehog', () => {
  it('hedgehog 1, squirrel 1, rest none', () => {
    expectArrivals([place('oak', 6, 4), place('log', 8, 6)], {
      quill: 1, acorn: 1, pip: false, ribbit: false, flit: false, clover: false,
    })
  })
})
```

- [ ] **Step 6: Run the fixtures**

Run: `npm test -- fixtures`
Expected: ALL PASS. If any fixture disagrees, re-read the rule clarifications in the fixtures spec before assuming the fixture is wrong — but the engine is what must conform. Debug `evaluateAnimal` (do not edit fixtures to match a buggy engine).

- [ ] **Step 7: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: matching engine passing all Phase 3 acceptance fixtures"
```

---

### Task 7: Residency reconciliation (one-shot permanence + arrivals)

**Files:**
- Create: `src/engine/reconcile.ts`
- Test: `src/engine/__tests__/reconcile.test.ts`

- [ ] **Step 1: Write the failing test**

`src/engine/__tests__/reconcile.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reconcile } from '../reconcile'
import type { MatchResult, Resident } from '../types'

const result = (animalId: string, qualifies: boolean, stars = 0, col = 0, row = 0): MatchResult => ({
  animalId, qualifies, stars,
  homeTile: qualifies ? { col, row } : null,
  homeLight: qualifies ? 'open' : null,
  optionalsSatisfied: 0, optionalsTotal: 0,
})
const results = (...rs: MatchResult[]) => new Map(rs.map(r => [r.animalId, r]))

describe('reconcile', () => {
  it('new qualifier becomes a resident and an arrival', () => {
    const { residents, arrivals } = reconcile([], results(result('pip', true, 2)))
    expect(arrivals).toEqual(['pip'])
    expect(residents).toHaveLength(1)
    expect(residents[0].stars).toBe(2)
  })
  it('non-qualifier does not arrive', () => {
    const { residents, arrivals } = reconcile([], results(result('pip', false)))
    expect(arrivals).toEqual([])
    expect(residents).toHaveLength(0)
  })
  it('existing resident that still qualifies has stars refreshed (2 -> 3) and no re-arrival', () => {
    const prev: Resident[] = [{ animalId: 'pip', homeTile: { col: 1, row: 1 }, homeLight: 'open', stars: 2 }]
    const { residents, arrivals } = reconcile(prev, results(result('pip', true, 3, 2, 2)))
    expect(arrivals).toEqual([])
    expect(residents[0].stars).toBe(3)
    expect(residents[0].homeTile).toEqual({ col: 2, row: 2 })
  })
  it('existing resident that no longer qualifies is frozen, never removed', () => {
    const prev: Resident[] = [{ animalId: 'pip', homeTile: { col: 1, row: 1 }, homeLight: 'open', stars: 3 }]
    const { residents, arrivals } = reconcile(prev, results(result('pip', false)))
    expect(arrivals).toEqual([])
    expect(residents).toHaveLength(1)
    expect(residents[0].stars).toBe(3) // frozen
    expect(residents[0].homeTile).toEqual({ col: 1, row: 1 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- reconcile`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/engine/reconcile.ts`**

```ts
import type { MatchResult, Resident } from './types'

export interface ReconcileOutput {
  residents: Resident[]
  arrivals: string[] // animalIds that newly arrived this reconcile
}

export function reconcile(
  prev: Resident[], results: Map<string, MatchResult>,
): ReconcileOutput {
  const map = new Map<string, Resident>(prev.map(r => [r.animalId, { ...r }]))
  const arrivals: string[] = []

  for (const [animalId, res] of results) {
    const existing = map.get(animalId)
    if (existing) {
      if (res.qualifies) {
        existing.homeTile = res.homeTile!
        existing.homeLight = res.homeLight!
        existing.stars = res.stars
      }
      // no longer qualifies -> freeze last-known values (never remove)
    } else if (res.qualifies) {
      map.set(animalId, {
        animalId, homeTile: res.homeTile!, homeLight: res.homeLight!, stars: res.stars,
      })
      arrivals.push(animalId)
    }
  }
  return { residents: Array.from(map.values()), arrivals }
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npm test -- reconcile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: residency reconciliation with one-shot permanence and arrival diffing"
```

---

### Task 8: Game state reducer

**Files:**
- Create: `src/state/gameReducer.ts`
- Test: `src/state/__tests__/gameReducer.test.ts`

- [ ] **Step 1: Write the failing test**

`src/state/__tests__/gameReducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from '../gameReducer'

describe('gameReducer', () => {
  it('PLACE adds a placement and triggers arrivals', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    expect(s.placements).toHaveLength(2)
    const ids = s.residents.map(r => r.animalId).sort()
    expect(ids).toEqual(['clover', 'ribbit']) // frog + rabbit (Fixture 2)
    expect(s.lastArrivals).toContain('ribbit')
  })
  it('PLACE on an occupied/out-of-bounds tile is a no-op', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'oak', anchor: { col: 5, row: 5 } })
    const before = s.placements.length
    s = gameReducer(s, { type: 'PLACE', placeableId: 'berry', anchor: { col: 6, row: 6 } }) // inside oak
    expect(s.placements).toHaveLength(before)
  })
  it('ERASE removes the placement under a tile but residents stay (permanence)', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    s = gameReducer(s, { type: 'ERASE', tile: { col: 4, row: 3 } })
    expect(s.placements).toHaveLength(1)
    expect(s.residents.map(r => r.animalId)).toContain('clover') // rabbit stays
  })
  it('SET_SEASON re-evaluates; winter does not evict existing residents', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    const count = s.residents.length
    s = gameReducer(s, { type: 'SET_SEASON', season: 'winter' })
    expect(s.residents.length).toBeGreaterThanOrEqual(count) // never fewer
  })
  it('DISMISS_ARRIVAL clears one pending card', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    const first = s.lastArrivals[0]
    s = gameReducer(s, { type: 'DISMISS_ARRIVAL', animalId: first })
    expect(s.lastArrivals).not.toContain(first)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- gameReducer`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/state/gameReducer.ts`**

```ts
import type { Placement, ProvisionType, Resident, Season, Tile } from '../engine/types'
import { PLACEABLES } from '../config/placeables'
import { ANIMALS } from '../config/animals'
import { buildPlaceableIndex } from '../engine/placeableIndex'
import { canPlace, placementAtTile } from '../engine/grid'
import { evaluateAll } from '../engine/matching'
import { reconcile } from '../engine/reconcile'

const IDX = buildPlaceableIndex(PLACEABLES)

export interface GameState {
  placements: Placement[]
  season: Season
  residents: Resident[]
  lastArrivals: string[]   // animalIds with an undismissed arrival card
  nextId: number
  debug: { show: boolean; provisionType: ProvisionType }
}

export type Action =
  | { type: 'PLACE'; placeableId: string; anchor: Tile }
  | { type: 'ERASE'; tile: Tile }
  | { type: 'SET_SEASON'; season: Season }
  | { type: 'DISMISS_ARRIVAL'; animalId: string }
  | { type: 'TOGGLE_DEBUG' }
  | { type: 'SET_DEBUG_PROVISION'; provisionType: ProvisionType }
  | { type: 'RESET' }

export function initialState(): GameState {
  return {
    placements: [], season: 'spring', residents: [], lastArrivals: [], nextId: 1,
    debug: { show: false, provisionType: 'water' },
  }
}

// Re-run matching after any map/season change and fold in new arrivals.
function recompute(state: GameState, placements: Placement[], season: Season): GameState {
  const results = evaluateAll(ANIMALS, placements, IDX, season)
  const { residents, arrivals } = reconcile(state.residents, results)
  return {
    ...state, placements, season, residents,
    lastArrivals: [...state.lastArrivals, ...arrivals],
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PLACE': {
      if (!canPlace(state.placements, IDX, action.placeableId, action.anchor)) return state
      const placement: Placement = {
        id: `pl-${state.nextId}`, placeableId: action.placeableId, anchor: action.anchor,
      }
      return recompute(
        { ...state, nextId: state.nextId + 1 },
        [...state.placements, placement], state.season,
      )
    }
    case 'ERASE': {
      const target = placementAtTile(state.placements, IDX, action.tile)
      if (!target) return state
      return recompute(state, state.placements.filter(p => p.id !== target.id), state.season)
    }
    case 'SET_SEASON':
      return recompute(state, state.placements, action.season)
    case 'DISMISS_ARRIVAL':
      return { ...state, lastArrivals: state.lastArrivals.filter(id => id !== action.animalId) }
    case 'TOGGLE_DEBUG':
      return { ...state, debug: { ...state.debug, show: !state.debug.show } }
    case 'SET_DEBUG_PROVISION':
      return { ...state, debug: { ...state.debug, provisionType: action.provisionType } }
    case 'RESET':
      return initialState()
    default:
      return state
  }
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npm test -- gameReducer && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: game state reducer wiring engine to place/erase/season actions"
```

---

### Task 9: Grid, Tile, and Palette UI (Phase 1 placement)

**Files:**
- Create: `src/components/Tile.tsx`, `src/components/Grid.tsx`, `src/components/Palette.tsx`, `src/styles.css` (append)
- Test: `src/components/__tests__/Palette.test.tsx`

- [ ] **Step 1: Write the failing Palette test**

`src/components/__tests__/Palette.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Palette } from '../Palette'

describe('Palette', () => {
  it('lists all 8 placeables plus an erase tool and selects one', () => {
    const onSelect = vi.fn()
    render(<Palette selected="oak" tool="place" onSelect={onSelect} onErase={() => {}} />)
    expect(screen.getAllByRole('button').length).toBe(9) // 8 + erase
    fireEvent.click(screen.getByRole('button', { name: /Pond/i }))
    expect(onSelect).toHaveBeenCalledWith('pond')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- Palette`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/Palette.tsx`**

```tsx
import { PLACEABLES } from '../config/placeables'

interface Props {
  selected: string
  tool: 'place' | 'erase'
  onSelect: (placeableId: string) => void
  onErase: () => void
}

export function Palette({ selected, tool, onSelect, onErase }: Props) {
  return (
    <div className="palette">
      {PLACEABLES.map(p => (
        <button
          key={p.id}
          className={tool === 'place' && selected === p.id ? 'palette-item selected' : 'palette-item'}
          onClick={() => onSelect(p.id)}
          title={p.name}
        >
          <span className="palette-emoji">{p.emoji}</span>
          <span className="palette-label">{p.name}</span>
        </button>
      ))}
      <button
        className={tool === 'erase' ? 'palette-item erase selected' : 'palette-item erase'}
        onClick={onErase}
        title="Erase"
      >
        <span className="palette-emoji">🧹</span>
        <span className="palette-label">Erase</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/Tile.tsx`**

```tsx
import type { Light, Placeable, Resident } from '../engine/types'

interface Props {
  col: number
  row: number
  light: Light
  placeable?: Placeable     // the placeable occupying this cell, if any
  isAnchor: boolean         // render emoji only on the anchor cell of a footprint
  resident?: Resident       // animal living here (renders on top)
  residentEmoji?: string
  seasonTint: string        // overlay color for the current season
  onClick: () => void
}

export function Tile({ light, placeable, isAnchor, residentEmoji, seasonTint, onClick }: Props) {
  const bg = placeable ? placeable.color : light === 'shade' ? '#cfd8c5' : '#e7eddc'
  return (
    <button className="tile" style={{ backgroundColor: bg }} onClick={onClick}>
      <span className="tile-season" style={{ backgroundColor: seasonTint }} />
      {placeable && isAnchor && <span className="tile-placeable">{placeable.emoji}</span>}
      {residentEmoji && <span className="tile-resident">{residentEmoji}</span>}
    </button>
  )
}
```

- [ ] **Step 5: Write `src/components/Grid.tsx`**

```tsx
import { COLS, ROWS } from '../engine/grid'
import { computeLightMap } from '../engine/lightMap'
import { occupiedCells } from '../engine/distance'
import { buildPlaceableIndex } from '../engine/placeableIndex'
import { PLACEABLES } from '../config/placeables'
import { ANIMALS } from '../config/animals'
import type { Placement, Resident, Season, Tile as TileT } from '../engine/types'
import { Tile } from './Tile'

const IDX = buildPlaceableIndex(PLACEABLES)
const ANIMAL_EMOJI: Record<string, string> = Object.fromEntries(ANIMALS.map(a => [a.id, a.emoji]))

const SEASON_TINT: Record<Season, string> = {
  spring: 'rgba(120,200,120,0.10)',
  summer: 'rgba(255,210,80,0.10)',
  autumn: 'rgba(210,120,40,0.14)',
  winter: 'rgba(150,180,220,0.18)',
}

interface Props {
  placements: Placement[]
  residents: Resident[]
  season: Season
  onTileClick: (tile: TileT) => void
}

export function Grid({ placements, residents, season, onTileClick }: Props) {
  const light = computeLightMap(placements, IDX)

  // map "col,row" -> { placeable, isAnchor }
  const cellMap = new Map<string, { placeableId: string; isAnchor: boolean }>()
  for (const p of placements) {
    const cells = occupiedCells(p, IDX[p.placeableId].footprint)
    cells.forEach((c, i) => cellMap.set(`${c.col},${c.row}`, { placeableId: p.placeableId, isAnchor: i === 0 }))
  }
  const residentMap = new Map(residents.map(r => [`${r.homeTile.col},${r.homeTile.row}`, r]))

  const rows = []
  for (let row = 0; row < ROWS; row++) {
    const cells = []
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      const occ = cellMap.get(key)
      const res = residentMap.get(key)
      cells.push(
        <Tile
          key={key}
          col={col}
          row={row}
          light={light[row][col]}
          placeable={occ ? IDX[occ.placeableId] : undefined}
          isAnchor={occ?.isAnchor ?? false}
          resident={res}
          residentEmoji={res ? ANIMAL_EMOJI[res.animalId] : undefined}
          seasonTint={SEASON_TINT[season]}
          onClick={() => onTileClick({ col, row })}
        />,
      )
    }
    rows.push(<div className="grid-row" key={row}>{cells}</div>)
  }
  return <div className="grid">{rows}</div>
}
```

- [ ] **Step 6: Append grid/palette styles to `src/styles.css`**

```css
.grid { display: inline-flex; flex-direction: column; border: 2px solid #5a6b4a; }
.grid-row { display: flex; }
.tile {
  position: relative; width: 40px; height: 40px; padding: 0;
  border: 1px solid rgba(0,0,0,0.08); cursor: pointer; font-size: 22px; line-height: 1;
}
.tile-season { position: absolute; inset: 0; pointer-events: none; }
.tile-placeable, .tile-resident { position: absolute; inset: 0; display: grid; place-items: center; }
.tile-resident { font-size: 18px; transform: translateY(-2px); animation: settle 400ms ease-out; }
@keyframes settle { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(-2px); } }
.palette { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.palette-item { display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 8px; border: 2px solid transparent; border-radius: 8px; background: #f1f3ea; cursor: pointer; }
.palette-item.selected { border-color: #5a6b4a; background: #e2e9d2; }
.palette-item.erase.selected { border-color: #b0563a; }
.palette-emoji { font-size: 22px; }
.palette-label { font-size: 11px; }
```

- [ ] **Step 7: Run Palette test + typecheck**

Run: `npm test -- Palette && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: grid, tile, and palette placement UI"
```

---

### Task 10: Debug overlay (Phase 2)

**Files:**
- Create: `src/components/DebugOverlay.tsx`
- Modify: `src/components/Grid.tsx` (accept an optional overlay layer)
- Test: `src/components/__tests__/DebugOverlay.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/DebugOverlay.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DebugOverlay } from '../DebugOverlay'

describe('DebugOverlay', () => {
  it('toggles and changes provision type', () => {
    const onToggle = vi.fn(); const onProvision = vi.fn()
    render(<DebugOverlay show provisionType="water" onToggle={onToggle} onProvision={onProvision} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    expect(onToggle).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'nectar' } })
    expect(onProvision).toHaveBeenCalledWith('nectar')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- DebugOverlay`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/DebugOverlay.tsx`**

```tsx
import type { ProvisionType } from '../engine/types'

const PROVISION_TYPES: ProvisionType[] = [
  'water', 'nest_high', 'shelter_ground', 'berries', 'nuts',
  'nectar', 'insects', 'seeds', 'cover_low', 'bask',
]

interface Props {
  show: boolean
  provisionType: ProvisionType
  onToggle: () => void
  onProvision: (t: ProvisionType) => void
}

export function DebugOverlay({ show, provisionType, onToggle, onProvision }: Props) {
  return (
    <div className="debug-controls">
      <button onClick={onToggle}>{show ? 'Hide debug' : 'Show debug'}</button>
      {show && (
        <select value={provisionType} onChange={e => onProvision(e.target.value as ProvisionType)}>
          {PROVISION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add overlay rendering to `Grid.tsx`**

Add an optional prop and render a marker on flagged tiles. Modify the `Props` interface and the `Tile` invocation:

In `src/components/Grid.tsx`, extend `Props`:
```tsx
interface Props {
  placements: Placement[]
  residents: Resident[]
  season: Season
  onTileClick: (tile: TileT) => void
  lightDebug?: boolean          // tint shade tiles strongly
  provisionField?: boolean[][]  // dots on tiles within a provision field
}
```
Destructure them: `export function Grid({ placements, residents, season, onTileClick, lightDebug, provisionField }: Props) {`

Then pass two more props into each `<Tile>`:
```tsx
debugShade={lightDebug ? light[row][col] === 'shade' : false}
debugField={provisionField?.[row][col] ?? false}
```

Update `src/components/Tile.tsx` `Props` and render:
```tsx
// add to Props:
//   debugShade?: boolean
//   debugField?: boolean
// add inside the button, after tile-season span:
{debugShade && <span className="tile-debug-shade" />}
{debugField && <span className="tile-debug-field" />}
```
Append to `styles.css`:
```css
.tile-debug-shade { position: absolute; inset: 0; background: rgba(40,40,90,0.35); pointer-events: none; }
.tile-debug-field { position: absolute; inset: 30%; border-radius: 50%; background: rgba(40,120,200,0.7); pointer-events: none; }
.debug-controls { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
```

- [ ] **Step 5: Run DebugOverlay test + typecheck**

Run: `npm test -- DebugOverlay && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: debug overlay for light map and provision fields"
```

---

### Task 11: Arrival card and Journal (Phase 4 charm layer)

**Files:**
- Create: `src/components/ArrivalCard.tsx`, `src/components/Journal.tsx`
- Test: `src/components/__tests__/Journal.test.tsx`, `src/components/__tests__/ArrivalCard.test.tsx`

- [ ] **Step 1: Write the failing Journal test**

`src/components/__tests__/Journal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Journal } from '../Journal'
import type { Resident } from '../../engine/types'

describe('Journal', () => {
  it('shows hints for locked animals and full cards for residents', () => {
    const residents: Resident[] = [
      { animalId: 'ribbit', homeTile: { col: 4, row: 2 }, homeLight: 'open', stars: 3 },
    ]
    render(<Journal residents={residents} />)
    // discovered: name + personality visible
    expect(screen.getByText(/Ribbit/)).toBeInTheDocument()
    expect(screen.getByText(/exclusively in vibes/i)).toBeInTheDocument()
    // locked: hint visible, personality NOT
    expect(screen.getByText(/Follows the sun and the flowers/i)).toBeInTheDocument()
    expect(screen.queryByText(/committed to sunshine/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- Journal`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/Journal.tsx`**

```tsx
import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

function Stars({ n }: { n: number }) {
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(3 - n)}</span>
}

interface Props { residents: Resident[] }

export function Journal({ residents }: Props) {
  const byId = new Map(residents.map(r => [r.animalId, r]))
  return (
    <div className="journal">
      <h2>Species Journal</h2>
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

- [ ] **Step 4: Write `src/components/ArrivalCard.tsx`**

```tsx
import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

interface Props { animalId: string; residents: Resident[]; onDismiss: () => void }

export function ArrivalCard({ animalId, residents, onDismiss }: Props) {
  const animal = ANIMALS.find(a => a.id === animalId)!
  const res = residents.find(r => r.animalId === animalId)
  const stars = res?.stars ?? 1
  return (
    <div className="arrival-card" role="dialog" aria-label={`${animal.name} arrived`}>
      <div className="arrival-emoji">{animal.emoji}</div>
      <div className="arrival-title">{animal.name} the {animal.species} moved in!</div>
      <div className="arrival-stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
      <div className="arrival-personality">{animal.personality}</div>
      <button className="arrival-dismiss" onClick={onDismiss}>Welcome them</button>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/__tests__/ArrivalCard.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArrivalCard } from '../ArrivalCard'
import type { Resident } from '../../engine/types'

describe('ArrivalCard', () => {
  it('renders the arriving animal and dismisses', () => {
    const residents: Resident[] = [
      { animalId: 'pip', homeTile: { col: 1, row: 1 }, homeLight: 'open', stars: 2 },
    ]
    const onDismiss = vi.fn()
    render(<ArrivalCard animalId="pip" residents={residents} onDismiss={onDismiss} />)
    expect(screen.getByText(/Pip the Songbird/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /welcome/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Append journal/card styles to `styles.css`**

```css
.journal { margin-top: 16px; }
.journal-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.journal-entry { border: 1px solid #cdd5bf; border-radius: 10px; padding: 10px; background: #f7f9f1; }
.journal-entry.locked { opacity: 0.85; }
.journal-emoji { font-size: 28px; }
.journal-emoji.silhouette { filter: grayscale(1) brightness(0.4); }
.journal-name { font-weight: 600; }
.journal-species { font-weight: 400; color: #5a6b4a; font-size: 12px; }
.journal-personality { font-size: 13px; color: #444; margin-top: 4px; }
.journal-hint { font-size: 12px; color: #8a8a7a; font-style: italic; margin-top: 4px; }
.stars, .arrival-stars { color: #d8a72a; letter-spacing: 2px; }
.arrival-card { position: fixed; right: 20px; bottom: 20px; width: 260px; padding: 16px;
  border-radius: 14px; background: #fffdf5; box-shadow: 0 8px 30px rgba(0,0,0,0.18);
  text-align: center; animation: slidein 350ms ease-out; }
@keyframes slidein { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.arrival-emoji { font-size: 40px; }
.arrival-title { font-weight: 600; margin: 6px 0; }
.arrival-personality { font-size: 13px; color: #555; margin: 8px 0; }
.arrival-dismiss { padding: 6px 14px; border: none; border-radius: 8px; background: #5a6b4a; color: #fff; cursor: pointer; }
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test -- Journal ArrivalCard && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: arrival card and species journal with locked hints"
```

---

### Task 12: Season control (Phase 5 UI)

**Files:**
- Create: `src/components/SeasonControl.tsx`
- Test: `src/components/__tests__/SeasonControl.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/SeasonControl.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SeasonControl } from '../SeasonControl'

describe('SeasonControl', () => {
  it('shows the four seasons and reports selection', () => {
    const onChange = vi.fn()
    render(<SeasonControl season="spring" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /winter/i }))
    expect(onChange).toHaveBeenCalledWith('winter')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- SeasonControl`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/SeasonControl.tsx`**

```tsx
import { SEASONS } from '../engine/seasons'
import type { Season } from '../engine/types'

const LABEL: Record<Season, string> = {
  spring: '🌱 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter',
}

interface Props { season: Season; onChange: (s: Season) => void }

export function SeasonControl({ season, onChange }: Props) {
  return (
    <div className="season-control">
      {SEASONS.map(s => (
        <button
          key={s}
          className={s === season ? 'season-btn active' : 'season-btn'}
          onClick={() => onChange(s)}
        >
          {LABEL[s]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Append styles to `styles.css`**

```css
.season-control { display: flex; gap: 6px; margin-bottom: 12px; }
.season-btn { padding: 6px 12px; border: 2px solid transparent; border-radius: 8px;
  background: #f1f3ea; cursor: pointer; }
.season-btn.active { border-color: #5a6b4a; background: #e2e9d2; }
```

- [ ] **Step 5: Run test + typecheck**

Run: `npm test -- SeasonControl && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: season control"
```

---

### Task 13: App integration + manual acceptance

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`, `src/styles.css`
- Test: `src/__tests__/App.test.tsx`

- [ ] **Step 1: Write the failing integration test**

`src/__tests__/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// Build Fixture 2 (pond + grass) by clicking palette then tiles; expect a frog arrival card.
describe('App integration', () => {
  it('placing a pond and grass triggers an arrival card', () => {
    const { container } = render(<App />)
    const tiles = () => container.querySelectorAll<HTMLButtonElement>('.tile')

    fireEvent.click(screen.getByRole('button', { name: /Pond/i }))
    // pond anchor at index row2*16+col2 = 34
    fireEvent.click(tiles()[2 * 16 + 2])

    fireEvent.click(screen.getByRole('button', { name: /Tall Grass/i }))
    fireEvent.click(tiles()[3 * 16 + 4])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/moved in/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- App`
Expected: FAIL (App not yet wired / no dialog).

- [ ] **Step 3: Write `src/App.tsx`**

```tsx
import { useReducer, useState } from 'react'
import { gameReducer, initialState } from './state/gameReducer'
import { buildPlaceableIndex } from './engine/placeableIndex'
import { PLACEABLES } from './config/placeables'
import { computeProvisionField } from './engine/provisionField'
import type { Tile } from './engine/types'
import { Grid } from './components/Grid'
import { Palette } from './components/Palette'
import { Journal } from './components/Journal'
import { ArrivalCard } from './components/ArrivalCard'
import { SeasonControl } from './components/SeasonControl'
import { DebugOverlay } from './components/DebugOverlay'
import './styles.css'

const IDX = buildPlaceableIndex(PLACEABLES)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
  const [selected, setSelected] = useState('oak')
  const [tool, setTool] = useState<'place' | 'erase'>('place')

  const onTileClick = (tile: Tile) => {
    if (tool === 'erase') dispatch({ type: 'ERASE', tile })
    else dispatch({ type: 'PLACE', placeableId: selected, anchor: tile })
  }

  const field = state.debug.show
    ? computeProvisionField(state.placements, IDX, state.debug.provisionType, state.season)
    : undefined
  const currentArrival = state.lastArrivals[0]

  return (
    <div className="app">
      <header>
        <h1>Forest Habitat</h1>
        <p className="tagline">Place habitat. Animals move in when it feels like home.</p>
      </header>

      <SeasonControl season={state.season} onChange={s => dispatch({ type: 'SET_SEASON', season: s })} />
      <Palette
        selected={selected}
        tool={tool}
        onSelect={id => { setSelected(id); setTool('place') }}
        onErase={() => setTool('erase')}
      />
      <DebugOverlay
        show={state.debug.show}
        provisionType={state.debug.provisionType}
        onToggle={() => dispatch({ type: 'TOGGLE_DEBUG' })}
        onProvision={t => dispatch({ type: 'SET_DEBUG_PROVISION', provisionType: t })}
      />

      <Grid
        placements={state.placements}
        residents={state.residents}
        season={state.season}
        onTileClick={onTileClick}
        lightDebug={state.debug.show}
        provisionField={field}
      />

      <Journal residents={state.residents} />

      {currentArrival && (
        <ArrivalCard
          animalId={currentArrival}
          residents={state.residents}
          onDismiss={() => dispatch({ type: 'DISMISS_ARRIVAL', animalId: currentArrival })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Ensure `src/main.tsx` renders `App`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: Append top-level layout styles to `styles.css`**

```css
:root { font-family: system-ui, sans-serif; color: #2c3424; }
body { margin: 0; background: #eef2e6; }
.app { max-width: 760px; margin: 0 auto; padding: 24px; }
header h1 { margin: 0 0 4px; }
.tagline { margin: 0 0 16px; color: #5a6b4a; }
```

- [ ] **Step 6: Run the integration test + full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: ALL green, including `App integration`.

- [ ] **Step 7: Manual acceptance pass (spec phase checks)**

Run: `npm run dev`, open the URL, and verify each spec acceptance check:
- **Phase 0:** grid renders 16×12, configs load, window resize doesn't break layout.
- **Phase 1:** all 8 placeables place; 2×2 footprints enforced; overlaps blocked; erase works.
- **Phase 2:** toggle debug → placing an oak shows shade block; switch provision to `water`, place a pond → field 4 tiles out; remove it → field clears.
- **Phase 3:** (already covered by `fixtures.test.ts`).
- **Phase 4:** building for an animal shows its arrival card exactly once; journal flips locked→filled; stars on card match engine.
- **Phase 5:** switch to winter → berry-only new matches get harder, existing residents remain, grid tint changes; back to spring restores berry matching.

Note any deviation here as a follow-up rather than patching silently.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: wire full app — placement, overlay, journal, arrivals, seasons"
```

---

## Self-review checklist (run before handing off to execution)

- **Spec coverage:** Phase 0 → Task 0; Phase 1 → Task 9; Phase 2 → Tasks 5 + 10; Phase 3 → Task 6 (+7); Phase 4 → Task 11; Phase 5 → Tasks 4 + 12. Core data model → Task 1. One-shot permanence → Task 7. Journal hints → Task 11.
- **All 6 Phase-3 fixtures** encoded in `fixtures.test.ts` (Task 6), including Fixture 4's `open`/`shade` home-tile assertion and Fixture 5's 2→3 increment.
- **No placeholders:** every code step contains complete code.
- **Type consistency:** `Resident`, `MatchResult`, `Need.minSources`, `Placement.anchor`, `season: Season | 'all'` used consistently across engine, reducer, and components.
- **`radius` isolation:** used only in `provisionField.ts`; matching uses `within` only.
```
