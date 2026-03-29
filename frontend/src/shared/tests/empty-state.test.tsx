// ABOUTME: Tests for EmptyState component — renders icon, title, subtitle, CTA, and fires callbacks

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingCart } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState } from '../empty-state'

describe('EmptyState', () => {
  it('renders icon, title, and subtitle', () => {
    render(
      <EmptyState
        icon={ShoppingCart}
        title="No trips yet"
        subtitle="Create your first shopping trip to get started"
      />,
    )

    expect(screen.getByText('No trips yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first shopping trip to get started')).toBeInTheDocument()
  })

  it('renders without subtitle when not provided', () => {
    render(<EmptyState icon={ShoppingCart} title="No items in this trip" />)

    expect(screen.getByText('No items in this trip')).toBeInTheDocument()
  })

  it('renders CTA button when actionLabel and onAction provided', () => {
    const onAction = vi.fn()
    render(
      <EmptyState
        icon={ShoppingCart}
        title="No trips yet"
        subtitle="Create your first shopping trip"
        actionLabel="Create Trip"
        onAction={onAction}
      />,
    )

    expect(screen.getByRole('button', { name: 'Create Trip' })).toBeInTheDocument()
  })

  it('does not render CTA button when actionLabel is not provided', () => {
    render(
      <EmptyState
        icon={ShoppingCart}
        title="No trips yet"
        subtitle="Some subtitle"
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('fires onAction when CTA button is clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <EmptyState
        icon={ShoppingCart}
        title="No trips yet"
        actionLabel="Create Trip"
        onAction={onAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create Trip' }))

    expect(onAction).toHaveBeenCalledOnce()
  })
})
