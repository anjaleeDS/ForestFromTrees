import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from '../gameReducer'

describe('gameReducer', () => {
  it('PLACE adds a placement and triggers arrivals', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    expect(s.placements).toHaveLength(2)
    const ids = s.residents.map(r => r.animalId).sort()
    expect(ids).toEqual(['clover', 'ribbit'])
    expect(s.lastArrivals).toContain('ribbit')
  })
  it('PLACE on an occupied/out-of-bounds tile is a no-op', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'oak', anchor: { col: 5, row: 5 } })
    const before = s.placements.length
    s = gameReducer(s, { type: 'PLACE', placeableId: 'berry', anchor: { col: 6, row: 6 } })
    expect(s.placements).toHaveLength(before)
  })
  it('ERASE removes the placement under a tile but residents stay (permanence)', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    s = gameReducer(s, { type: 'ERASE', tile: { col: 4, row: 3 } })
    expect(s.placements).toHaveLength(1)
    expect(s.residents.map(r => r.animalId)).toContain('clover')
  })
  it('SET_SEASON re-evaluates; winter does not evict existing residents', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    const count = s.residents.length
    s = gameReducer(s, { type: 'SET_SEASON', season: 'winter' })
    expect(s.residents.length).toBeGreaterThanOrEqual(count)
  })
  it('DISMISS_ARRIVAL clears one pending card', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    const first = s.lastArrivals[0]
    s = gameReducer(s, { type: 'DISMISS_ARRIVAL', animalId: first })
    expect(s.lastArrivals).not.toContain(first)
  })
  it('season gates NEW arrivals: berry habitat in winter yields no rabbit; cycling to spring lets it move in', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'SET_SEASON', season: 'winter' })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'berry', anchor: { col: 5, row: 5 } })
    expect(s.residents.map(r => r.animalId)).not.toContain('clover') // berries dormant in winter
    s = gameReducer(s, { type: 'SET_SEASON', season: 'spring' })
    expect(s.residents.map(r => r.animalId)).toContain('clover')     // berries active -> rabbit arrives
    expect(s.lastArrivals).toContain('clover')
  })
  it('RESET returns a blank initial state (placements, residents, arrivals cleared)', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    expect(s.placements.length).toBeGreaterThan(0)
    expect(s.residents.length).toBeGreaterThan(0)
    s = gameReducer(s, { type: 'RESET' })
    expect(s.placements).toHaveLength(0)
    expect(s.residents).toHaveLength(0)
    expect(s.lastArrivals).toHaveLength(0)
    expect(s.season).toBe('spring')
  })
  it('marks a one-need-away animal as stirring, not resident', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    expect(s.stirring).toContain('ribbit')
    expect(s.residents.map(r => r.animalId)).not.toContain('ribbit')
  })
  it('once an animal qualifies it leaves stirring and becomes a resident', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    s = gameReducer(s, { type: 'PLACE', placeableId: 'grass', anchor: { col: 4, row: 3 } })
    expect(s.stirring).not.toContain('ribbit')
    expect(s.residents.map(r => r.animalId)).toContain('ribbit')
  })
  it('RESET clears stirring', () => {
    let s = initialState()
    s = gameReducer(s, { type: 'PLACE', placeableId: 'pond', anchor: { col: 2, row: 2 } })
    expect(s.stirring.length).toBeGreaterThan(0)
    s = gameReducer(s, { type: 'RESET' })
    expect(s.stirring).toHaveLength(0)
  })
})
