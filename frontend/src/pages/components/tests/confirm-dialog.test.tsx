// ABOUTME: Tests for the reusable confirmation dialog component
// ABOUTME: Verifies rendering, confirm/cancel actions, and destructive styling

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '../confirm-dialog'

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDialog
        title="Delete Trip"
        message='Delete "Weekly Groceries"? This can&apos;t be undone.'
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Trip')).toBeInTheDocument()
    expect(screen.getByText(/Delete "Weekly Groceries"/)).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Delete'))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables confirm button when isPending is true', () => {
    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isPending={true}
      />
    )

    expect(screen.getByText('Delete')).toBeDisabled()
  })

  describe('hold-to-confirm', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('should work normally without holdDuration (single click confirms)', () => {
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      fireEvent.click(screen.getByText('Confirm'))

      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should not fire confirm on single click when holdDuration is set', () => {
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.mouseDown(button)
      fireEvent.mouseUp(button)

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('should show progress bar when holdDuration is set', () => {
      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const progressBar = screen.getByTestId('hold-progress-bar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should fill progress bar during hold and fire confirm after duration', () => {
      vi.useFakeTimers()
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.mouseDown(button)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should reset progress bar when released early', () => {
      vi.useFakeTimers()
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.mouseDown(button)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      fireEvent.mouseUp(button)

      expect(onConfirm).not.toHaveBeenCalled()

      const progressBar = screen.getByTestId('hold-progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should reset progress when mouse leaves the button', () => {
      vi.useFakeTimers()
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.mouseDown(button)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      fireEvent.mouseLeave(button)

      expect(onConfirm).not.toHaveBeenCalled()

      const progressBar = screen.getByTestId('hold-progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should support touch events', () => {
      vi.useFakeTimers()
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.touchStart(button)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should reset on touchend before duration completes', () => {
      vi.useFakeTimers()
      const onConfirm = vi.fn()

      render(
        <ConfirmDialog
          title="Delete"
          message="Sure?"
          confirmLabel="Confirm"
          holdDuration={5000}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      )

      const button = screen.getByText('Confirm')
      fireEvent.touchStart(button)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      fireEvent.touchEnd(button)

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})
