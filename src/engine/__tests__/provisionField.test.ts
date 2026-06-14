import { describe, it, expect } from 'vitest'
import { computeProvisionField } from '../provisionField'
import { buildPlaceableIndex } from '../placeableIndex'
import { PLACEABLES } from '../../config/placeables'
import type { Placement } from '../types'

const idx = buildPlaceableIndex(PLACEABLES)

describe('provisionField', () => {
  it('pond water reaches 4 tiles out (Chebyshev) from its footprint', () => {
    const placements: Placement[] = [{ id: 'p', placeableId: 'pond', anchor: { col: 5, row: 5 } }]
    const field = computeProvisionField(placements, idx, 'water', 'all')
    expect(field[5][9]).toBe(true)
    expect(field[5][10]).toBe(true)
    expect(field[5][11]).toBe(false)
  })
  it('respects seasonal dormancy', () => {
    const placements: Placement[] = [{ id: 'b', placeableId: 'berry', anchor: { col: 5, row: 5 } }]
    const summer = computeProvisionField(placements, idx, 'berries', 'summer')
    const winter = computeProvisionField(placements, idx, 'berries', 'winter')
    expect(summer[5][5]).toBe(true)
    expect(winter[5][5]).toBe(false)
  })
})
