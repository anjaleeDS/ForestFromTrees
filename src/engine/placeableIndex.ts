import type { Placeable, PlaceableIndex } from './types'

export function buildPlaceableIndex(placeables: Placeable[]): PlaceableIndex {
  const idx: PlaceableIndex = {}
  for (const p of placeables) idx[p.id] = p
  return idx
}
