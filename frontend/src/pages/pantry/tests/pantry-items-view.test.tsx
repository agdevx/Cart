import { BrowserRouter } from 'react-router-dom'

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as createInventoryItemModule from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
import * as deleteInventoryModule from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import * as updateInventoryItemModule from '@/apis/agdevx-cart-api/inventory/update-inventory-item.mutation'
import * as householdInventoryModule from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as mergedInventoryModule from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import * as personalInventoryModule from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

import type { InventoryFilter } from '../pantry-items-view'
import { PantryItemsView } from '../pantry-items-view'

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'h2', name: 'Book Club', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockAllItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '2', name: 'Bread', defaultStoreId: null, notes: null, ownerUserId: null, householdId: 'h2', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockPersonalItems: InventoryItem[] = [
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockHouseholdItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockMergedItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockStores: Store[] = [
  { id: 's1', name: 'Costco', householdId: 'h1', userId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 's2', name: 'Corner Market', householdId: null, userId: 'user1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const renderView = (filter: InventoryFilter = 'all', options?: { showCreateForm?: boolean; onOpenCreateForm?: () => void; onCloseCreateForm?: () => void }) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PantryItemsView
          filter={filter}
          showCreateForm={options?.showCreateForm ?? false}
          onOpenCreateForm={options?.onOpenCreateForm ?? vi.fn()}
          onCloseCreateForm={options?.onCloseCreateForm ?? vi.fn()}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const setupDefaultMocks = () => {
  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: mockHouseholds,
    isLoading: false,
  } as UseQueryResult<Household[]>)

  vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, string>)
}

