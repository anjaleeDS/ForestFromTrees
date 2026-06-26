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

describe('seasonal matching (Phase 5)', () => {
  // Rabbit requires cover_low + (seeds OR berries). A lone berry bush supplies
  // both cover_low and berries — but berries go dormant in winter.
  const berryOnly = [place('berry', 5, 5)]
  it('rabbit qualifies in spring (berries active) but not in winter (berries dormant)', () => {
    expect(evaluateAll(ANIMALS, berryOnly, idx, 'spring').get('clover')!.qualifies).toBe(true)
    expect(evaluateAll(ANIMALS, berryOnly, idx, 'winter').get('clover')!.qualifies).toBe(false)
  })
  it('butterfly nectar need is gated by season (active spring/summer, dormant autumn/winter)', () => {
    const flowers = [place('wildflowers', 5, 5)]
    expect(evaluateAll(ANIMALS, flowers, idx, 'summer').get('flit')!.qualifies).toBe(true)
    expect(evaluateAll(ANIMALS, flowers, idx, 'autumn').get('flit')!.qualifies).toBe(false)
  })
})

describe('unmetRequired (stirring proximity)', () => {
  it('is 0 for a qualifying animal', () => {
    const r = evaluateAll(ANIMALS, [place('pond', 2, 2), place('grass', 4, 3)], idx, 'all').get('ribbit')!
    expect(r.qualifies).toBe(true)
    expect(r.unmetRequired).toBe(0)
  })
  it('is exactly 1 when a frog has water but no cover (one need away)', () => {
    const r = evaluateAll(ANIMALS, [place('pond', 2, 2)], idx, 'all').get('ribbit')!
    expect(r.qualifies).toBe(false)
    expect(r.unmetRequired).toBe(1)
  })
  it('counts a wrong-light tile as the one missing condition (hedgehog with food, no shade)', () => {
    const r = evaluateAll(ANIMALS, [place('log', 8, 6), place('pond', 11, 6)], idx, 'all').get('quill')!
    expect(r.qualifies).toBe(false)
    expect(r.unmetRequired).toBe(1)
  })
  it('is >= 2 when two conditions are missing (empty map, frog)', () => {
    const r = evaluateAll(ANIMALS, [], idx, 'all').get('ribbit')!
    expect(r.unmetRequired).toBeGreaterThanOrEqual(2)
  })
})
