import { describe, it, expect } from 'vitest'
import { reconcile } from '../reconcile'
import type { MatchResult, Resident } from '../types'

const result = (animalId: string, qualifies: boolean, stars = 0, col = 0, row = 0): MatchResult => ({
  animalId, qualifies, stars,
  homeTile: qualifies ? { col, row } : null,
  homeLight: qualifies ? 'open' : null,
  optionalsSatisfied: 0, optionalsTotal: 0,
  unmetRequired: qualifies ? 0 : 1,
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
    expect(residents[0].stars).toBe(3)
    expect(residents[0].homeTile).toEqual({ col: 1, row: 1 })
  })
})
