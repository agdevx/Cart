import { BrowserRouter } from 'react-router-dom'

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    const { container } = renderView()

    //== Skeleton loader divs should be visible with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
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

    expect(screen.getByText('No stores yet')).toBeInTheDocument()
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

  it('opens expandable edit form when edit is clicked via kebab menu', () => {
    setupMocks()

    renderView()

    //== Open kebab menu on the first store
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])

    //== Click Edit from the dropdown menu
    fireEvent.click(screen.getByText('Edit'))

    //== An input should appear with the store name value
    const editInput = screen.getByLabelText('Edit store name')
    expect(editInput).toHaveValue('Costco')

    //== Save and Cancel buttons should be visible
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('saves edited store via Save button', async () => {
    const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined)

    setupMocks()

    //== Override update mutation with trackable mock
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string; householdId?: string | null }>)

    renderView()

    //== Open kebab menu and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    const editInput = screen.getByLabelText('Edit store name')
    fireEvent.change(editInput, { target: { value: 'Costco Wholesale' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'hs1',
        name: 'Costco Wholesale',
        householdId: 'h1',
      })
    })
  })

  it('cancels editing when Cancel button is clicked', () => {
    setupMocks()

    renderView()

    //== Open kebab menu and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Cancel button should be visible in edit form
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    expect(cancelButton).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Edit store name'), { target: { value: 'Something Else' } })
    fireEvent.click(cancelButton)

    //== Edit form should be gone, no input visible
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

  it('should expand full edit form when Edit is clicked in kebab menu', () => {
    setupMocks()

    renderView()

    //== Open kebab menu on the first store and click Edit
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Expandable form appears below store row (NOT inline name replacement)
    //== Name field pre-populated
    const nameInput = screen.getByLabelText('Edit store name')
    expect(nameInput).toHaveValue('Costco')

    //== Scope dropdown pre-populated (household store -> should show household id)
    expect(screen.getByLabelText('Edit scope')).toBeInTheDocument()

    //== Save/Cancel buttons visible
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should save name and scope changes on submit', async () => {
    const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined)

    setupMocks()

    //== Override update mutation with trackable mock
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string; householdId?: string | null }>)

    renderView()

    //== Open edit form on Costco (household store)
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    fireEvent.click(screen.getByText('Edit'))

    //== Change name
    const nameInput = screen.getByLabelText('Edit store name')
    fireEvent.change(nameInput, { target: { value: 'Costco Wholesale' } })

    //== Click Save
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'hs1',
        name: 'Costco Wholesale',
        householdId: 'h1',
      })
    })
  })

  it('should allow changing scope from personal to household', async () => {
    const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined)

    setupMocks()

    //== Override update mutation with trackable mock
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string; householdId?: string | null }>)

    renderView()

    //== Open edit form on Corner Market (personal store — it's the 3rd kebab button)
    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[2])
    fireEvent.click(screen.getByText('Edit'))

    //== Change scope from personal to household
    const scopeButton = screen.getByLabelText('Edit scope')
    fireEvent.click(scopeButton)
    //== Click the household option in the ScopeSelect dropdown (contains "Household" description)
    fireEvent.click(screen.getByText(/Household/))

    //== Click Save
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'ps1',
        name: 'Corner Market',
        householdId: 'h1',
      })
    })
  })

  it('closes store kebab menu on Escape key', () => {
    setupMocks()

    renderView()

    const kebabButtons = screen.getAllByLabelText('Store actions')
    fireEvent.click(kebabButtons[0])
    expect(screen.getByText('Edit')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('shows store name error on blur when empty and clears when filled', async () => {
    setupMocks()
    const user = userEvent.setup()

    renderView()

    //== Open the create form
    await user.click(screen.getByText('Add Store'))

    //== Blur the store name input without typing anything
    const input = screen.getByLabelText('Store Name')
    await user.click(input)
    await user.tab()

    //== Error message should appear
    expect(screen.getByText('Store name is required')).toBeInTheDocument()

    //== Type a name to clear the error
    await user.type(input, 'Whole Foods')
    expect(screen.queryByText('Store name is required')).not.toBeInTheDocument()
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
