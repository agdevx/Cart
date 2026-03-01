// ABOUTME: Tests for TripItemRow component covering planning and shopping variants
// ABOUTME: Validates kebab menu, inline edit form, checkbox toggling, and action callbacks

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'

import { TripItemRow } from '../trip-item-row'

const mockTripItem: TripItem = {
  id: 'ti1',
  tripId: 'trip1',
  inventoryItemId: 'inv1',
  quantity: 2,
  storeId: 'store1',
  notes: 'Get organic',
  isChecked: false,
  checkedAt: null,
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const mockCheckedItem: TripItem = {
  ...mockTripItem,
  id: 'ti2',
  isChecked: true,
  checkedAt: '2024-01-02',
}

const mockStores: Store[] = [
  { id: 'store1', name: 'Whole Foods', householdId: null, userId: 'user1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'store2', name: 'Costco', householdId: null, userId: 'user1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

describe('TripItemRow', () => {
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnToggleCheck = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item name, quantity, and notes', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Bananas')).toBeInTheDocument()
    expect(screen.getByText('Quantity: 2')).toBeInTheDocument()
    expect(screen.getByText('Get organic')).toBeInTheDocument()
  })

  it('shows kebab menu with Edit and Remove', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByLabelText('Item actions'))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('Edit expands inline form with pre-filled values', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByLabelText('Item actions'))
    fireEvent.click(screen.getByText('Edit'))

    //== Quantity input pre-filled with current value
    const quantityInput = screen.getByLabelText('Quantity')
    expect(quantityInput).toHaveValue(2)

    //== Notes input pre-filled with current notes
    const notesInput = screen.getByLabelText('Notes')
    expect(notesInput).toHaveValue('Get organic')

    //== Store select pre-filled with current storeId
    const storeSelect = screen.getByLabelText('Store')
    expect(storeSelect).toHaveValue('store1')
  })

  it('Save calls onUpdate with updated values', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByLabelText('Item actions'))
    fireEvent.click(screen.getByText('Edit'))

    //== Change quantity and notes
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Ripe ones' } })

    fireEvent.click(screen.getByText('Save'))

    expect(mockOnUpdate).toHaveBeenCalledWith('ti1', 5, 'Ripe ones', 'store1')
  })

  it('Cancel collapses edit form', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByLabelText('Item actions'))
    fireEvent.click(screen.getByText('Edit'))

    //== Verify form is open
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))

    //== Form should be gone
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
  })

  it('Remove calls onDelete immediately', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByLabelText('Item actions'))
    fireEvent.click(screen.getByText('Remove'))

    expect(mockOnDelete).toHaveBeenCalledWith('ti1')
  })

  it('Shopping variant: renders checkbox', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        showCheckbox={true}
        onToggleCheck={mockOnToggleCheck}
      />
    )

    //== Checkbox region should be present
    expect(screen.getByTestId('item-checkbox')).toBeInTheDocument()
  })

  it('Shopping variant: clicking row calls onToggleCheck', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        showCheckbox={true}
        onToggleCheck={mockOnToggleCheck}
      />
    )

    //== Click on the item name (part of the row, not the kebab)
    fireEvent.click(screen.getByText('Bananas'))

    expect(mockOnToggleCheck).toHaveBeenCalledWith('ti1', false)
  })

  it('Shopping variant: editing disables row toggle', () => {
    render(
      <TripItemRow
        tripItem={mockTripItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        showCheckbox={true}
        onToggleCheck={mockOnToggleCheck}
      />
    )

    //== Enter edit mode
    fireEvent.click(screen.getByLabelText('Item actions'))
    fireEvent.click(screen.getByText('Edit'))

    //== Click on the item name while in edit mode
    fireEvent.click(screen.getByText('Bananas'))

    expect(mockOnToggleCheck).not.toHaveBeenCalled()
  })

  it('Shopping variant: checked items show strikethrough', () => {
    render(
      <TripItemRow
        tripItem={mockCheckedItem}
        itemName="Bananas"
        stores={mockStores}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        showCheckbox={true}
        onToggleCheck={mockOnToggleCheck}
      />
    )

    const itemName = screen.getByText('Bananas')
    expect(itemName).toHaveClass('line-through')
  })
})
