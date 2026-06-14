import type { MatchResult, Resident } from './types'

export interface ReconcileOutput {
  residents: Resident[]
  arrivals: string[] // animalIds that newly arrived this reconcile
}

export function reconcile(
  prev: Resident[], results: Map<string, MatchResult>,
): ReconcileOutput {
  const map = new Map<string, Resident>(prev.map(r => [r.animalId, { ...r }]))
  const arrivals: string[] = []

  for (const [animalId, res] of results) {
    const existing = map.get(animalId)
    if (existing) {
      if (res.qualifies) {
        existing.homeTile = res.homeTile!
        existing.homeLight = res.homeLight!
        existing.stars = res.stars
      }
    } else if (res.qualifies) {
      map.set(animalId, {
        animalId, homeTile: res.homeTile!, homeLight: res.homeLight!, stars: res.stars,
      })
      arrivals.push(animalId)
    }
  }
  return { residents: Array.from(map.values()), arrivals }
}
