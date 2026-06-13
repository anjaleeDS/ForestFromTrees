import type { Placeable } from '../engine/types'

export const PLACEABLES: Placeable[] = [
  { id: 'oak', name: 'Oak Tree', footprint: 2, canopy: true, emoji: '🌳', color: '#3f6f3f',
    provides: [
      { type: 'nest_high', value: 1, radius: 0 },
      { type: 'nuts', value: 1, radius: 3 },
      { type: 'insects', value: 1, radius: 2 },
    ] },
  { id: 'pine', name: 'Pine Tree', footprint: 2, canopy: true, emoji: '🌲', color: '#2f5d4a',
    provides: [
      { type: 'nest_high', value: 1, radius: 0 },
      { type: 'seeds', value: 1, radius: 3 },
      { type: 'shelter_ground', value: 1, radius: 1 },
    ] },
  { id: 'berry', name: 'Berry Bush', footprint: 1, canopy: false, emoji: '🫐', color: '#6b4a7a',
    provides: [
      { type: 'berries', value: 1, radius: 2 },
      { type: 'cover_low', value: 1, radius: 1 },
    ] },
  { id: 'pond', name: 'Pond', footprint: 2, canopy: false, emoji: '💧', color: '#3b6ea5',
    provides: [
      { type: 'water', value: 1, radius: 4 },
      { type: 'insects', value: 1, radius: 3 },
    ] },
  { id: 'wildflowers', name: 'Wildflowers', footprint: 1, canopy: false, emoji: '🌼', color: '#caa83a',
    provides: [
      { type: 'nectar', value: 1, radius: 2 },
      { type: 'cover_low', value: 1, radius: 1 },
    ] },
  { id: 'log', name: 'Fallen Log', footprint: 1, canopy: false, emoji: '🪵', color: '#6e4d33',
    provides: [
      { type: 'shelter_ground', value: 1, radius: 1 },
      { type: 'insects', value: 1, radius: 2 },
    ] },
  { id: 'grass', name: 'Tall Grass', footprint: 1, canopy: false, emoji: '🌾', color: '#7a8a3a',
    provides: [
      { type: 'cover_low', value: 1, radius: 1 },
      { type: 'seeds', value: 1, radius: 2 },
      { type: 'shelter_ground', value: 1, radius: 0 },
    ] },
  { id: 'rocks', name: 'Rock Pile', footprint: 1, canopy: false, emoji: '🪨', color: '#8a8a8a',
    provides: [
      { type: 'bask', value: 1, radius: 1 },
      { type: 'shelter_ground', value: 1, radius: 1 },
    ] },
]
