import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Journal } from '../Journal'
import type { Resident } from '../../engine/types'

describe('Journal', () => {
  const ribbit: Resident = { animalId: 'ribbit', homeTile: { col: 4, row: 2 }, homeLight: 'open', stars: 3 }

  it('shows hints for locked animals and full cards for residents', () => {
    render(<Journal residents={[ribbit]} stirring={[]} />)
    expect(screen.getByText(/Ribbit/)).toBeInTheDocument()
    expect(screen.getByText(/exclusively in vibes/i)).toBeInTheDocument()
    expect(screen.getByText(/Follows the sun and the flowers/i)).toBeInTheDocument()
    expect(screen.queryByText(/committed to sunshine/i)).not.toBeInTheDocument()
  })

  it('shows the discovered counter reflecting residents', () => {
    render(<Journal residents={[ribbit]} stirring={[]} />)
    expect(screen.getByText(/1 of 6 discovered/i)).toBeInTheDocument()
  })

  it('renders a stirring locked animal with the nearby badge and stir copy, hiding its plain hint', () => {
    render(<Journal residents={[]} stirring={['quill']} />)
    expect(screen.getByText(/Something stirs nearby/i)).toBeInTheDocument()
    expect(screen.getByText('👀 nearby')).toBeInTheDocument()
    expect(screen.queryByText(/Rustles in the shadows/i)).not.toBeInTheDocument()
  })

  it('a non-stirring locked animal keeps its grey hint and no stir copy', () => {
    render(<Journal residents={[]} stirring={[]} />)
    expect(screen.getByText(/Rustles in the shadows/i)).toBeInTheDocument()
    expect(screen.queryByText(/Something stirs nearby/i)).not.toBeInTheDocument()
  })
})
