// ABOUTME: Tests for the ActiveTripPage with TripItemRow integration
// ABOUTME: Verifies checkbox toggle, kebab menu edit/remove, and checked item styling

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsQueryModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
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
  isStarted: true,
  startedAt: '2024-01-15',
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
    storeName: 'Costco',
    quantity: 2,
    storeId: 'store1',
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
    itemName: 'Bread',
    storeName: 'Costco',
    quantity: 1,
    storeId: 'store1',
    notes: null,
    isChecked: true,
    checkedAt: '2024-01-16',
    createdBy: 'user1',
    createdDate: '2024-01-15',
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

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

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

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

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

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

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

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

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

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

    //== Bread (ti2) is checked — should have line-through styling
    const breadElement = screen.getByText('Bread')
    expect(breadElement).toHaveClass('line-through')

    //== Milk (ti1) is not checked — should NOT have line-through styling
    const milkElement = screen.getByText('Milk')
    expect(milkElement).not.toHaveClass('line-through')
  })

  it('shows styled confirmation dialog when completing with unchecked items', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Click Complete Trip — Milk (ti1) is unchecked so dialog should appear
    fireEvent.click(screen.getByText('Complete Trip'))

    //== Dialog should show the friendly message
    expect(screen.getByText('Hold on!')).toBeInTheDocument()
    expect(screen.getByText('It looks like you may have missed some items. Are you sure you want to complete your trip?')).toBeInTheDocument()
    expect(screen.getByText('Complete Anyway')).toBeInTheDocument()
    expect(screen.getByText('Keep Shopping')).toBeInTheDocument()

    //== Complete mutation should NOT have been called yet
    expect(completeMutateAsyncFn).not.toHaveBeenCalled()
  })

  it('closes confirmation dialog when clicking Keep Shopping', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Open the dialog
    fireEvent.click(screen.getByText('Complete Trip'))
    expect(screen.getByText('Hold on!')).toBeInTheDocument()

    //== Click Keep Shopping
    fireEvent.click(screen.getByText('Keep Shopping'))

    //== Dialog should be dismissed
    expect(screen.queryByText('Hold on!')).not.toBeInTheDocument()
    expect(completeMutateAsyncFn).not.toHaveBeenCalled()
  })

  it('calls complete mutation when clicking Complete Anyway', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Open the dialog
    fireEvent.click(screen.getByText('Complete Trip'))

    //== Click Complete Anyway
    fireEvent.click(screen.getByText('Complete Anyway'))

    //== Complete mutation should be called
    expect(completeMutateAsyncFn).toHaveBeenCalledWith('trip1')
  })

  it('completes trip directly when all items are checked', () => {
    setupMocks()

    //== Override trip items so all are checked
    vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
      data: mockTripItems.map((item) => ({ ...item, isChecked: true })),
      isLoading: false,
    } as any)

    render(<ActiveTripPage />, { wrapper })

    //== Click Complete Trip — all items checked, no dialog should appear
    fireEvent.click(screen.getByText('Complete Trip'))

    //== Should complete directly without showing the dialog
    expect(screen.queryByText('Hold on!')).not.toBeInTheDocument()
    expect(completeMutateAsyncFn).toHaveBeenCalledWith('trip1')
  })

  it('should not toggle checkbox when kebab menu is tapped (mobile touch)', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

    //== Find the kebab button for the unchecked item (Milk)
    const kebabButtons = screen.getAllByLabelText('Item actions')
    const milkKebab = kebabButtons[0]

    //== Simulate mobile touch event chain: touchstart → touchend → mousedown → click
    //== On real mobile devices, the mousedown event bubbles from the kebab to the
    //== parent row before click-level stopPropagation can prevent it. We fire mouseDown
    //== separately to verify the kebab container stops propagation at the mousedown level.
    fireEvent.touchStart(milkKebab)
    fireEvent.touchEnd(milkKebab)
    fireEvent.mouseDown(milkKebab)
    fireEvent.click(milkKebab)

    //== Check mutation should NOT have been called — kebab tap should not toggle checkbox
    expect(checkMutateAsyncFn).not.toHaveBeenCalled()

    //== Kebab menu should be open (Edit/Remove options visible)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('should show "Update Shopping List" link instead of "Back to Planning"', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Link text should be "Update Shopping List", not "Back to Planning"
    expect(screen.getByText('Update Shopping List')).toBeInTheDocument()
    expect(screen.queryByText('Back to Planning')).not.toBeInTheDocument()
  })

  it('does not toggle check when editing', () => {
    setupMocks()
    render(<ActiveTripPage />, { wrapper })

    //== Expand Costco accordion to reveal items
    fireEvent.click(screen.getByText('Costco'))

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

  describe('dual notes display', () => {
    it('should display pantry notes in italics with "Pantry:" label', () => {
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
      } as any)

      render(<ActiveTripPage />, { wrapper })

      //== Expand Costco accordion to reveal items
      fireEvent.click(screen.getByText('Costco'))

      //== Pantry notes should be visible with "Pantry Notes:" label + notes text
      expect(screen.getByText('Pantry Notes:')).toBeInTheDocument()
      expect(screen.getByText('Pantry Notes:')).toHaveClass('italic')
      //== The full <p> should contain the notes text
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Pantry Notes: Buy organic')).toBeInTheDocument()
    })

    it('should display both pantry and trip notes', () => {
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
      } as any)

      render(<ActiveTripPage />, { wrapper })

      //== Expand Costco accordion to reveal items
      fireEvent.click(screen.getByText('Costco'))

      //== Both notes should be visible — pantry with "Pantry Notes:" label, shopping with "Shopping Notes:" label
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Pantry Notes: Buy organic')).toBeInTheDocument()
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Shopping Notes: Get 2 if on sale')).toBeInTheDocument()
    })

    it('should not show pantry notes when inventoryItem is null', () => {
      setupMocks()

      //== Override trip items with null inventoryItem (deleted pantry item)
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: [
          {
            ...mockTripItems[0],
            inventoryItemId: null,
            inventoryItem: null,
            notes: 'Trip note only',
          },
        ],
        isLoading: false,
      } as any)

      render(<ActiveTripPage />, { wrapper })

      //== Expand Costco accordion to reveal items
      fireEvent.click(screen.getByText('Costco'))

      //== No "Pantry Notes:" label should be rendered
      expect(screen.queryByText('Pantry Notes:')).not.toBeInTheDocument()
      //== Trip notes should still show with "Shopping Notes:" label
      expect(screen.getByText((_, el) => el?.tagName === 'P' && el?.textContent === 'Shopping Notes: Trip note only')).toBeInTheDocument()
    })
  })

  describe('store grouping', () => {
    it('should group items by store on active trip page', () => {
      setupMocks()
      render(<ActiveTripPage />, { wrapper })

      //== Costco accordion should be visible
      expect(screen.getByText('Costco')).toBeInTheDocument()
    })

    it('should show checked count in accordion header', () => {
      setupMocks()
      render(<ActiveTripPage />, { wrapper })

      //== Costco has 2 items, 1 checked (Bread) — header should show "1/2"
      const costcoHeader = screen.getByText('Costco').closest('button')!
      expect(costcoHeader).toHaveTextContent('1/2')
    })

    it('should default all accordions to collapsed', () => {
      setupMocks()
      localStorage.removeItem('accordion-trip1-shopping')
      render(<ActiveTripPage />, { wrapper })

      //== Item names should NOT be visible because accordions default to collapsed
      expect(screen.queryByText('Milk')).not.toBeInTheDocument()
      expect(screen.queryByText('Bread')).not.toBeInTheDocument()
    })

    it('should auto-collapse store group when all items are checked', () => {
      setupMocks()

      //== Override: all Costco items are checked
      vi.spyOn(tripItemsQueryModule, 'useTripItemsQuery').mockReturnValue({
        data: mockTripItems.map((item) => ({ ...item, isChecked: true, checkedAt: '2024-01-16' })),
        isLoading: false,
      } as any)

      //== Pre-set localStorage with Costco expanded
      localStorage.setItem('accordion-trip1-shopping', JSON.stringify({ Costco: true }))

      render(<ActiveTripPage />, { wrapper })

      //== Costco should have auto-collapsed because all items are checked
      //== Items should not be visible
      expect(screen.queryByText('Milk')).not.toBeInTheDocument()
      expect(screen.queryByText('Bread')).not.toBeInTheDocument()
    })
  })
})
