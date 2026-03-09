// ABOUTME: Tests for the AddPantryItemPage component
// ABOUTME: Verifies form fields, store dropdown, and submission with defaultStoreId

import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as createInventoryItemModule from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { AddPantryItemPage } from '../add-pantry-item-page'

const mockNavigate = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  }
})

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockStores: Store[] = [
  { id: 's1', name: 'Costco', householdId: null, userId: 'u1', createdBy: 'u1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 's2', name: 'Trader Joes', householdId: 'h1', userId: null, createdBy: 'u1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockMutateAsync = vi.fn()

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AddPantryItemPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('AddPantryItemPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
    mockSearchParams.delete('scope')
    mockMutateAsync.mockResolvedValue({})

    vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    } as UseQueryResult<Household[]>)

    vi.spyOn(createInventoryItemModule, 'useCreateInventoryItemMutation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any)

    vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
      data: mockStores,
      isLoading: false,
    } as any)
  })

  it('renders form with name, notes, type, and default store fields', () => {
    renderPage()

    expect(screen.getByLabelText('Item Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Default Store (optional)')).toBeInTheDocument()
  })

  it('renders store dropdown with None option and all stores', () => {
    renderPage()

    const select = screen.getByLabelText('Default Store (optional)')
    const options = select.querySelectorAll('option')

    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('None')
    expect(options[1]).toHaveTextContent('Costco')
    expect(options[2]).toHaveTextContent('Trader Joes')
  })

  it('does not render store dropdown when no stores exist', () => {
    vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    renderPage()

    expect(screen.queryByLabelText('Default Store (optional)')).not.toBeInTheDocument()
  })

  it('does not render store dropdown when stores data is undefined', () => {
    vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any)

    renderPage()

    expect(screen.queryByLabelText('Default Store (optional)')).not.toBeInTheDocument()
  })

  it('submits with defaultStoreId null when no store selected', async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Milk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Milk',
        notes: null,
        householdId: null,
        defaultStoreId: null,
      })
    })
  })

  it('submits with selected defaultStoreId', async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Bread' } })
    fireEvent.change(screen.getByLabelText('Default Store (optional)'), { target: { value: 's1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Bread',
        notes: null,
        householdId: null,
        defaultStoreId: 's1',
      })
    })
  })

  it('clears defaultStoreId when switching back to None', async () => {
    renderPage()

    const storeSelect = screen.getByLabelText('Default Store (optional)')
    fireEvent.change(storeSelect, { target: { value: 's1' } })
    fireEvent.change(storeSelect, { target: { value: '' } })

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Eggs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Eggs',
        notes: null,
        householdId: null,
        defaultStoreId: null,
      })
    })
  })

  it('navigates to /pantry after successful submission', async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Butter' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pantry')
    })
  })

  it('does not submit when name is empty', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('navigates to /pantry when cancel is clicked', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockNavigate).toHaveBeenCalledWith('/pantry')
  })

  it('defaults to personal when no scope param is provided', () => {
    mockSearchParams.delete('scope')
    renderPage()

    // ScopeSelect receives 'personal' as value — verify submission uses null householdId
    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Milk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    return waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ householdId: null })
      )
    })
  })

  it('pre-selects household when scope param is household:id', () => {
    mockSearchParams.set('scope', 'household:h1')
    renderPage()

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Bread' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))

    return waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ householdId: 'h1' })
      )
    })
  })
})
