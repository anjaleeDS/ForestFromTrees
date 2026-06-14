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
    expect(distanceToPlacement({ col: 10, row: 5 }, pond, idx.pond.footprint)).toBe(2)
  })
})
