// ABOUTME: Add inventory item page
// ABOUTME: Form for creating household or personal inventory items

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
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
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight mb-6">Add Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-navy-soft mb-1">
            Item Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={createMutation.isPending}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-navy-soft mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details"
            rows={3}
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={createMutation.isPending}
          />
        </div>

        <div>
          <label htmlFor="household" className="block text-sm font-semibold text-navy-soft mb-1">
            Type
          </label>
          <select
            id="household"
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
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
          <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
            {getErrorMessage(createMutation.error)}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Item'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="w-full py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
