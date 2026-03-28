// ABOUTME: Tests for ActionCancelFormButtons shared component
// ABOUTME: Verifies cancel/submit rendering, spinner on pending, disabled state

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ActionCancelFormButtons } from '../action-cancel-form-buttons'

describe('ActionCancelFormButtons', () => {
  it('should render cancel and submit buttons', () => {
    render(
      <ActionCancelFormButtons
        onCancel={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />
    )
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('should show spinner when pending', () => {
    render(
      <ActionCancelFormButtons
        onCancel={vi.fn()}
        submitLabel="Save"
        isPending={true}
      />
    )
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should call onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Save"
        isPending={false}
      />
    )
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('should disable submit button when disabled prop is true', () => {
    render(
      <ActionCancelFormButtons
        onCancel={vi.fn()}
        submitLabel="Save"
        isPending={false}
        disabled={true}
      />
    )
    expect(screen.getByText('Save')).toBeDisabled()
  })
})
