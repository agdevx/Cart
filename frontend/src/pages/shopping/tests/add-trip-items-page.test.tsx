// ABOUTME: Tests for AddTripItemsPage batch item selection page
// ABOUTME: Verifies search, filtering, selection, quantity input, and add items button

import { BrowserRouter } from 'react-router-dom'

import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdQueryModule from '@/apis/agdevx-cart-api/household/use-household.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import * as addTripItemModule from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { AddTripItemsPage } from '../add-trip-items-page'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip1' }),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/services/use-sse.service', () => ({
  useSSE: vi.fn(),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockTrip: Trip = {
  id: 'trip1',
  name: 'Weekly Groceries',
  householdId: null,
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  tripDate: null,
  createdBy: 'user1',
  createdDate: '2024-01-15',
  modifiedBy: 'user1',
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
    isHouseholdItem: false,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: 'user1',
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

const mockHousehold: Household = {
  id: 'hh1',
  name: 'Test Household',
  owner1UserId: 'user1',
  owner2UserId: null,
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: 'user1',
  modifiedDate: null,
}

const addMutateAsyncFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
    data: mockTrip,
    isLoading: false,
  } as unknown as UseQueryResult<Trip>)

  vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
    data: mockTripItems,
    isLoading: false,
  } as unknown as UseQueryResult<TripItem[]>)

  vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
    data: mockInventory,
    isLoading: false,
  } as unknown as UseQueryResult<InventoryItem[]>)

  vi.spyOn(householdQueryModule, 'useHouseholdQuery').mockReturnValue({
    data: mockHousehold,
    isLoading: false,
  } as unknown as UseQueryResult<Household | null>)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: mockStores,
    isLoading: false,
  } as unknown as UseQueryResult<Store[]>)

  vi.spyOn(addTripItemModule, 'useAddTripItemMutation').mockReturnValue({
    mutateAsync: addMutateAsyncFn,
    isPending: false,
  } as unknown as ReturnType<typeof addTripItemModule.useAddTripItemMutation>)
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
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()

    //== Click on Bread to select it
    fireEvent.click(screen.getByText('Bread'))

    //== Quantity input should appear
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
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
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()

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

  it('shows store filter segmented control with All option and store names', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== There should be two tablists: source filter and store filter
    const tablists = screen.getAllByRole('tablist')
    expect(tablists.length).toBe(2)

    //== Store filter should have "All" tab plus each store name
    const storeTablist = tablists[1]
    const storeTabs = storeTablist.querySelectorAll('[role="tab"]')
    expect(storeTabs.length).toBe(3) // All + Costco + Walmart
    expect(storeTabs[0].textContent).toBe('All')
    expect(storeTabs[1].textContent).toBe('Costco')
    expect(storeTabs[2].textContent).toBe('Walmart')
  })

  it('populates store filter with stores matching current source scope', () => {
    //== Add a household store to the mock data
    const householdStore: Store = {
      id: 'store3',
      name: 'H-Mart',
      householdId: 'hh1',
      userId: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
      data: mockTrip,
      isLoading: false,
    } as unknown as UseQueryResult<Trip>)
    vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
      data: mockTripItems,
      isLoading: false,
    } as unknown as UseQueryResult<TripItem[]>)
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: mockInventory,
      isLoading: false,
    } as unknown as UseQueryResult<InventoryItem[]>)
    vi.spyOn(householdQueryModule, 'useHouseholdQuery').mockReturnValue({
      data: mockHousehold,
      isLoading: false,
    } as unknown as UseQueryResult<Household | null>)
    vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
      data: [...mockStores, householdStore],
      isLoading: false,
    } as unknown as UseQueryResult<Store[]>)
    vi.spyOn(addTripItemModule, 'useAddTripItemMutation').mockReturnValue({
      mutateAsync: addMutateAsyncFn,
      isPending: false,
    } as unknown as ReturnType<typeof addTripItemModule.useAddTripItemMutation>)

    render(<AddTripItemsPage />, { wrapper })

    //== Click on "Test Household Household" source filter
    fireEvent.click(screen.getByRole('tab', { name: 'Test Household Household' }))

    //== Store filter should show only household store (H-Mart) + All
    const tablists = screen.getAllByRole('tablist')
    const storeTablist = tablists[1]
    const storeTabs = storeTablist.querySelectorAll('[role="tab"]')
    expect(storeTabs.length).toBe(2) // All + H-Mart
    expect(storeTabs[0].textContent).toBe('All')
    expect(storeTabs[1].textContent).toBe('H-Mart')
  })

  it('filters items by selected store', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== All non-trip items visible initially: Bread, Eggs, Butter
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText('Butter')).toBeInTheDocument()

    //== Click on "Costco" in store filter
    const tablists = screen.getAllByRole('tablist')
    const costcoTab = tablists[1].querySelector('[role="tab"]:nth-child(2)')!
    fireEvent.click(costcoTab)

    //== Only Bread should be visible (defaultStoreId = 'store1' = Costco)
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Eggs')).not.toBeInTheDocument()
    expect(screen.queryByText('Butter')).not.toBeInTheDocument()
  })

  it('resets store filter to All when source filter changes', () => {
    setupMocks()
    render(<AddTripItemsPage />, { wrapper })

    //== Select Costco in store filter
    const tablists = screen.getAllByRole('tablist')
    const costcoTab = tablists[1].querySelector('[role="tab"]:nth-child(2)')!
    fireEvent.click(costcoTab)

    //== Costco tab should be selected
    expect(costcoTab).toHaveAttribute('aria-selected', 'true')

    //== Change source filter from All to Personal
    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }))

    //== Store filter should reset — "All" tab should be selected
    const updatedTablists = screen.getAllByRole('tablist')
    const allStoreTab = updatedTablists[1].querySelector('[role="tab"]:first-child')!
    expect(allStoreTab).toHaveAttribute('aria-selected', 'true')
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
