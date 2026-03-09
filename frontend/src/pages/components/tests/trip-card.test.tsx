// ABOUTME: Tests for TripCard component covering rendering, kebab menu, inline rename, and action callbacks
// ABOUTME: Validates active vs completed trip behavior, link navigation, and outside-click menu dismissal

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'

import { TripCard } from '../trip-card'

const planningTrip: Trip = {
  id: 'trip-0',
  name: 'Planning Trip',
  householdId: 'h1',
  createdByUserId: 'user-1',
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  createdBy: 'user-1',
  createdDate: '2026-02-14T10:00:00Z',
  modifiedBy: null,
  modifiedDate: null,
}

const activeTrip: Trip = {
  id: 'trip-1',
  name: 'Weekly Groceries',
  householdId: 'h1',
  createdByUserId: 'user-1',
  isStarted: true,
  startedAt: '2026-02-15T10:00:00Z',
  isCompleted: false,
  completedAt: null,
  createdBy: 'user-1',
  createdDate: '2026-02-15T10:00:00Z',
  modifiedBy: null,
  modifiedDate: null,
}

const completedTrip: Trip = {
  id: 'trip-2',
  name: 'Costco Run',
  householdId: 'h1',
  createdByUserId: 'user-1',
  isStarted: true,
  startedAt: '2026-02-18T10:00:00Z',
  isCompleted: true,
  completedAt: '2026-02-20T14:30:00Z',
  createdBy: 'user-1',
  createdDate: '2026-02-18T10:00:00Z',
  modifiedBy: null,
  modifiedDate: null,
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

describe('TripCard', () => {
  const mockOnRename = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnReopen = vi.fn()

  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders planning trip with name and created date', () => {
    render(
      <TripCard trip={planningTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Planning Trip')).toBeInTheDocument()
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
  })

  it('renders started trip with name and started date', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
  })

  it('renders completed trip with completion date', () => {
    render(
      <TripCard trip={completedTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Costco Run')).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('shows kebab menu with Rename and Delete for active trip', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    //== Active trips should NOT have Reopen option
    expect(screen.queryByText('Reopen')).not.toBeInTheDocument()
  })

  it('shows kebab menu with Rename, Reopen, and Delete for completed trip', () => {
    render(
      <TripCard trip={completedTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Reopen')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('enters inline edit mode when Rename is clicked', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    //== An input should appear pre-filled with the trip name
    const input = screen.getByDisplayValue('Weekly Groceries')
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('calls onRename when Enter is pressed with changed name', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Saturday Groceries' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockOnRename).toHaveBeenCalledWith('trip-1', 'Saturday Groceries')
  })

  it('cancels rename on Escape without calling onRename', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Something Else' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    //== Should exit edit mode without saving
    expect(mockOnRename).not.toHaveBeenCalled()
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Something Else')).not.toBeInTheDocument()
  })

  it('does NOT call onRename when name is unchanged', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    //== Press Enter without changing the name
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockOnRename).not.toHaveBeenCalled()
  })

  it('calls onDelete with tripId and tripName when Delete is clicked', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Delete'))

    expect(mockOnDelete).toHaveBeenCalledWith('trip-1', 'Weekly Groceries')
  })

  it('calls onReopen with tripId when Reopen is clicked on completed trip', () => {
    render(
      <TripCard trip={completedTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Reopen'))

    expect(mockOnReopen).toHaveBeenCalledWith('trip-2')
  })

  it('closes kebab menu on outside click', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    //== Open the menu
    fireEvent.click(screen.getByLabelText('Trip actions'))
    expect(screen.getByText('Rename')).toBeInTheDocument()

    //== Click outside (mousedown on document)
    fireEvent.mouseDown(document)

    //== Menu should be closed
    expect(screen.queryByText('Rename')).not.toBeInTheDocument()
  })

  it('active trip card links to /shopping/{tripId}', () => {
    render(
      <TripCard trip={activeTrip} onRename={mockOnRename} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/shopping/trip-1')
  })
})
