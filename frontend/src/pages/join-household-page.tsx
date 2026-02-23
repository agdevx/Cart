// ABOUTME: Join household page
// ABOUTME: Form for joining an existing household via invite code

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useJoinHouseholdMutation } from '@/apis/agdevx-cart-api/household/join-household.mutation'
import { getErrorMessage } from '@/utilities/error-messages'

export const JoinHouseholdPage = () => {
  const [inviteCode, setInviteCode] = useState('')
  const navigate = useNavigate()
  const joinMutation = useJoinHouseholdMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      return
    }

    try {
      await joinMutation.mutateAsync({ inviteCode: inviteCode.trim() })
      navigate('/household')
    } catch {
      // Error is handled by mutation state
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Join Household</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium mb-1">
            Invite Code
          </label>
          <input
            id="inviteCode"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={joinMutation.isPending}
          />
        </div>

        {joinMutation.isError && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            {getErrorMessage(joinMutation.error)}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={joinMutation.isPending || !inviteCode.trim()}
            className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Household'}
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
