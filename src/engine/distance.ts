import type { Placement, Tile } from './types'

export function chebyshev(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
}

export function occupiedCells(p: Placement, footprint: number): Tile[] {
  const cells: Tile[] = []
  for (let dr = 0; dr < footprint; dr++) {
    for (let dc = 0; dc < footprint; dc++) {
      cells.push({ col: p.anchor.col + dc, row: p.anchor.row + dr })
    }
  }
  return cells
}

export function distanceToPlacement(home: Tile, p: Placement, footprint: number): number {
  let min = Infinity
  for (const cell of occupiedCells(p, footprint)) {
    const d = chebyshev(home, cell)
    if (d < min) min = d
  }
  return min
}
