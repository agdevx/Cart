// ABOUTME: Add inventory item page
// ABOUTME: Form for creating household or personal inventory items

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { getErrorMessage } from '@/utilities/error-messages'

export const AddInventoryItemPage = () => {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [householdId, setHouseholdId] = useState<string>('personal')
  const navigate = useNavigate()
  const createMutation = useCreateInventoryItemMutation()
  const { data: households } = useHouseholdsQuery()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        notes: notes.trim() || null,
        householdId: householdId === 'personal' ? null : householdId,
      })
      navigate('/inventory')
    } catch {
      // Error is handled by mutation state
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Add Inventory Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Item Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createMutation.isPending}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details"
            rows={3}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createMutation.isPending}
          />
        </div>

        <div>
          <label htmlFor="household" className="block text-sm font-medium mb-1">
            Type
          </label>
          <select
            id="household"
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createMutation.isPending}
          >
            <option value="personal">Personal Item</option>
            {households?.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name} (Household)
              </option>
            ))}
          </select>
        </div>

        {createMutation.isError && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            {getErrorMessage(createMutation.error)}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Item'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
