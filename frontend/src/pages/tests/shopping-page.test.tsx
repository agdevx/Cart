// ABOUTME: Tests for the ShoppingPage trip management features
// ABOUTME: Verifies kebab menu actions (rename, delete, reopen) on trip cards

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as tripsQueryModule from '@/apis/agdevx-cart-api/trip/use-trips.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as updateTripModule from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import * as deleteTripModule from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import * as reopenTripModule from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import * as createTripModule from '@/apis/agdevx-cart-api/trip/create-trip.mutation'

import { ShoppingPage } from '../shopping-page'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockTrips: Trip[] = [
  {
    id: 'trip1',
    name: 'Weekly Groceries',
    householdId: null,
    createdByUserId: 'user1',
    isCompleted: false,
    completedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'trip2',
    name: 'Holiday Shopping',
    householdId: null,
    createdByUserId: 'user1',
    isCompleted: true,
    completedAt: '2024-01-20',
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: 'user1',
    modifiedDate: '2024-01-20',
  },
]

const updateMutateFn = vi.fn()
const deleteMutateFn = vi.fn()
const reopenMutateFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(tripsQueryModule, 'useTripsQuery').mockReturnValue({
    data: mockTrips,
    isLoading: false,
  } as any)

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: [] as Household[],
    isLoading: false,
  } as any)

  vi.spyOn(createTripModule, 'useCreateTripMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any)

  vi.spyOn(updateTripModule, 'useUpdateTripMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as any)

  vi.spyOn(deleteTripModule, 'useDeleteTripMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as any)

  vi.spyOn(reopenTripModule, 'useReopenTripMutation').mockReturnValue({
    mutate: reopenMutateFn,
    isPending: false,
  } as any)
}

describe('ShoppingPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders trip cards with kebab menus', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Both trips should appear
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText('Holiday Shopping')).toBeInTheDocument()

    //== Both should have kebab menu buttons
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    expect(kebabButtons).toHaveLength(2)
  })

  it('renames a trip via inline edit', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the first (active) trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])

    //== Click Rename
    fireEvent.click(screen.getByText('Rename'))

    //== Change name and press Enter
    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Saturday Groceries' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(updateMutateFn).toHaveBeenCalledWith({ tripId: 'trip1', name: 'Saturday Groceries' })
  })

  it('shows delete confirmation dialog', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the first trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])

    //== Click Delete in the kebab menu
    fireEvent.click(screen.getByText('Delete'))

    //== Confirm dialog should appear with trip name in the message
    expect(screen.getByText('Delete Trip')).toBeInTheDocument()
    expect(screen.getByText(/Delete "Weekly Groceries"\? This can't be undone\./)).toBeInTheDocument()
  })

  it('deletes a trip when confirmed', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu and click Delete
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Delete'))

    //== Click the Delete button in the confirmation dialog
    const dialogDeleteButton = screen.getByRole('button', { name: /^Delete$/i })
    fireEvent.click(dialogDeleteButton)

    expect(deleteMutateFn).toHaveBeenCalledWith('trip1')
  })

  it('cancels delete when Cancel is clicked', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu and click Delete
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Delete'))

    //== Verify dialog is showing
    expect(screen.getByText('Delete Trip')).toBeInTheDocument()

    //== Click Cancel
    fireEvent.click(screen.getByText('Cancel'))

    //== Dialog should disappear
    expect(screen.queryByText('Delete Trip')).not.toBeInTheDocument()
    //== Delete mutation should NOT be called
    expect(deleteMutateFn).not.toHaveBeenCalled()
  })

  it('reopens a completed trip', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the second (completed) trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[1])

    //== Click Reopen
    fireEvent.click(screen.getByText('Reopen'))

    expect(reopenMutateFn).toHaveBeenCalledWith('trip2')
  })

  it('navigates to the new trip after creation', async () => {
    const createdTrip: Trip = {
      id: 'new-trip-123',
      name: 'Weekend Run',
      householdId: null,
      createdByUserId: 'user1',
      isCompleted: false,
      completedAt: null,
      createdBy: 'user1',
      createdDate: '2024-02-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    const mutateAsyncFn = vi.fn().mockResolvedValue(createdTrip)

    setupMocks()

    //== Override the create mutation mock to use our tracked mutateAsync
    vi.spyOn(createTripModule, 'useCreateTripMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as any)

    render(<ShoppingPage />, { wrapper })

    //== Open the create form
    fireEvent.click(screen.getByText('Plan a new trip'))

    //== Fill in the trip name
    const input = screen.getByPlaceholderText('e.g., Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Weekend Run' } })

    //== Submit the form
    fireEvent.click(screen.getByText('Create Trip'))

    await waitFor(() => {
      expect(mutateAsyncFn).toHaveBeenCalledWith({
        name: 'Weekend Run',
        householdId: null,
      })
      expect(mockNavigate).toHaveBeenCalledWith('/shopping/new-trip-123')
    })
  })
})
