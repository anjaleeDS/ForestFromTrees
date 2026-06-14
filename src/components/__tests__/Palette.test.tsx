import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Palette } from '../Palette'

describe('Palette', () => {
  it('lists all 8 placeables plus an erase tool and selects one', () => {
    const onSelect = vi.fn()
    render(<Palette selected="oak" tool="place" onSelect={onSelect} onErase={() => {}} />)
    expect(screen.getAllByRole('button').length).toBe(9)
    fireEvent.click(screen.getByRole('button', { name: /Pond/i }))
    expect(onSelect).toHaveBeenCalledWith('pond')
  })
})
