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
    expect(one.qualifies).toBe(true)
    expect(one.optionalsSatisfied).toBe(0)
    const two = evaluateAll(ANIMALS, [place('wildflowers', 3, 3), place('wildflowers', 4, 3)], idx, 'all').get('flit')!
    expect(two.optionalsSatisfied).toBe(1)
  })
})
