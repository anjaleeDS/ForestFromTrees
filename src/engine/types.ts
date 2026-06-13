export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Light = 'open' | 'shade'
export type AnimalLight = Light | 'any'

export type ProvisionType =
  | 'water' | 'nest_high' | 'shelter_ground' | 'berries' | 'nuts'
  | 'nectar' | 'insects' | 'seeds' | 'cover_low' | 'bask'

export interface Provision {
  type: ProvisionType
  value: number   // default 1; quality, unused by v1 matching
  radius: number  // overlay reach only; NOT used by matching
}

export interface Placeable {
  id: string
  name: string
  footprint: number   // 1 => 1x1, 2 => 2x2
  canopy: boolean
  provides: Provision[]
  emoji: string
  color: string       // tile background when placed
}

export interface Need {
  type: ProvisionType
  within: number
  required: boolean
  satisfiedBy?: ProvisionType[]
  minSources?: number  // default 1; e.g. butterfly nectar cluster = 2
}

export interface Animal {
  id: string
  name: string
  species: string
  personality: string
  hint: string         // journal locked-entry hint (flavor, no mechanics)
  light: AnimalLight
  needs: Need[]
  emoji: string
}

export interface Tile { col: number; row: number }

export interface Placement {
  id: string           // unique instance id
  placeableId: string  // -> Placeable.id
  anchor: Tile         // top-left cell
}

export interface MatchResult {
  animalId: string
  qualifies: boolean
  homeTile: Tile | null
  homeLight: Light | null
  stars: number              // 0 if not qualifying
  optionalsSatisfied: number
  optionalsTotal: number
}

export interface Resident {
  animalId: string
  homeTile: Tile
  homeLight: Light
  stars: number
}

export type PlaceableIndex = Record<string, Placeable>
