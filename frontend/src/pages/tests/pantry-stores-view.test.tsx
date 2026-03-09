import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import * as createStoreModule from '@/apis/agdevx-cart-api/store/create-store.mutation'
import * as deleteStoreModule from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import * as updateStoreModule from '@/apis/agdevx-cart-api/store/update-store.mutation'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { PantryStoresView } from '../pantry-stores-view'

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockStores: Store[] = [
  { id: 'hs1', name: 'Costco', householdId: 'h1', userId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'hs2', name: 'Trader Joes', householdId: 'h1', userId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'ps1', name: 'Corner Market', householdId: null, userId: 'user1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const renderView = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PantryStoresView />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const setupMocks = (options?: {
  stores?: Store[]
  households?: Household[]
  storesLoading?: boolean
  householdsLoading?: boolean
}) => {
  const {
    stores = mockStores,
    households = mockHouseholds,
    storesLoading = false,
    householdsLoading = false,
  } = options || {}

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: householdsLoading ? undefined : households,
    isLoading: householdsLoading,
  } as UseQueryResult<Household[]>)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: storesLoading ? undefined : stores,
    isLoading: storesLoading,
  } as UseQueryResult<Store[]>)

  vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<Store, Error, { name: string; householdId?: string | null }>)

  vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, { id: string; name: string }>)

  vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, string>)
}

describe('PantryStoresView', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    setupMocks({ storesLoading: true, householdsLoading: true })

    renderView()

    expect(screen.getByText('Loading stores...')).toBeInTheDocument()
  })

  it('renders household and personal store sections', () => {
    setupMocks()

    renderView()

    //== Household section header should use household name
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    //== Store names under household section
    expect(screen.getByText('Costco')).toBeInTheDocument()
    expect(screen.getByText('Trader Joes')).toBeInTheDocument()
    //== Personal stores section header
    expect(screen.getByText('Personal Stores')).toBeInTheDocument()
    //== Personal store name
    expect(screen.getByText('Corner Market')).toBeInTheDocument()
  })

  it('renders empty state when no stores exist', () => {
    setupMocks({ stores: [] })

    renderView()

    expect(screen.getByText('No stores yet. Add your first store!')).toBeInTheDocument()
  })

  it('shows create form when Add Store button is clicked', () => {
    setupMocks()

    renderView()

    fireEvent.click(screen.getByText('Add Store'))

    expect(screen.getByLabelText('Store Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Scope')).toBeInTheDocument()
  })

  it('creates a store via the inline form', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})

    setupMocks()

    //== Override create mutation with trackable mock
    vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<Store, Error, { name: string; householdId?: string | null }>)

    renderView()

    fireEvent.click(screen.getByText('Add Store'))

    fireEvent.change(screen.getByLabelText('Store Name'), { target: { value: 'Whole Foods' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Whole Foods',
        householdId: null,
      })
    })
  })

  it('enables in-place editing when edit is clicked via kebab menu', () => {
    setupMocks()

    renderView()

    //== Open kebab menu on the first store
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])

    //== Click Edit from the dropdown menu
    fireEvent.click(screen.getByText('Edit'))

    //== An input should appear with the store name value
    const editInput = screen.getByDisplayValue('Costco')
    expect(editInput).toBeInTheDocument()
  })

  it('saves edited name on Enter', async () => {
    const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined)

    setupMocks()

    //== Override update mutation with trackable mock
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string }>)

    renderView()

    //== Open kebab menu and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    const editInput = screen.getByDisplayValue('Costco')
    fireEvent.change(editInput, { target: { value: 'Costco Wholesale' } })
    fireEvent.keyDown(editInput, { key: 'Enter' })

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'hs1',
        name: 'Costco Wholesale',
      })
    })
  })

  it('cancels editing when cancel button is clicked', () => {
    setupMocks()

    renderView()

    //== Open kebab menu and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Cancel button should be visible in edit mode
    const cancelButton = screen.getByLabelText('Cancel editing')
    expect(cancelButton).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Costco'), { target: { value: 'Something Else' } })
    fireEvent.click(cancelButton)

    //== Original name should be back, no input visible
    expect(screen.getByText('Costco')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Something Else')).not.toBeInTheDocument()
  })

  it('cancels editing on Escape', () => {
    setupMocks()

    renderView()

    //== Open kebab menu and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    const editInput = screen.getByDisplayValue('Costco')
    fireEvent.change(editInput, { target: { value: 'Something Else' } })
    fireEvent.keyDown(editInput, { key: 'Escape' })

    //== Original name should be back, no input visible
    expect(screen.getByText('Costco')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Something Else')).not.toBeInTheDocument()
  })

  it('shows delete confirmation modal', () => {
    setupMocks()

    renderView()

    //== Open kebab menu and click Delete
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByText('Delete Store')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
  })

  it('deletes a store after confirmation', async () => {
    const mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined)

    setupMocks()

    //== Override delete mutation with trackable mock
    vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderView()

    //== Open kebab menu and click Delete
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Delete'))

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('hs1')
    })
  })

  it('cancels delete when Cancel is clicked', () => {
    setupMocks()

    renderView()

    //== Open kebab menu and click Delete
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Delete'))

    //== Modal should be visible
    expect(screen.getByText('Delete Store')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    //== Modal should be gone
    expect(screen.queryByText('Delete Store')).not.toBeInTheDocument()
  })
})
