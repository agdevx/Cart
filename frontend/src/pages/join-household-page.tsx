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
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight mb-6">Join Household</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-semibold text-navy-soft mb-1">
            Invite Code
          </label>
          <input
            id="inviteCode"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={joinMutation.isPending}
          />
        </div>

        {joinMutation.isError && (
          <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
            {getErrorMessage(joinMutation.error)}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={joinMutation.isPending || !inviteCode.trim()}
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Household'}
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
