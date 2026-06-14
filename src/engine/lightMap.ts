import type { Light, PlaceableIndex, Placement, Tile } from './types'
import { COLS, ROWS, inBounds } from './grid'
import { occupiedCells } from './distance'

export type LightMap = Light[][] // [row][col]

export function computeLightMap(placements: Placement[], idx: PlaceableIndex): LightMap {
  const map: LightMap = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 'open' as Light))
  for (const p of placements) {
    const def = idx[p.placeableId]
    if (!def.canopy) continue
    for (const cell of occupiedCells(p, def.footprint)) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const t: Tile = { col: cell.col + dc, row: cell.row + dr }
          if (inBounds(t)) map[t.row][t.col] = 'shade'
        }
      }
    }
  }
  return map
}

export function lightAt(map: LightMap, tile: Tile): Light {
  return map[tile.row][tile.col]
}
