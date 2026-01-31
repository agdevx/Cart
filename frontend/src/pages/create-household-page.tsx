// ABOUTME: Create household page
// ABOUTME: Form for creating a new household

import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateHouseholdMutation } from '@/apis/agdevx-cart-api/household/create-household.mutation'
import { getErrorMessage } from '@/utilities/error-messages'

export const CreateHouseholdPage = () => {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const createMutation = useCreateHouseholdMutation()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({ name: name.trim() })
      navigate('/household')
    } catch (error) {
      // Error is handled by mutation state
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create Household</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Household Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter household name"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createMutation.isPending}
          />
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
            {createMutation.isPending ? 'Creating...' : 'Create Household'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/household')}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
