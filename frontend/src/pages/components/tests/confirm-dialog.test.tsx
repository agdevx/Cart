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
})
