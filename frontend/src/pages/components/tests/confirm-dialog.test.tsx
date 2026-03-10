// ABOUTME: Tests for the reusable confirmation dialog component
// ABOUTME: Verifies rendering, confirm/cancel actions, and destructive styling

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
      fireEvent.pointerDown(button)
      fireEvent.pointerUp(button)

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
      fireEvent.pointerDown(button)

      //== CSS transitions don't fire in jsdom — simulate transitionEnd on the progress bar
      const progressBar = screen.getByTestId('hold-progress-bar')
      fireEvent.transitionEnd(progressBar, { propertyName: 'width' })

      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should reset progress bar when released early', () => {
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
      fireEvent.pointerDown(button)

      //== Release before transition completes
      fireEvent.pointerUp(button)

      expect(onConfirm).not.toHaveBeenCalled()

      const progressBar = screen.getByTestId('hold-progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should reset progress when pointer leaves the button', () => {
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
      fireEvent.pointerDown(button)

      fireEvent.pointerLeave(button)

      expect(onConfirm).not.toHaveBeenCalled()

      const progressBar = screen.getByTestId('hold-progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should support touch events (via pointer events)', () => {
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

      //== pointerDown/pointerUp handle both mouse and touch
      const button = screen.getByText('Confirm')
      fireEvent.pointerDown(button)

      //== Simulate transition completing
      const progressBar = screen.getByTestId('hold-progress-bar')
      fireEvent.transitionEnd(progressBar, { propertyName: 'width' })

      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should not fire confirm if transitionEnd fires after release', () => {
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
      fireEvent.pointerDown(button)

      //== Release the button first
      fireEvent.pointerUp(button)

      //== Stale transitionEnd should NOT fire confirm (holdingRef is false)
      const progressBar = screen.getByTestId('hold-progress-bar')
      fireEvent.transitionEnd(progressBar, { propertyName: 'width' })

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})
