import type { Placement, ProvisionType, Resident, Season, Tile } from '../engine/types'
import { PLACEABLES } from '../config/placeables'
import { ANIMALS } from '../config/animals'
import { buildPlaceableIndex } from '../engine/placeableIndex'
import { canPlace, placementAtTile } from '../engine/grid'
import { evaluateAll } from '../engine/matching'
import { reconcile } from '../engine/reconcile'

const IDX = buildPlaceableIndex(PLACEABLES)

export interface GameState {
  placements: Placement[]
  season: Season
  residents: Resident[]
  lastArrivals: string[]
  nextId: number
  debug: { show: boolean; provisionType: ProvisionType }
}

export type Action =
  | { type: 'PLACE'; placeableId: string; anchor: Tile }
  | { type: 'ERASE'; tile: Tile }
  | { type: 'SET_SEASON'; season: Season }
  | { type: 'DISMISS_ARRIVAL'; animalId: string }
  | { type: 'TOGGLE_DEBUG' }
  | { type: 'SET_DEBUG_PROVISION'; provisionType: ProvisionType }
  | { type: 'RESET' }

export function initialState(): GameState {
  return {
    placements: [], season: 'spring', residents: [], lastArrivals: [], nextId: 1,
    debug: { show: false, provisionType: 'water' },
  }
}

function recompute(state: GameState, placements: Placement[], season: Season): GameState {
  const results = evaluateAll(ANIMALS, placements, IDX, season)
  const { residents, arrivals } = reconcile(state.residents, results)
  return {
    ...state, placements, season, residents,
    lastArrivals: [...state.lastArrivals, ...arrivals],
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PLACE': {
      if (!canPlace(state.placements, IDX, action.placeableId, action.anchor)) return state
      const placement: Placement = {
        id: `pl-${state.nextId}`, placeableId: action.placeableId, anchor: action.anchor,
      }
      return recompute(
        { ...state, nextId: state.nextId + 1 },
        [...state.placements, placement], state.season,
      )
    }
    case 'ERASE': {
      const target = placementAtTile(state.placements, IDX, action.tile)
      if (!target) return state
      return recompute(state, state.placements.filter(p => p.id !== target.id), state.season)
    }
    case 'SET_SEASON':
      return recompute(state, state.placements, action.season)
    case 'DISMISS_ARRIVAL':
      return { ...state, lastArrivals: state.lastArrivals.filter(id => id !== action.animalId) }
    case 'TOGGLE_DEBUG':
      return { ...state, debug: { ...state.debug, show: !state.debug.show } }
    case 'SET_DEBUG_PROVISION':
      return { ...state, debug: { ...state.debug, provisionType: action.provisionType } }
    case 'RESET':
      return initialState()
    default:
      return state
  }
}
