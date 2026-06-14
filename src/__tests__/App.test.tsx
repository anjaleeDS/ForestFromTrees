import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('placing a pond and grass triggers an arrival card', () => {
    const { container } = render(<App />)
    const tiles = () => container.querySelectorAll<HTMLButtonElement>('.tile')

    fireEvent.click(screen.getByRole('button', { name: /Pond/i }))
    fireEvent.click(tiles()[2 * 16 + 2])

    fireEvent.click(screen.getByRole('button', { name: /Tall Grass/i }))
    fireEvent.click(tiles()[3 * 16 + 4])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/moved in/i)).toBeInTheDocument()
  })
})
