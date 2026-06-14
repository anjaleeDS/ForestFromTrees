import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DebugOverlay } from '../DebugOverlay'

describe('DebugOverlay', () => {
  it('toggles and changes provision type', () => {
    const onToggle = vi.fn(); const onProvision = vi.fn()
    render(<DebugOverlay show provisionType="water" onToggle={onToggle} onProvision={onProvision} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    expect(onToggle).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'nectar' } })
    expect(onProvision).toHaveBeenCalledWith('nectar')
  })
})
