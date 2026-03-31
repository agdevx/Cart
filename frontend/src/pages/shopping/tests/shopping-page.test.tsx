// ABOUTME: Tests for the ShoppingPage trip management features
// ABOUTME: Verifies kebab menu actions (rename, delete, reopen) on trip cards

import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import * as createTripModule from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import * as deleteTripModule from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import * as reopenTripModule from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import * as updateTripModule from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import * as tripsQueryModule from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

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
    isStarted: true,
    startedAt: '2024-01-15',
    isCompleted: false,
    completedAt: null,
    tripDate: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: 'user1',
    modifiedDate: null,
  },
  {
    id: 'trip2',
    name: 'Holiday Shopping',
    householdId: null,
    isStarted: true,
    startedAt: '2024-01-15',
    isCompleted: true,
    completedAt: '2024-01-20',
    tripDate: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: 'user1',
    modifiedDate: '2024-01-20',
  },
  {
    id: 'trip3',
    name: 'Planned Trip',
    householdId: null,
    isStarted: false,
    startedAt: null,
    isCompleted: false,
    completedAt: null,
    tripDate: null,
    createdBy: 'user1',
    createdDate: '2024-01-22',
    modifiedBy: 'user1',
    modifiedDate: null,
  },
]

const updateMutateFn = vi.fn()
const deleteMutateFn = vi.fn()
const reopenMutateFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: 'user1', email: 'test@test.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })

  vi.spyOn(tripsQueryModule, 'useTripsQuery').mockReturnValue({
    data: mockTrips,
    isLoading: false,
  } as unknown as ReturnType<typeof tripsQueryModule.useTripsQuery>)

  vi.spyOn(createTripModule, 'useCreateTripMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof createTripModule.useCreateTripMutation>)

  vi.spyOn(updateTripModule, 'useUpdateTripMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as unknown as ReturnType<typeof updateTripModule.useUpdateTripMutation>)

  vi.spyOn(deleteTripModule, 'useDeleteTripMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as unknown as ReturnType<typeof deleteTripModule.useDeleteTripMutation>)

  vi.spyOn(reopenTripModule, 'useReopenTripMutation').mockReturnValue({
    mutate: reopenMutateFn,
    isPending: false,
  } as unknown as ReturnType<typeof reopenTripModule.useReopenTripMutation>)
}

describe('ShoppingPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders trip cards in three sections', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== In Progress and Planning trips should be visible
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText('Planned Trip')).toBeInTheDocument()

    //== Section headers should appear
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()

    //== Completed trips are in the DOM but inside a collapsed grid container
    const holidayElement = screen.getByText('Holiday Shopping')
    const overflowContainer = holidayElement.closest('.overflow-hidden')
    expect(overflowContainer).toBeInTheDocument()
    const gridContainer = overflowContainer?.parentElement
    expect(gridContainer?.className).toContain('grid-rows-[0fr]')

    //== All three trips have kebab menu buttons (completed trip is in DOM but visually collapsed)
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    expect(kebabButtons).toHaveLength(3)
  })

  it('expands completed accordion to show completed trips', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Click the Completed accordion button
    fireEvent.click(screen.getByText('Completed'))

    //== Completed trip should now be visible
    expect(screen.getByText('Holiday Shopping')).toBeInTheDocument()

    //== All three trips should now have kebab buttons
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    expect(kebabButtons).toHaveLength(3)
  })

  it('renames a trip via inline edit', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the first (active) trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])

    //== Click Edit (formerly "Rename")
    fireEvent.click(screen.getByText('Edit'))

    //== Change name in the edit form and click Save
    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Saturday Groceries' } })
    fireEvent.click(screen.getByText('Save'))

    expect(updateMutateFn).toHaveBeenCalledWith({ tripId: 'trip1', name: 'Saturday Groceries', tripDate: null })
  })

  it('deletes a trip after the 3-second long press completes', () => {
    vi.useFakeTimers()
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the first trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])

    //== Hold the delete button for the full duration
    const deleteBtn = screen.getByLabelText('Hold to delete trip')
    fireEvent.mouseDown(deleteBtn)

    //== Not fired yet
    expect(deleteMutateFn).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(3000) })

    expect(deleteMutateFn).toHaveBeenCalledWith('trip1')
  })

  it('does not delete a trip if the hold is released early', () => {
    vi.useFakeTimers()
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Open kebab menu on the first trip
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[0])

    //== Start and immediately cancel the hold
    const deleteBtn = screen.getByLabelText('Hold to delete trip')
    fireEvent.mouseDown(deleteBtn)
    fireEvent.mouseUp(deleteBtn)

    act(() => { vi.advanceTimersByTime(3000) })

    //== Timer was cancelled — mutation should not fire
    expect(deleteMutateFn).not.toHaveBeenCalled()
  })

  it('reopens a completed trip', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    //== Expand the completed accordion first
    fireEvent.click(screen.getByText('Completed'))

    //== Open kebab menu on the completed trip (Holiday Shopping)
    //== After expansion, there are 3 kebab buttons: trip1, trip3, trip2
    const kebabButtons = screen.getAllByLabelText('Trip actions')
    fireEvent.click(kebabButtons[2])

    //== Click Reopen
    fireEvent.click(screen.getByText('Reopen'))

    expect(reopenMutateFn).toHaveBeenCalledWith('trip2')
  })

  it('shows trip name error on blur when empty and clears when filled', async () => {
    setupMocks()
    const user = userEvent.setup()

    render(<ShoppingPage />, { wrapper })

    //== Open the create form via FAB
    await user.click(screen.getByRole('button', { name: 'Plan a Trip' }))

    //== Blur the trip name input without typing anything
    const input = screen.getByPlaceholderText('e.g., Weekly Groceries')
    await user.click(input)
    await user.tab()

    //== Error message should appear
    expect(screen.getByText('Trip name is required')).toBeInTheDocument()

    //== Type a name to clear the error
    await user.type(input, 'Weekend Run')
    expect(screen.queryByText('Trip name is required')).not.toBeInTheDocument()
  })

  it('navigates to the new trip after creation', async () => {
    const createdTrip: Trip = {
      id: 'new-trip-123',
      name: 'Weekend Run',
      householdId: null,
      isStarted: false,
      startedAt: null,
      isCompleted: false,
      completedAt: null,
      tripDate: null,
      createdBy: 'user1',
      createdDate: '2024-02-01',
      modifiedBy: 'user1',
      modifiedDate: null,
    }

    const mutateAsyncFn = vi.fn().mockResolvedValue(createdTrip)

    setupMocks()

    //== Override the create mutation mock to use our tracked mutateAsync
    vi.spyOn(createTripModule, 'useCreateTripMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as ReturnType<typeof createTripModule.useCreateTripMutation>)

    render(<ShoppingPage />, { wrapper })

    //== Open the create form via FAB
    fireEvent.click(screen.getByRole('button', { name: 'Plan a Trip' }))

    //== Fill in the trip name
    const input = screen.getByPlaceholderText('e.g., Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Weekend Run' } })

    //== Submit the form
    fireEvent.click(screen.getByText('Create'))

    const today = new Date()
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    await waitFor(() => {
      expect(mutateAsyncFn).toHaveBeenCalledWith({
        name: 'Weekend Run',
        tripDate: expectedDate,
        householdId: null,
      })
      expect(mockNavigate).toHaveBeenCalledWith('/shopping/new-trip-123')
    })
  })
})
