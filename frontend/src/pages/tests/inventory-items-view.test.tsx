import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as deleteInventoryModule from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import * as householdInventoryModule from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as mergedInventoryModule from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import * as personalInventoryModule from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryItemsView } from '../inventory-items-view'

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

const renderView = (filter = 'all') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InventoryItemsView filter={filter} />
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

describe('InventoryItemsView', () => {
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

    expect(screen.getByText('No inventory items yet. Add your first item!')).toBeInTheDocument()
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

    renderView('all')

    expect(screen.getByText('Loading inventory...')).toBeInTheDocument()
  })
})
