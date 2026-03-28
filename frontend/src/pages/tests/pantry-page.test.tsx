import { BrowserRouter } from 'react-router-dom'

import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { PantryPage } from '../pantry-page'

//== Mock PantryItemsView so we can inspect its props without setting up all inventory hooks
vi.mock('../pantry-items-view', () => ({
  PantryItemsView: ({ filter, showCreateForm, onCloseCreateForm }: { filter: string; showCreateForm: boolean; onCloseCreateForm: () => void }) => (
    <div data-testid="pantry-items-view" data-filter={filter} data-show-create-form={String(showCreateForm)}>
      Items view with filter: {filter}
      {showCreateForm && <span data-testid="create-form-visible">Form visible</span>}
      <button data-testid="close-create-form" onClick={onCloseCreateForm}>Close form</button>
    </div>
  ),
}))

//== Mock PantryStoresView
vi.mock('../pantry-stores-view', () => ({
  PantryStoresView: () => <div data-testid="pantry-stores-view">Stores view</div>,
}))

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'h2', name: 'Book Club', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockInventoryItems: InventoryItem[] = [
  { id: 'item1', name: 'Milk', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PantryPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('PantryPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()

    vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    } as UseQueryResult<Household[]>)

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: mockInventoryItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)
  })

  it('renders segmented control with Items and Stores tabs', () => {
    renderPage()

    expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Stores' })).toBeInTheDocument()
  })

  it('shows items view by default with filter tabs', () => {
    renderPage()

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).toContain('bg-teal')

    expect(screen.getByTestId('pantry-items-view')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Filter inventory' })).toBeInTheDocument()
  })

  it('renders filter tabs for all, personal, and each household', () => {
    renderPage()

    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Smith Family' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Book Club' })).toBeInTheDocument()
  })

  it('passes filter value to PantryItemsView', () => {
    renderPage()

    const view = screen.getByTestId('pantry-items-view')
    expect(view).toHaveAttribute('data-filter', 'all')
  })

  it('updates filter when a filter tab is clicked', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }))

    const view = screen.getByTestId('pantry-items-view')
    expect(view).toHaveAttribute('data-filter', 'personal')
  })

  it('updates filter to household when household tab is clicked', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Smith Family' }))

    const view = screen.getByTestId('pantry-items-view')
    expect(view).toHaveAttribute('data-filter', 'household:h1')
  })

  it('renders Add Item button that toggles inline create form', () => {
    renderPage()

    const button = screen.getByRole('button', { name: /add item/i })
    expect(button).toBeInTheDocument()

    //== Initially, create form should not be visible
    expect(screen.getByTestId('pantry-items-view')).toHaveAttribute('data-show-create-form', 'false')
  })

  it('toggles showCreateForm when Add Item button is clicked', () => {
    renderPage()

    const button = screen.getByRole('button', { name: /add item/i })
    fireEvent.click(button)

    //== After clicking, form should be visible and button text should change to Cancel
    expect(screen.getByTestId('pantry-items-view')).toHaveAttribute('data-show-create-form', 'true')
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('hides Add Item button when inventory is empty', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderPage()

    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument()
  })

  it('closes create form when onCloseCreateForm is called', () => {
    renderPage()

    //== Open the form
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))
    expect(screen.getByTestId('pantry-items-view')).toHaveAttribute('data-show-create-form', 'true')

    //== Simulate the child calling onCloseCreateForm
    fireEvent.click(screen.getByTestId('close-create-form'))
    expect(screen.getByTestId('pantry-items-view')).toHaveAttribute('data-show-create-form', 'false')
  })

  it('hides filter tabs when Stores tab is active', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    expect(screen.queryByRole('tablist', { name: 'Filter inventory' })).not.toBeInTheDocument()
    expect(screen.getByTestId('pantry-stores-view')).toBeInTheDocument()
  })

  it('switches to stores view when Stores tab is clicked', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    const storesButton = screen.getByRole('tab', { name: 'Stores' })
    expect(storesButton.className).toContain('bg-teal')

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).not.toContain('bg-teal')
  })
})
