// ABOUTME: Tests for the ActiveTripPage with TripItemRow integration
// ABOUTME: Verifies checkbox toggle, kebab menu edit/remove, and checked item styling

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as checkTripItemModule from '@/apis/agdevx-cart-api/trip/check-trip-item.mutation'
import * as completeTripModule from '@/apis/agdevx-cart-api/trip/complete-trip.mutation'
import * as updateTripItemModule from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import * as deleteTripItemModule from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'

import { ActiveTripPage } from '../active-trip-page'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip1' }),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/hooks/use-sse', () => ({
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
  createdByUserId: 'user1',
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
    quantity: 2,
    storeId: null,
    notes: 'Get organic',
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
    quantity: 1,
    storeId: null,
    notes: null,
    isChecked: true,
    checkedAt: '2024-01-16',
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

const checkMutateAsyncFn = vi.fn()
const completeMutateAsyncFn = vi.fn()
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

  vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
    data: mockInventory,
    isLoading: false,
  } as any)

  vi.spyOn(checkTripItemModule, 'useCheckTripItemMutation').mockReturnValue({
    mutateAsync: checkMutateAsyncFn,
    isPending: false,
  } as any)

  vi.spyOn(completeTripModule, 'useCompleteTripMutation').mockReturnValue({
    mutateAsync: completeMutateAsyncFn,
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

describe('ActiveTripPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders trip items with checkboxes and kebab menus', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Both items should appear
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()

    //== Checkboxes should be rendered
    const checkboxes = screen.getAllByTestId('item-checkbox')
    expect(checkboxes).toHaveLength(2)

    //== Kebab menu buttons should be rendered
    const kebabButtons = screen.getAllByLabelText('Item actions')
    expect(kebabButtons).toHaveLength(2)
  })

  it('toggles check when clicking an item row', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Click the unchecked item (Milk) — the row itself should toggle
    fireEvent.click(screen.getByText('Milk'))

    expect(checkMutateAsyncFn).toHaveBeenCalledWith({
      tripId: 'trip1',
      tripItemId: 'ti1',
      isChecked: true,
    })
  })

  it('opens edit form via kebab menu and saves updated quantity', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Open kebab menu on Milk item
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])

    //== Click Edit
    fireEvent.click(screen.getByText('Edit'))

    //== Edit form should appear with quantity input
    const quantityInput = screen.getByLabelText('Quantity')
    expect(quantityInput).toBeInTheDocument()

    //== Change quantity to 5
    fireEvent.change(quantityInput, { target: { value: '5' } })

    //== Click Save
    fireEvent.click(screen.getByText('Save'))

    //== onUpdate should be called (via handleUpdateItem)
    expect(updateMutateFn).toHaveBeenCalled()
  })

  it('removes an item via kebab menu', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Open kebab menu on Milk item
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])

    //== Click Remove
    fireEvent.click(screen.getByText('Remove'))

    //== onDelete should be called (via handleDeleteItem)
    expect(deleteMutateFn).toHaveBeenCalled()
  })

  it('shows strikethrough styling on checked items', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Bread (ti2) is checked — should have line-through styling
    const breadElement = screen.getByText('Bread')
    expect(breadElement).toHaveClass('line-through')

    //== Milk (ti1) is not checked — should NOT have line-through styling
    const milkElement = screen.getByText('Milk')
    expect(milkElement).not.toHaveClass('line-through')
  })

  it('does not toggle check when editing', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Open kebab menu and click Edit on Milk item
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Clear any calls from setup
    checkMutateAsyncFn.mockClear()

    //== Click on the item row — should NOT toggle check because editing
    fireEvent.click(screen.getByText('Milk'))

    expect(checkMutateAsyncFn).not.toHaveBeenCalled()
  })
})