describe('PantryItemsView', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders items grouped by household in "all" filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: mockAllItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('all')

    //== Per-household section headers
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    expect(screen.getByText('Book Club')).toBeInTheDocument()
    expect(screen.getByText('Personal Items')).toBeInTheDocument()

    //== Items
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('My Snacks')).toBeInTheDocument()
  })

  it('renders only personal items with personal filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    expect(screen.getByText('My Snacks')).toBeInTheDocument()
    expect(screen.queryByText('Milk')).not.toBeInTheDocument()
    expect(screen.queryByText('Smith Family')).not.toBeInTheDocument()
  })

  it('renders only household items with household filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: mockHouseholdItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('household:h1')

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.queryByText('My Snacks')).not.toBeInTheDocument()
  })

  it('renders merged items with merged filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: mockMergedItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('merged:h1')

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('My Snacks')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  it('shows empty state when no items match', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: [] as InventoryItem[],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    expect(screen.getByText('No inventory items yet')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    const { container } = renderView('all')

    //== Skeleton loader divs should be visible with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders kebab menu buttons instead of delete buttons', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    //== Kebab menu button should be present, not a standalone Delete button
    expect(screen.getByLabelText('Item actions')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('opens kebab menu and shows delete option when clicked', async () => {
    setupDefaultMocks()
    const user = userEvent.setup()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    await user.click(screen.getByLabelText('Item actions'))

    //== Delete option should now be visible in the dropdown
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('shows confirm dialog when delete is clicked from kebab menu', async () => {
    setupDefaultMocks()
    const user = userEvent.setup()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    await user.click(screen.getByLabelText('Item actions'))
    await user.click(screen.getByText('Delete'))

    //== Confirm dialog should appear with item name
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(screen.getByText('Delete "My Snacks"? This can\'t be undone.')).toBeInTheDocument()
  })

  it('calls deleteMutation when confirm dialog is confirmed', async () => {
    const mockMutateAsync = vi.fn()
    vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    } as UseQueryResult<Household[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    const user = userEvent.setup()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    await user.click(screen.getByLabelText('Item actions'))
    await user.click(screen.getByText('Delete'))

    //== Click the confirm button in the dialog
    const dialog = screen.getByText('Delete Item').closest('div')!.parentElement!
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(mockMutateAsync).toHaveBeenCalledWith('3')
  })

  it('closes confirm dialog when cancel is clicked', async () => {
    setupDefaultMocks()
    const user = userEvent.setup()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    await user.click(screen.getByLabelText('Item actions'))
    await user.click(screen.getByText('Delete'))

    //== Dialog should be visible
    expect(screen.getByText('Delete Item')).toBeInTheDocument()

    //== Click cancel
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    //== Dialog should be gone
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument()
  })

  it('closes item kebab menu on Escape key', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    fireEvent.click(screen.getByLabelText('Item actions'))
    expect(screen.getByText('Delete')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  describe('inline create form', () => {
    const setupCreateFormMocks = () => {
      setupDefaultMocks()

      vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
        data: mockStores,
        isLoading: false,
      } as UseQueryResult<Store[]>)

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
        data: [] as InventoryItem[],
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)
    }

    it('should show inline add form when showCreateForm is true', () => {
      setupCreateFormMocks()

      renderView('all', { showCreateForm: true })

      //== Form fields should be visible
      expect(screen.getByLabelText('Item Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Scope')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Default Store (optional)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    })

    it('should not show inline add form when showCreateForm is false', () => {
      setupCreateFormMocks()

      renderView('all', { showCreateForm: false })

      expect(screen.queryByLabelText('Item Name')).not.toBeInTheDocument()
    })

    it('should create item and call onCloseCreateForm on submit', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      const mockOnClose = vi.fn()

      setupCreateFormMocks()

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      const user = userEvent.setup()

      //== filter='all' leaves scope blank — user must select one before submitting
      renderView('all', { showCreateForm: true, onCloseCreateForm: mockOnClose })

      await user.type(screen.getByLabelText('Item Name'), 'Bananas')

      //== Select personal scope to enable submit
      await user.click(screen.getByLabelText('Scope'))
      await user.click(screen.getByRole('button', { name: 'Personal' }))

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Bananas',
          notes: null,
          householdId: null,
          defaultStoreId: null,
        })
      })

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should create item with household scope', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      const mockOnClose = vi.fn()

      setupCreateFormMocks()

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      const user = userEvent.setup()

      renderView('all', { showCreateForm: true, onCloseCreateForm: mockOnClose })

      await user.type(screen.getByLabelText('Item Name'), 'Milk')

      //== Open scope dropdown and select the household
      //== ScopeSelect renders household name and description as separate elements
      await user.click(screen.getByLabelText('Scope'))
      const householdOption = screen.getByRole('button', { name: /Smith Family/ })
      await user.click(householdOption)

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Milk',
          notes: null,
          householdId: 'h1',
          defaultStoreId: null,
        })
      })
    })

    it('should submit with notes and default store', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})

      setupCreateFormMocks()

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      const user = userEvent.setup()

      //== filter='all' leaves scope blank — select personal first so the personal store appears
      renderView('all', { showCreateForm: true })

      await user.type(screen.getByLabelText('Item Name'), 'Eggs')
      await user.type(screen.getByLabelText('Notes (optional)'), 'Free range')

      //== Select personal scope to populate the store list
      await user.click(screen.getByLabelText('Scope'))
      await user.click(screen.getByRole('button', { name: 'Personal' }))

      //== Select a default store (s2 is the personal store "Corner Market")
      const storeSelect = screen.getByLabelText('Default Store (optional)')
      await user.selectOptions(storeSelect, 's2')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Eggs',
          notes: 'Free range',
          householdId: null,
          defaultStoreId: 's2',
        })
      })
    })

    it('should not submit when name is empty', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})

      setupCreateFormMocks()

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      const user = userEvent.setup()

      renderView('all', { showCreateForm: true })

      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it('shows item name error on blur when empty and clears when filled', async () => {
      setupCreateFormMocks()
      const user = userEvent.setup()

      renderView('all', { showCreateForm: true })

      //== Blur the item name input without typing anything
      const input = screen.getByLabelText('Item Name')
      await user.click(input)
      await user.tab()

      //== Error message should appear
      expect(screen.getByText('Item name is required')).toBeInTheDocument()

      //== Type a name to clear the error
      await user.type(input, 'Bananas')
      expect(screen.queryByText('Item name is required')).not.toBeInTheDocument()
    })
  })

  describe('inline edit form', () => {
    const setupEditMocks = () => {
      setupDefaultMocks()

      vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
        data: mockStores,
        isLoading: false,
      } as UseQueryResult<Store[]>)

      vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof createInventoryItemModule.useCreateInventoryItemMutation>)

      vi.spyOn(updateInventoryItemModule, 'useUpdateInventoryItemMutation').mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof updateInventoryItemModule.useUpdateInventoryItemMutation>)

      vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
        data: mockPersonalItems,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)
    }

    it('should show Edit option in kebab menu', async () => {
      setupEditMocks()
      const user = userEvent.setup()

      renderView('personal')

      await user.click(screen.getByLabelText('Item actions'))

      //== Both Edit and Delete should be visible in the kebab menu
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should expand inline edit form when Edit is clicked', async () => {
      setupEditMocks()
      const user = userEvent.setup()

      renderView('personal')

      await user.click(screen.getByLabelText('Item actions'))
      await user.click(screen.getByText('Edit'))

      //== Form fields should appear, pre-populated with current values
      const nameInput = screen.getByLabelText('Item Name')
      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toHaveValue('My Snacks')

      expect(screen.getByLabelText('Scope')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should save changes and collapse form on submit', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      setupEditMocks()

      vi.spyOn(updateInventoryItemModule, 'useUpdateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof updateInventoryItemModule.useUpdateInventoryItemMutation>)

      const user = userEvent.setup()

      renderView('personal')

      await user.click(screen.getByLabelText('Item actions'))
      await user.click(screen.getByText('Edit'))

      //== Change the name
      const nameInput = screen.getByLabelText('Item Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Snacks')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: '3',
          name: 'Updated Snacks',
          notes: null,
          householdId: null,
          ownerUserId: 'user1',
          defaultStoreId: null,
        })
      })

      //== Form should be collapsed after save
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
      })
    })

    it('should only allow one item to be edited at a time', async () => {
      setupEditMocks()

      //== Use all items so we have multiple items with kebab menus
      vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
        data: [
          { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
          { id: '4', name: 'My Drinks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
        ],
        isLoading: false,
      } as UseQueryResult<InventoryItem[]>)

      const user = userEvent.setup()

      renderView('personal')

      const kebabButtons = screen.getAllByLabelText('Item actions')

      //== Open edit on first item
      await user.click(kebabButtons[0])
      await user.click(screen.getByText('Edit'))

      //== First item's edit form should be open (sorted: My Drinks before My Snacks)
      expect(screen.getByLabelText('Item Name')).toHaveValue('My Drinks')

      //== Click edit on second item
      await user.click(kebabButtons[1])
      await user.click(screen.getByText('Edit'))

      //== Second item's edit form should be open, first should be closed
      //== Only one form should be present at a time
      const nameInputs = screen.getAllByLabelText('Item Name')
      expect(nameInputs).toHaveLength(1)
      expect(nameInputs[0]).toHaveValue('My Snacks')
    })

    it('should allow changing scope from Personal to Household', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      setupEditMocks()

      vi.spyOn(updateInventoryItemModule, 'useUpdateInventoryItemMutation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof updateInventoryItemModule.useUpdateInventoryItemMutation>)

      const user = userEvent.setup()

      renderView('personal')

      await user.click(screen.getByLabelText('Item actions'))
      await user.click(screen.getByText('Edit'))

      //== Change scope to Smith Family household
      await user.click(screen.getByLabelText('Scope'))
      const householdOption = screen.getByRole('button', { name: /Smith Family/ })
      await user.click(householdOption)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: '3',
          name: 'My Snacks',
          notes: null,
          householdId: 'h1',
          ownerUserId: null,
          defaultStoreId: null,
        })
      })
    })

    it('should collapse edit form when Cancel is clicked', async () => {
      setupEditMocks()
      const user = userEvent.setup()

      renderView('personal')

      await user.click(screen.getByLabelText('Item actions'))
      await user.click(screen.getByText('Edit'))

      //== Form should be visible
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()

      //== Click cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      //== Form should be gone
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })
  })
})
