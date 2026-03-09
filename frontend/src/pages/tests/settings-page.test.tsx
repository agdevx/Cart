// ABOUTME: Tests for SettingsPage component
// ABOUTME: Verifies settings heading and logout button render

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { SettingsPage } from '../settings-page'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

describe('SettingsPage', () => {
  it('renders Settings heading', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
