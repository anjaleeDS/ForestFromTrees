import type {
  Animal, Light, MatchResult, Need, PlaceableIndex, Placement, Season, Tile,
} from './types'
import { COLS, ROWS } from './grid'
import { distanceToPlacement } from './distance'
import { computeLightMap, lightAt, type LightMap } from './lightMap'
import { provisionActive } from './seasons'

function countSources(
  home: Tile, need: Need, placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): number {
  const types = new Set([need.type, ...(need.satisfiedBy ?? [])])
  let count = 0
  for (const p of placements) {
    const def = idx[p.placeableId]
    const provides = def.provides.some(pr => types.has(pr.type) && provisionActive(pr.type, season))
    if (!provides) continue
    if (distanceToPlacement(home, p, def.footprint) <= need.within) count++
  }
  return count
}

function needMet(
  home: Tile, need: Need, placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): boolean {
  return countSources(home, need, placements, idx, season) >= (need.minSources ?? 1)
}

function clampStars(ratio: number): number {
  return Math.min(3, Math.max(1, 1 + Math.round(ratio * 2)))
}

export function evaluateAnimal(
  animal: Animal, placements: Placement[], idx: PlaceableIndex,
  lightMap: LightMap, season: Season | 'all',
): MatchResult {
  const required = animal.needs.filter(n => n.required)
  const optional = animal.needs.filter(n => !n.required)
  let best: { tile: Tile; light: Light; opt: number } | null = null
  let minUnmet = Infinity

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const home: Tile = { col, row }
      const light = lightAt(lightMap, home)
      const lightPenalty = animal.light !== 'any' && animal.light !== light ? 1 : 0
      const unmetNeeds = required.filter(n => !needMet(home, n, placements, idx, season)).length
      const unmet = lightPenalty + unmetNeeds
      if (unmet < minUnmet) minUnmet = unmet
      if (lightPenalty === 0 && unmetNeeds === 0) {
        const opt = optional.filter(n => needMet(home, n, placements, idx, season)).length
        if (best === null || opt > best.opt) best = { tile: home, light, opt }
      }
    }
  }

  if (!best) {
    return {
      animalId: animal.id, qualifies: false, homeTile: null, homeLight: null,
      stars: 0, optionalsSatisfied: 0, optionalsTotal: optional.length,
      unmetRequired: minUnmet,
    }
  }
  const ratio = optional.length === 0 ? 0 : best.opt / optional.length
  return {
    animalId: animal.id, qualifies: true, homeTile: best.tile, homeLight: best.light,
    stars: clampStars(ratio), optionalsSatisfied: best.opt, optionalsTotal: optional.length,
    unmetRequired: minUnmet,
  }
}

export function evaluateAll(
  animals: Animal[], placements: Placement[], idx: PlaceableIndex, season: Season | 'all',
): Map<string, MatchResult> {
  const lightMap = computeLightMap(placements, idx)
  const out = new Map<string, MatchResult>()
  for (const a of animals) out.set(a.id, evaluateAnimal(a, placements, idx, lightMap, season))
  return out
}
