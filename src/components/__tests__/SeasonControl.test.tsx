import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SeasonControl } from '../SeasonControl'

describe('SeasonControl', () => {
  it('shows the four seasons and reports selection', () => {
    const onChange = vi.fn()
    render(<SeasonControl season="spring" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /winter/i }))
    expect(onChange).toHaveBeenCalledWith('winter')
  })
})
