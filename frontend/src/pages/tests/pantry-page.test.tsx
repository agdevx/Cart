import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { PantryPage } from '../pantry-page'

//== Mock PantryItemsView so we can inspect its props without setting up all inventory hooks
vi.mock('../pantry-items-view', () => ({
  PantryItemsView: ({ filter }: { filter: string }) => (
    <div data-testid="pantry-items-view" data-filter={filter}>
      Items view with filter: {filter}
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
  })

  it('renders segmented control with Items and Stores tabs', () => {
    renderPage()

    expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Stores' })).toBeInTheDocument()
  })

  it('shows items view by default with filter dropdown', () => {
    renderPage()

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).toContain('bg-teal')

    expect(screen.getByTestId('pantry-items-view')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter inventory')).toBeInTheDocument()
  })

  it('renders filter dropdown with correct options', () => {
    renderPage()

    const select = screen.getByLabelText('Filter inventory')
    const options = select.querySelectorAll('option')

    expect(options).toHaveLength(6)
    expect(options[0]).toHaveTextContent('All Items')
    expect(options[1]).toHaveTextContent('Personal')
    expect(options[2]).toHaveTextContent('Smith Family')
    expect(options[3]).toHaveTextContent('Smith Family + Personal')
    expect(options[4]).toHaveTextContent('Book Club')
    expect(options[5]).toHaveTextContent('Book Club + Personal')
  })

  it('passes filter value to PantryItemsView', () => {
    renderPage()

    const view = screen.getByTestId('pantry-items-view')
    expect(view).toHaveAttribute('data-filter', 'all')
  })

  it('updates filter when dropdown changes', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Filter inventory'), {
      target: { value: 'personal' },
    })

    const view = screen.getByTestId('pantry-items-view')
    expect(view).toHaveAttribute('data-filter', 'personal')
  })

  it('hides filter dropdown when Stores tab is active', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    expect(screen.queryByLabelText('Filter inventory')).not.toBeInTheDocument()
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
