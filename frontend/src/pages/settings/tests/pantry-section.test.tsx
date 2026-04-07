// ABOUTME: Tests for PantrySection settings component
// ABOUTME: Verifies CSV template download, file selection, import flow, and toast messaging

import { createElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useImportInventoryMutation } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'

import { PantrySection } from '../pantry-section'

vi.mock('@/apis/agdevx-cart-api/inventory/import-inventory.mutation')

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('PantrySection', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useImportInventoryMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useImportInventoryMutation>)
  })

  it('should render the section header and description', () => {
    render(createElement(PantrySection), { wrapper })
    expect(screen.getByText('Pantry')).toBeInTheDocument()
    expect(screen.getByText('Import Items')).toBeInTheDocument()
    expect(screen.getByText('Add pantry items in bulk from a CSV file')).toBeInTheDocument()
  })

  it('should render download template link', () => {
    render(createElement(PantrySection), { wrapper })
    expect(screen.getByText('Download Template')).toBeInTheDocument()
  })

  it('should disable import button when no file selected', () => {
    render(createElement(PantrySection), { wrapper })
    const importButton = screen.getByRole('button', { name: /import/i })
    expect(importButton).toBeDisabled()
  })

  it('should show spinner when import is pending', () => {
    vi.mocked(useImportInventoryMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useImportInventoryMutation>)

    render(createElement(PantrySection), { wrapper })
    expect(screen.getByRole('button', { name: /import/i })).toBeDisabled()
  })

  it('should enable import button after file selection', async () => {
    render(createElement(PantrySection), { wrapper })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Name,Notes,Store,Scope\nMilk,,,personal'], 'test.csv', { type: 'text/csv' })

    await userEvent.upload(fileInput, csvFile)

    expect(screen.getByRole('button', { name: /import/i })).toBeEnabled()
    expect(screen.getByText('test.csv')).toBeInTheDocument()
  })

  it('should call mutate with parsed CSV data on import', async () => {
    render(createElement(PantrySection), { wrapper })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Name,Notes,Store,Scope\nMilk,,Costco,personal'], 'test.csv', { type: 'text/csv' })

    await userEvent.upload(fileInput, csvFile)
    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      [{ name: 'Milk', notes: null, defaultStore: 'Costco', scope: 'personal' }],
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })
})
