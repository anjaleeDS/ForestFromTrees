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
