import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArrivalCard } from '../ArrivalCard'
import type { Resident } from '../../engine/types'

describe('ArrivalCard', () => {
  it('renders the arriving animal and dismisses', () => {
    const residents: Resident[] = [
      { animalId: 'pip', homeTile: { col: 1, row: 1 }, homeLight: 'open', stars: 2 },
    ]
    const onDismiss = vi.fn()
    render(<ArrivalCard animalId="pip" residents={residents} onDismiss={onDismiss} />)
    expect(screen.getByText(/Pip the Songbird/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /welcome/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
