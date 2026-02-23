// ABOUTME: Create household page
// ABOUTME: Form for creating a new household

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateHouseholdMutation } from '@/apis/agdevx-cart-api/household/create-household.mutation'
import { getErrorMessage } from '@/utilities/error-messages'

export const CreateHouseholdPage = () => {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const createMutation = useCreateHouseholdMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({ name: name.trim() })
      navigate('/household')
    } catch {
      // Error is handled by mutation state
    }
  }

  return (
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight mb-6">Create Household</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-navy-soft mb-1">
            Household Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter household name"
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={createMutation.isPending}
          />
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
            {createMutation.isPending ? 'Creating...' : 'Create Household'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/household')}
            className="w-full py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
