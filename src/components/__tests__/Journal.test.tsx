import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Journal } from '../Journal'
import type { Resident } from '../../engine/types'

describe('Journal', () => {
  it('shows hints for locked animals and full cards for residents', () => {
    const residents: Resident[] = [
      { animalId: 'ribbit', homeTile: { col: 4, row: 2 }, homeLight: 'open', stars: 3 },
    ]
    render(<Journal residents={residents} />)
    expect(screen.getByText(/Ribbit/)).toBeInTheDocument()
    expect(screen.getByText(/exclusively in vibes/i)).toBeInTheDocument()
    expect(screen.getByText(/Follows the sun and the flowers/i)).toBeInTheDocument()
    expect(screen.queryByText(/committed to sunshine/i)).not.toBeInTheDocument()
  })
})
