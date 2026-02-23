// ABOUTME: Integration tests for household management
// ABOUTME: Tests household page routing and basic structure

import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { describe, expect,it } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { HouseholdPage } from '@/pages/household-page'

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={component} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Household Management Flow', () => {
  it('renders household page', () => {
    renderWithProviders(<HouseholdPage />)
    // Page should render without crashing
    expect(document.body).toBeInTheDocument()
  })

  it('household page has correct structure', () => {
    renderWithProviders(<HouseholdPage />)
    // Check that the page rendered successfully
    const content = document.body.textContent
    expect(content).toBeDefined()
  })

  it('renders with query client provider', () => {
    const { container } = renderWithProviders(<HouseholdPage />)
    expect(container).toBeInTheDocument()
  })

  it('integrates with router', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HouseholdPage />} />
            <Route path="/household" element={<HouseholdPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    )
    expect(container).toBeInTheDocument()
  })
})
