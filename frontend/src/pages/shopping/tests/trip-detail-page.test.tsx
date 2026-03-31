// ABOUTME: Tests for TripDetailPage trip item edit/remove integration
// ABOUTME: Verifies TripItemRow kebab menus, inline edit, and remove actions

import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdQueryModule from '@/apis/agdevx-cart-api/household/use-household.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import * as addTripItemModule from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import * as deleteTripItemModule from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import * as startTripModule from '@/apis/agdevx-cart-api/trip/start-trip.mutation'
import * as updateTripItemModule from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

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
  createdByUserId: 'user1',
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  tripDate: null,
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
    storeName: 'Costco',
    quantity: 2,
    storeId: 'store1',
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
    storeName: 'Costco',
    quantity: 1,
    storeId: 'store1',
    notes: null,
    isChecked: false,
    checkedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'ti3',
    tripId: 'trip1',
    inventoryItemId: 'inv3',
    itemName: 'Apples',
    storeName: 'Walmart',
    quantity: 6,
    storeId: 'store3',
    notes: null,
    isChecked: false,
    checkedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'ti4',
    tripId: 'trip1',
    inventoryItemId: 'inv4',
    itemName: 'Eggs',
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

const mockHousehold: Household = {
  id: 'hh1',
  name: 'Test Household',
  owner1UserId: 'user1',
  owner2UserId: null,
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const startMutateAsyncFn = vi.fn().mockResolvedValue(mockTrip)
const updateMutateFn = vi.fn()
const deleteMutateFn = vi.fn()

const setupMocks = () => {
  vi.spyOn(tripQueryModule, 'useTripQuery').mockReturnValue({
    data: mockTrip,
    isLoading: false,
  } as unknown as ReturnType<typeof tripQueryModule.useTripQuery>)

  vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
    data: mockTripItems,
    isLoading: false,
  } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

  vi.spyOn(startTripModule, 'useStartTripMutation').mockReturnValue({
    mutateAsync: startMutateAsyncFn,
    isPending: false,
  } as unknown as ReturnType<typeof startTripModule.useStartTripMutation>)

  vi.spyOn(addTripItemModule, 'useAddTripItemMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof addTripItemModule.useAddTripItemMutation>)

  vi.spyOn(updateTripItemModule, 'useUpdateTripItemMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as unknown as ReturnType<typeof updateTripItemModule.useUpdateTripItemMutation>)

  vi.spyOn(deleteTripItemModule, 'useDeleteTripItemMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as unknown as ReturnType<typeof deleteTripItemModule.useDeleteTripItemMutation>)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: mockStores,
    isLoading: false,
  } as unknown as ReturnType<typeof storesQueryModule.useStoresQuery>)

  vi.spyOn(householdQueryModule, 'useHouseholdQuery').mockReturnValue({
    data: mockHousehold,
    isLoading: false,
  } as unknown as ReturnType<typeof householdQueryModule.useHouseholdQuery>)
}

describe('TripDetailPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders trip items using TripItemRow with kebab menus', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Planning context defaults to expanded, so items should be visible without clicking
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Apples')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()

    //== All should have kebab menu buttons (TripItemRow uses "Item actions" aria-label)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    expect(kebabButtons).toHaveLength(4)
  })

  it('edits a trip item via kebab menu', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Planning context defaults to expanded, so items are already visible
    //== Items are sorted alphabetically within each store group: Bread, Milk
    //== Open kebab menu on Milk (second item in Costco group)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[1])

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
      storeId: 'store1',
    })
  })

  it('removes a trip item via kebab menu', () => {
    setupMocks()
    render(<TripDetailPage />, { wrapper })

    //== Planning context defaults to expanded, items already visible
    //== Items are sorted alphabetically within each store group: Bread, Milk
    //== Open kebab menu on Milk (second item in Costco group)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    fireEvent.click(kebabButtons[1])

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
    } as unknown as ReturnType<typeof tripQueryModule.useTripQuery>)

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
    } as unknown as ReturnType<typeof tripQueryModule.useTripQuery>)

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

    //== Planning context defaults to expanded, items already visible
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

  describe('store grouping', () => {
    it('should group items by store name', () => {
      setupMocks()
      render(<TripDetailPage />, { wrapper })

      //== 3 accordion sections: "Costco", "Walmart", "Any Store"
      expect(screen.getByText('Costco')).toBeInTheDocument()
      expect(screen.getByText('Walmart')).toBeInTheDocument()
      expect(screen.getByText('Any Store')).toBeInTheDocument()
    })

    it('should show "Any Store" group for items without a store', () => {
      setupMocks()

      //== Override with items that have no store
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          { ...mockTripItems[0], storeName: null, storeId: null },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

      render(<TripDetailPage />, { wrapper })

      expect(screen.getByText('Any Store')).toBeInTheDocument()
    })

    it('should sort named stores alphabetically with "Any Store" last', () => {
      setupMocks()
      render(<TripDetailPage />, { wrapper })

      //== Get all accordion buttons (store group headers)
      const buttons = screen.getAllByRole('button').filter((btn) =>
        ['Costco', 'Walmart', 'Any Store'].some((name) => btn.textContent?.includes(name))
      )

      //== Verify order: Costco, Walmart, Any Store
      expect(buttons[0]).toHaveTextContent('Costco')
      expect(buttons[1]).toHaveTextContent('Walmart')
      expect(buttons[2]).toHaveTextContent('Any Store')
    })

    it('should default all accordions to expanded in planning context', () => {
      setupMocks()
      localStorage.removeItem('accordion-trip1-planning')
      render(<TripDetailPage />, { wrapper })

      //== Item names SHOULD be visible because planning context defaults to expanded
      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Bread')).toBeInTheDocument()
      expect(screen.getByText('Apples')).toBeInTheDocument()
      expect(screen.getByText('Eggs')).toBeInTheDocument()
    })

    it('should persist accordion state in localStorage', () => {
      setupMocks()
      localStorage.removeItem('accordion-trip1-planning')
      render(<TripDetailPage />, { wrapper })

      //== Planning defaults to expanded; collapse "Costco" section
      fireEvent.click(screen.getByText('Costco'))

      //== localStorage should have the collapsed state
      const stored = JSON.parse(localStorage.getItem('accordion-trip1-planning') || '{}')
      expect(stored['Costco']).toBe(false)
    })

    it('should display pantry notes in italics with "Pantry Notes:" label', () => {
      setupMocks()

      //== Override trip items to include inventoryItem with notes
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          {
            ...mockTripItems[0],
            inventoryItem: { id: 'inv1', name: 'Milk', notes: 'Buy organic', defaultStoreId: null },
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

      render(<TripDetailPage />, { wrapper })

      //== Planning defaults to expanded, items already visible
      //== Pantry notes should be visible with "Pantry Notes:" label
      expect(screen.getByText('Pantry Notes:')).toBeInTheDocument()
      expect(screen.getByText('Pantry Notes:')).toHaveClass('italic')
      //== The full <p> should contain the notes text
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Pantry Notes: Buy organic')).toBeInTheDocument()
    })

    it('should display trip notes below pantry notes', () => {
      setupMocks()

      //== Override trip items to have both pantry and trip notes
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          {
            ...mockTripItems[0],
            notes: 'Get 2 if on sale',
            inventoryItem: { id: 'inv1', name: 'Milk', notes: 'Buy organic', defaultStoreId: null },
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

      render(<TripDetailPage />, { wrapper })

      //== Planning defaults to expanded, items already visible
      //== Both notes should be visible with their label prefixes
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Pantry Notes: Buy organic')).toBeInTheDocument()
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Shopping Notes: Get 2 if on sale')).toBeInTheDocument()
    })

    it('should not show pantry notes when inventoryItem is null (deleted item)', () => {
      setupMocks()

      //== Override trip items with null inventoryItem (pantry item was deleted)
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          {
            ...mockTripItems[0],
            inventoryItemId: null,
            inventoryItem: null,
            notes: 'Trip note still here',
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

      render(<TripDetailPage />, { wrapper })

      //== Planning defaults to expanded, items already visible
      //== No "Pantry Notes:" label should be rendered
      expect(screen.queryByText('Pantry Notes:')).not.toBeInTheDocument()
      //== Trip notes should still be visible with "Shopping Notes:" label
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Shopping Notes: Trip note still here')).toBeInTheDocument()
    })

    it('should not show pantry notes when inventoryItem has no notes', () => {
      setupMocks()

      //== Override trip items with inventoryItem that has null notes
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          {
            ...mockTripItems[0],
            inventoryItem: { id: 'inv1', name: 'Milk', notes: null, defaultStoreId: null },
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof tripItemsQueryModule.useTripItemsQuery>)

      render(<TripDetailPage />, { wrapper })

      //== Planning defaults to expanded, items already visible
      //== No "Pantry Notes:" label should be rendered
      expect(screen.queryByText('Pantry Notes:')).not.toBeInTheDocument()
    })

    it('should show item count per store group', () => {
      setupMocks()
      render(<TripDetailPage />, { wrapper })

      //== Costco has 2 items, Walmart has 1, Any Store has 1
      const costcoHeader = screen.getByText('Costco').closest('button')!
      expect(costcoHeader).toHaveTextContent('2')

      const walmartHeader = screen.getByText('Walmart').closest('button')!
      expect(walmartHeader).toHaveTextContent('1')

      const anyStoreHeader = screen.getByText('Any Store').closest('button')!
      expect(anyStoreHeader).toHaveTextContent('1')
    })
  })
})
