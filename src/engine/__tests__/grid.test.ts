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
    expect(canPlace(existing, idx, 'berry', { col: 6, row: 6 })).toBe(false)
    expect(canPlace(existing, idx, 'berry', { col: 7, row: 5 })).toBe(true)
  })
  it('placementAtTile finds the placement occupying a cell', () => {
    const existing: Placement[] = [{ id: 'a', placeableId: 'oak', anchor: { col: 5, row: 5 } }]
    expect(placementAtTile(existing, idx, { col: 6, row: 6 })?.id).toBe('a')
    expect(placementAtTile(existing, idx, { col: 0, row: 0 })).toBeUndefined()
  })
})
