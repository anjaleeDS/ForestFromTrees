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
