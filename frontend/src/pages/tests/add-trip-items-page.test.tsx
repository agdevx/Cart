// ABOUTME: Tests for AddTripItemsPage batch item selection page
// ABOUTME: Verifies search, filtering, selection, quantity input, and add items button

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as addTripItemModule from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'

import { AddTripItemsPage } from '../add-trip-items-page'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip1' }),
    useNavigate: () => vi.fn(),
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

// One item already on the trip
const mockTripItems: TripItem[] = [
  {
    id: 'ti1',
    tripId: 'trip1',
    inventoryItemId: 'inv1',
    itemName: 'Milk',
    storeName: null,
    quantity: 2,
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

const mockInventory: InventoryItem[] = [
  {
    id: 'inv1',
    name: 'Milk',
    defaultStoreId: null,
    notes: null,
    ownerUserId: 'user1',
    householdId: null,
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'inv2',
    name: 'Bread',
    defaultStoreId: 'store1',
    notes: null,
    ownerUserId: 'user1',
    householdId: null,
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'inv3',
    name: 'Eggs',
    defaultStoreId: null,
    notes: null,
    ownerUserId: null,
    householdId: 'hh1',
    createdBy: 'user1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'inv4',
    name: 'Butter',
    defaultStoreId: null,
    notes: null,
    ownerUserId: 'user1',
    householdId: null,
    createdBy: 'user1',
    createdDate: '2024-01-01',
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
    name: 'Walmart',
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

const addMutateAsyncFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
    data: mockTrip,
    isLoading: false,
  } as any)

  vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
    data: mockTripItems,
    isLoading: false,
  } as any)

  vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
    data: mockInventory,
    isLoading: false,
  } as any)

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: mockHouseholds,
    isLoading: false,
  } as any)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: mockStores,
    isLoading: false,
  } as any)

  vi.spyOn(addTripItemModule, 'useAddTripItemMutation').mockReturnValue({
    mutateAsync: addMutateAsyncFn,
    isPending: false,
  } as any)
}

describe('AddTripItemsPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders search bar and item list', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Search bar should be present
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()

    //== Available items should appear (Milk is already on the trip, so excluded)
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText('Butter')).toBeInTheDocument()

    //== Milk should NOT appear (already on trip)
    expect(screen.queryByText('Milk')).not.toBeInTheDocument()
  })

  it('filters items by search text', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Type in search bar
    fireEvent.change(screen.getByPlaceholderText('Search items...'), {
      target: { value: 'egg' },
    })

    //== Only Eggs should be visible
    expect(screen.getByText('Eggs')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
    expect(screen.queryByText('Butter')).not.toBeInTheDocument()
  })

  it('excludes items already on the trip', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Milk (inv1) is on the trip — should not appear
    expect(screen.queryByText('Milk')).not.toBeInTheDocument()

    //== Other items should appear
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()
  })

  it('shows quantity input when item is selected', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== No quantity inputs initially
    expect(screen.queryByLabelText('Qty')).not.toBeInTheDocument()

    //== Click on Bread to select it
    fireEvent.click(screen.getByText('Bread'))

    //== Quantity input should appear
    expect(screen.getByLabelText('Qty')).toBeInTheDocument()
  })

  it('shows Add Items button with selected count when items are selected', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Button should not be visible initially (page title "Add Items" exists, but not the button with count)
    expect(screen.queryByText(/Add Items \(/)).not.toBeInTheDocument()

    //== Select Bread
    fireEvent.click(screen.getByText('Bread'))

    //== Button should appear with count
    expect(screen.getByText('Add Items (1 item)')).toBeInTheDocument()

    //== Select Eggs too
    fireEvent.click(screen.getByText('Eggs'))

    //== Button should update count
    expect(screen.getByText('Add Items (2 items)')).toBeInTheDocument()
  })

  it('shows store dropdown alongside quantity when item is selected', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Select Bread (has defaultStoreId: 'store1' = Costco)
    fireEvent.click(screen.getByText('Bread'))

    //== Quantity input should be visible
    expect(screen.getByLabelText('Qty')).toBeInTheDocument()

    //== Store dropdown should be visible
    const storeSelect = screen.getByLabelText('Store')
    expect(storeSelect).toBeInTheDocument()

    //== Store dropdown should be pre-populated with item's default store (Costco)
    expect(storeSelect).toHaveValue('store1')
  })

  it('shows store dropdown with empty value when item has no default store', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Select Eggs (has no defaultStoreId)
    fireEvent.click(screen.getByText('Eggs'))

    //== Store dropdown should be visible with empty value
    const storeSelect = screen.getByLabelText('Store')
    expect(storeSelect).toBeInTheDocument()
    expect(storeSelect).toHaveValue('')
  })

  it('allows overriding the store for a selected item', async () => {
    addMutateAsyncFn.mockResolvedValue({})
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Select Bread (default store: Costco / store1)
    fireEvent.click(screen.getByText('Bread'))

    //== Change store dropdown to Walmart (store2)
    const storeSelect = screen.getByLabelText('Store')
    fireEvent.change(storeSelect, { target: { value: 'store2' } })
    expect(storeSelect).toHaveValue('store2')

    //== Click "Add Items"
    fireEvent.click(screen.getByText('Add Items (1 item)'))

    //== Assert: addTripItem mutation called with storeId for Walmart
    expect(addMutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: 'trip1',
        inventoryItemId: 'inv2',
        quantity: 1,
        storeId: 'store2',
      })
    )
  })
})
