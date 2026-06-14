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
    const placements: Placement[] = [{ id: 'o', placeableId: 'oak', anchor: { col: 8, row: 5 } }]
    const m = computeLightMap(placements, idx)
    expect(lightAt(m, { col: 7, row: 4 })).toBe('shade')
    expect(lightAt(m, { col: 10, row: 7 })).toBe('shade')
    expect(lightAt(m, { col: 8, row: 5 })).toBe('shade')
    expect(lightAt(m, { col: 11, row: 5 })).toBe('open')
    expect(lightAt(m, { col: 6, row: 5 })).toBe('open')
  })
  it('non-canopy placeables cast no shade', () => {
    const placements: Placement[] = [{ id: 'p', placeableId: 'pond', anchor: { col: 2, row: 2 } }]
    const m = computeLightMap(placements, idx)
    expect(lightAt(m, { col: 2, row: 2 })).toBe('open')
  })
})
