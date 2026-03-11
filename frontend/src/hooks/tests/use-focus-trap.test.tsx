// ABOUTME: Tests for useFocusTrap hook — verifies Tab/Shift+Tab cycling within container

import { useRef } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useFocusTrap } from '../use-focus-trap'

function TrapHarness({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active)

  return (
    <div>
      <button data-testid="outside">Outside</button>
      <div ref={ref}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </div>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('cycles focus forward with Tab', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active={true} />)

    // Focus should start on first element
    expect(screen.getByTestId('first')).toHaveFocus()

    await user.tab()
    expect(screen.getByTestId('second')).toHaveFocus()

    await user.tab()
    expect(screen.getByTestId('third')).toHaveFocus()

    // Tab from last should wrap to first
    await user.tab()
    expect(screen.getByTestId('first')).toHaveFocus()
  })

  it('cycles focus backward with Shift+Tab', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active={true} />)

    // Focus starts on first — Shift+Tab should wrap to last
    expect(screen.getByTestId('first')).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByTestId('third')).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByTestId('second')).toHaveFocus()
  })

  it('does not trap focus when inactive', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active={false} />)

    // Focus should NOT be auto-set
    expect(screen.getByTestId('first')).not.toHaveFocus()

    // Tab should work normally (not trapped)
    screen.getByTestId('outside').focus()
    await user.tab()
    expect(screen.getByTestId('first')).toHaveFocus()
  })
})
