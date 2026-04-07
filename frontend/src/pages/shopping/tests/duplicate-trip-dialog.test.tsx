// ABOUTME: Tests for DuplicateTripDialog component
// ABOUTME: Verifies form fields, validation, submit behavior, and scope defaulting

import { createElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDuplicateTripMutation } from '@/apis/agdevx-cart-api/trip/duplicate-trip.mutation'

import { DuplicateTripDialog } from '../duplicate-trip-dialog'

vi.mock('@/apis/agdevx-cart-api/trip/duplicate-trip.mutation')

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('DuplicateTripDialog', () => {
  const mockMutate = vi.fn()
  const defaultProps = {
    sourceTripId: 'trip-123',
    sourceHouseholdId: null as string | null,
    household: null as { id: string; name: string } | null,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDuplicateTripMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDuplicateTripMutation>)
  })

  it('should render dialog with blank name and date', () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    expect(screen.getByText('Duplicate Trip')).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/trip name/i)
    expect(nameInput).toHaveValue('')

    const dateInput = screen.getByLabelText(/trip date/i)
    expect(dateInput).toHaveValue('')
  })

  it('should disable Create when name is empty', () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()
  })

  it('should enable Create when name is entered', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    const nameInput = screen.getByLabelText(/trip name/i)
    await userEvent.type(nameInput, 'My Trip')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeEnabled()
  })

  it('should call mutate with correct params on submit', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })

    await userEvent.type(screen.getByLabelText(/trip name/i), 'Weekly Run')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { sourceTripId: 'trip-123', name: 'Weekly Run', tripDate: null, householdId: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('should call onClose when Cancel is clicked', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
