import type { ProvisionType, Season } from './types'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// 'all' disables seasonal filtering (used by Phase 3 fixtures and the overlay).
export function provisionActive(type: ProvisionType, season: Season | 'all'): boolean {
  if (season === 'all') return true
  if (type === 'berries') return season !== 'winter'
  if (type === 'nectar') return season === 'spring' || season === 'summer'
  return true
}
