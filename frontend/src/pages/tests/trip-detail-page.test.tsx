// ABOUTME: Tests for TripDetailPage trip item edit/remove integration
// ABOUTME: Verifies TripItemRow kebab menus, inline edit, and remove actions

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import * as startTripModule from '@/apis/agdevx-cart-api/trip/start-trip.mutation'
import * as addTripItemModule from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import * as updateTripItemModule from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import * as deleteTripItemModule from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'

import { TripDetailPage } from '../trip-detail-page'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip1' }),
    useNavigate: () => mockNavigate,
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockTrip: Trip = {
  id: 'trip1',
  name: 'Weekly Groceries',
  householdId: null,
  createdByUserId: 'user1',
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  createdBy: 'user1',
  createdDate: '2024-01-15',
  modifiedBy: null,
  modifiedDate: null,
}

const mockTripItems: TripItem[] = [
  {
    id: 'ti1',
    tripId: 'trip1',
    inventoryItemId: 'inv1',
    itemName: 'Milk',
    storeName: null,
    quantity: 2,
    storeId: null,
    notes: 'Get the organic kind',
    isChecked: false,
    checkedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'ti2',
    tripId: 'trip1',
    inventoryItemId: 'inv2',
    itemName: 'Bread',
    storeName: null,
    quantity: 1,
    storeId: null,
    notes: null,
    isChecked: false,
    checkedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
]

const mockStores: Store[] = [
  {
    id: 'store1',
    name: 'Costco',
    householdId: null,
    userId: 'user1',
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'store2',
    name: 'Trader Joes',
    householdId: null,
    userId: 'user1',
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
]

const mockHouseholds: Household[] = [
  {
    id: 'hh1',
    name: 'Test Household',
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
]

const startMutateAsyncFn = vi.fn().mockResolvedValue(mockTrip)
const updateMutateFn = vi.fn()
const deleteMutateFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
    data: mockTrip,
    isLoading: false,
  } as any)

  vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
    data: mockTripItems,
    isLoading: false,
  } as any)

  vi.spyOn(startTripModule, 'useStartTripMutation').mockReturnValue({
    mutateAsync: startMutateAsyncFn,
    isPending: false,
  } as any)

  vi.spyOn(addTripItemModule, 'useAddTripItemMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any)

  vi.spyOn(updateTripItemModule, 'useUpdateTripItemMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as any)

  vi.spyOn(deleteTripItemModule, 'useDeleteTripItemMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as any)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: mockStores,
    isLoading: false,
  } as any)

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: mockHouseholds,
    isLoading: false,
  } as any)
}

describe('TripDetailPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders trip items using TripItemRow with kebab menus', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Both items should appear by name
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()

    //== Both should have kebab menu buttons (TripItemRow uses "Item actions" aria-label)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    expect(kebabButtons).toHaveLength(2)
  })

  it('edits a trip item via kebab menu', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Open kebab menu on first item (Milk)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])

    //== Click Edit
    fireEvent.click(screen.getByText('Edit'))

    //== Edit form should appear — change quantity
    const quantityInput = screen.getByLabelText('Quantity')
    fireEvent.change(quantityInput, { target: { value: '5' } })

    //== Click Save
    fireEvent.click(screen.getByText('Save'))

    expect(updateMutateFn).toHaveBeenCalledWith({
      tripItemId: 'ti1',
      tripId: 'trip1',
      quantity: 5,
      notes: 'Get the organic kind',
      storeId: null,
    })
  })

  it('removes a trip item via kebab menu', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Open kebab menu on first item (Milk)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])

    //== Click Remove
    fireEvent.click(screen.getByText('Remove'))

    expect(deleteMutateFn).toHaveBeenCalledWith({
      tripItemId: 'ti1',
      tripId: 'trip1',
    })
  })

  it('should show "Start Shopping" when trip is not started', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Button text should be "Start Shopping" for an unstarted trip
    expect(screen.getByText('Start Shopping')).toBeInTheDocument()
    expect(screen.queryByText('Continue Shopping')).not.toBeInTheDocument()
  })

  it('should show "Continue Shopping" when trip is already started', () => {
    setupMocks()

    //== Override trip to be started
    vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
      data: { ...mockTrip, isStarted: true, startedAt: '2024-01-15' },
      isLoading: false,
    } as any)

    render(<TripDetailPage />, { wrapper })

    //== Button text should be "Continue Shopping" for a started trip
    expect(screen.getByText('Continue Shopping')).toBeInTheDocument()
    expect(screen.queryByText('Start Shopping')).not.toBeInTheDocument()
  })

  it('should call start trip mutation when clicking "Start Shopping"', async () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Click Start Shopping button
    fireEvent.click(screen.getByText('Start Shopping'))

    await waitFor(() => {
      expect(startMutateAsyncFn).toHaveBeenCalledWith('trip1')
      expect(mockNavigate).toHaveBeenCalledWith('/shopping/trip1/active')
    })
  })

  it('should NOT call start trip mutation when clicking "Continue Shopping"', async () => {
    setupMocks()

    //== Override trip to be started
    vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
      data: { ...mockTrip, isStarted: true, startedAt: '2024-01-15' },
      isLoading: false,
    } as any)

    render(<TripDetailPage />, { wrapper })

    //== Click Continue Shopping button
    fireEvent.click(screen.getByText('Continue Shopping'))

    await waitFor(() => {
      //== Start mutation should NOT have been called
      expect(startMutateAsyncFn).not.toHaveBeenCalled()
      //== Should navigate directly to active page
      expect(mockNavigate).toHaveBeenCalledWith('/shopping/trip1/active')
    })
  })

  it('populates store dropdown in edit form', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Open kebab menu and click Edit on first item
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Store dropdown should contain our mock stores
    const storeSelect = screen.getByLabelText('Store')
    expect(storeSelect).toBeInTheDocument()

    //== Check options include both stores plus the "No store" default
    const options = storeSelect.querySelectorAll('option')
    expect(options).toHaveLength(3) // "No store" + 2 stores
    expect(options[0]).toHaveTextContent('No store')
    expect(options[1]).toHaveTextContent('Costco')
    expect(options[2]).toHaveTextContent('Trader Joes')
  })
})
