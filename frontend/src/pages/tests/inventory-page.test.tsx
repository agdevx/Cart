import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as deleteInventoryModule from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryPage } from '../inventory-page'

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InventoryPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('InventoryPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders segmented control with Items and Stores tabs', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [] as InventoryItem[],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Stores' })).toBeInTheDocument()
  })

  it('shows items view by default', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [] as InventoryItem[],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).toContain('bg-teal')
  })

  it('switches to stores view when Stores tab is clicked', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [] as InventoryItem[],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    const storesButton = screen.getByRole('tab', { name: 'Stores' })
    expect(storesButton.className).toContain('bg-teal')

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).not.toContain('bg-teal')
  })
})
