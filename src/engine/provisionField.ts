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
