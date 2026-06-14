import type { PlaceableIndex, Placement, Tile } from './types'
import { occupiedCells } from './distance'

export const COLS = 16
export const ROWS = 12

export function inBounds(tile: Tile): boolean {
  return tile.col >= 0 && tile.col < COLS && tile.row >= 0 && tile.row < ROWS
}

export function placementCells(placeableId: string, anchor: Tile, idx: PlaceableIndex): Tile[] {
  const footprint = idx[placeableId].footprint
  return occupiedCells({ id: '_', placeableId, anchor }, footprint)
}

export function canPlace(
  placements: Placement[], idx: PlaceableIndex, placeableId: string, anchor: Tile,
): boolean {
  const cells = placementCells(placeableId, anchor, idx)
  if (!cells.every(inBounds)) return false
  const occupied = new Set(
    placements.flatMap(p => occupiedCells(p, idx[p.placeableId].footprint))
      .map(c => `${c.col},${c.row}`),
  )
  return cells.every(c => !occupied.has(`${c.col},${c.row}`))
}

export function placementAtTile(
  placements: Placement[], idx: PlaceableIndex, tile: Tile,
): Placement | undefined {
  return placements.find(p =>
    occupiedCells(p, idx[p.placeableId].footprint)
      .some(c => c.col === tile.col && c.row === tile.row),
  )
}
