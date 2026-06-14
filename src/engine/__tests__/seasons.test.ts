import { describe, it, expect } from 'vitest'
import { SEASONS, provisionActive } from '../seasons'

describe('seasons', () => {
  it('cycles four seasons', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter'])
  })
  it("'all' enables every provision", () => {
    expect(provisionActive('berries', 'all')).toBe(true)
    expect(provisionActive('nectar', 'all')).toBe(true)
  })
  it('berries dormant only in winter', () => {
    expect(provisionActive('berries', 'spring')).toBe(true)
    expect(provisionActive('berries', 'autumn')).toBe(true)
    expect(provisionActive('berries', 'winter')).toBe(false)
  })
  it('nectar active only spring and summer', () => {
    expect(provisionActive('nectar', 'spring')).toBe(true)
    expect(provisionActive('nectar', 'summer')).toBe(true)
    expect(provisionActive('nectar', 'autumn')).toBe(false)
    expect(provisionActive('nectar', 'winter')).toBe(false)
  })
  it('water and nest_high always active', () => {
    expect(provisionActive('water', 'winter')).toBe(true)
    expect(provisionActive('nest_high', 'winter')).toBe(true)
    expect(provisionActive('nuts', 'winter')).toBe(true)
  })
})
