// ABOUTME: Join household page
// ABOUTME: Form for joining an existing household via invite code

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useJoinHouseholdMutation } from '@/apis/agdevx-cart-api/household/join-household.mutation'
import { ROUTES } from '@/routes'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { PageHeader } from '@/shared/page-header'
import { getErrorMessage } from '@/utils/error-messages'

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
      navigate(ROUTES.HOUSEHOLD)
    } catch {
      // Error displayed inline via getErrorMessage(mutation.error)
    }
  }

  return (
    <div className="pb-8">
      <PageHeader>Join <span className="text-teal">Household</span></PageHeader>
      <div className="px-5">

      <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Invite Code" htmlFor="inviteCode">
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={joinMutation.isPending}
            />
          </FormField>

          {joinMutation.isError && (
            <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
              {getErrorMessage(joinMutation.error)}
            </div>
          )}

          <div className="pt-2">
            <ActionCancelFormButtons
              onCancel={() => navigate(ROUTES.HOUSEHOLD)}
              submitLabel="Join"
              isPending={joinMutation.isPending}
              disabled={!inviteCode.trim()}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
