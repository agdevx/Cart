// ABOUTME: Tests for TripCard component covering rendering, kebab menu, inline edit form, and action callbacks
// ABOUTME: Validates active vs completed trip behavior, link navigation, and outside-click menu dismissal

import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { TripCard } from '../trip-card'

const planningTrip: Trip = {
  id: 'trip-0',
  name: 'Planning Trip',
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

const personalTrip: Trip = {
  id: 'trip-3',
  name: 'Personal Run',
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
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnReopen = vi.fn()

  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders planning trip with name and created date', () => {
    render(
      <TripCard trip={planningTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Planning Trip')).toBeInTheDocument()
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
  })

  it('renders started trip with name and started date', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
  })

  it('renders completed trip with completion date', () => {
    render(
      <TripCard trip={completedTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Costco Run')).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('shows kebab menu with Edit and Delete for active trip', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    //== Active trips should NOT have Reopen option
    expect(screen.queryByText('Reopen')).not.toBeInTheDocument()
  })

  it('shows kebab menu with Edit, Reopen, and Delete for completed trip', () => {
    render(
      <TripCard trip={completedTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Reopen')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('shows edit form below card content when Edit is clicked', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Edit'))

    //== Trip name should still show as static text
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    //== Edit form should appear with input pre-filled
    expect(screen.getByDisplayValue('Weekly Groceries')).toBeInTheDocument()
    //== Form labels should be visible
    expect(screen.getByText('Trip Name')).toBeInTheDocument()
    //== Cancel and Save buttons should be visible
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('calls onUpdate with name when Save is clicked', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Edit'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Saturday Groceries' } })
    fireEvent.click(screen.getByText('Save'))

    expect(mockOnUpdate).toHaveBeenCalledWith('trip-1', 'Saturday Groceries')
  })

  it('calls onUpdate with name for personal trips', () => {
    render(
      <TripCard trip={personalTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Edit'))

    fireEvent.click(screen.getByText('Save'))

    expect(mockOnUpdate).toHaveBeenCalledWith('trip-3', 'Personal Run')
  })

  it('cancels edit on Cancel button without calling onUpdate', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Edit'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Something Else' } })
    fireEvent.click(screen.getByText('Cancel'))

    //== Should exit edit mode without saving
    expect(mockOnUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    //== Edit form should be gone
    expect(screen.queryByText('Trip Name')).not.toBeInTheDocument()
  })

  it('disables Save button when name is empty', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Edit'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: '   ' } })

    expect(screen.getByText('Save')).toBeDisabled()
  })

  it('calls onDelete with tripId and tripName when Delete is clicked', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Delete'))

    expect(mockOnDelete).toHaveBeenCalledWith('trip-1', 'Weekly Groceries')
  })

  it('calls onReopen with tripId when Reopen is clicked on completed trip', () => {
    render(
      <TripCard trip={completedTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Reopen'))

    expect(mockOnReopen).toHaveBeenCalledWith('trip-2')
  })

  it('closes kebab menu on outside click', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    //== Open the menu
    fireEvent.click(screen.getByLabelText('Trip actions'))
    expect(screen.getByText('Edit')).toBeInTheDocument()

    //== Click outside (mousedown on document)
    fireEvent.mouseDown(document)

    //== Menu should be closed
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('closes kebab menu on Escape key', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    expect(screen.getByText('Edit')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('active trip card links to /shopping/{tripId}', () => {
    render(
      <TripCard trip={activeTrip} onUpdate={mockOnUpdate} onDelete={mockOnDelete} onReopen={mockOnReopen} />,
      { wrapper }
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/shopping/trip-1')
  })
})
