// ABOUTME: Household detail page with member management
// ABOUTME: Shows invite code, member list, and role-based actions (remove, transfer, leave)

import { ArrowLeft, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useRegenerateInviteCodeMutation } from '@/apis/agdevx-cart-api/household/regenerate-invite-code.mutation'
import { useRemoveHouseholdMemberMutation } from '@/apis/agdevx-cart-api/household/remove-household-member.mutation'
import { useTransferHouseholdOwnershipMutation } from '@/apis/agdevx-cart-api/household/transfer-household-ownership.mutation'
import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useInviteCodeQuery } from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import { useAuth } from '@/auth/use-auth'

export const HouseholdDetailPage = () => {
  const { id: householdId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: members, isLoading: membersLoading } = useHouseholdMembersQuery(householdId!)
  const { data: inviteCode, isLoading: codeLoading } = useInviteCodeQuery(householdId!)
  const removeMemberMutation = useRemoveHouseholdMemberMutation()
  const transferOwnershipMutation = useTransferHouseholdOwnershipMutation()
  const regenerateCodeMutation = useRegenerateInviteCodeMutation()

  const [codeCopied, setCodeCopied] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'transfer' | 'leave'
    userId: string
    displayName: string
  } | null>(null)

  const currentUserMember = members?.find((m) => m.userId === user?.id)
  const isOwner = currentUserMember?.role === 'owner'

  const handleCopyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleRegenerateCode = () => {
    if (!householdId) return
    regenerateCodeMutation.mutate(householdId)
  }

  const handleConfirmAction = async () => {
    if (!confirmAction || !householdId) return

    try {
      if (confirmAction.type === 'remove' || confirmAction.type === 'leave') {
        await removeMemberMutation.mutateAsync({
          householdId,
          userId: confirmAction.userId,
        })
        if (confirmAction.type === 'leave') {
          navigate('/household')
          return
        }
      } else if (confirmAction.type === 'transfer') {
        await transferOwnershipMutation.mutateAsync({
          householdId,
          userId: confirmAction.userId,
        })
      }
    } catch {
      // Error handled by mutation state
    }

    setConfirmAction(null)
  }

  if (membersLoading || codeLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading household...</p>
      </div>
    )
  }

  return (
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/household')}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Households
        </button>
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">Household Details</h1>
      </div>

      {/* Invite Code Card */}
      <div className="mb-6 p-5 bg-surface rounded-2xl shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-text-tertiary mb-3">Invite Code</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold tracking-widest text-navy">
            {inviteCode || '------'}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-teal bg-teal/8 rounded-lg hover:bg-teal/15 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {codeCopied ? 'Copied!' : 'Copy'}
          </button>
          {isOwner && (
            <button
              onClick={handleRegenerateCode}
              disabled={regenerateCodeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-amber bg-amber/10 rounded-lg hover:bg-amber/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {regenerateCodeMutation.isPending ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
        <p className="text-sm text-text-tertiary mt-3">
          Share this code with others to let them join your household.
        </p>
      </div>

      {/* Members List */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
            Members ({members?.length || 0})
          </span>
          <span className="flex-1 h-px bg-navy/8" />
        </div>
        <div className="space-y-2">
          {members?.map((member) => {
            const isSelf = member.userId === user?.id
            const memberIsOwner = member.role === 'owner'

            return (
              <div
                key={member.userId}
                className="p-4 bg-surface rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">
                        {member.userId === user?.id ? 'You' : member.userId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs rounded-full font-bold ${
                          memberIsOwner
                            ? 'bg-teal/15 text-teal'
                            : 'bg-bg-warm text-text-tertiary'
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <p className="text-sm text-text-tertiary mt-0.5">
                      Joined: {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Owner can remove non-owner members */}
                    {isOwner && !isSelf && (
                      <>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'transfer',
                              userId: member.userId,
                              displayName: member.userId,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-bold text-teal bg-teal/8 rounded-lg hover:bg-teal/15 transition-colors"
                        >
                          Transfer
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'remove',
                              userId: member.userId,
                              displayName: member.userId,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-bold text-coral bg-coral/8 rounded-lg hover:bg-coral/15 transition-colors"
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {/* Non-owner can leave */}
                    {!isOwner && isSelf && (
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: 'leave',
                            userId: member.userId,
                            displayName: 'yourself',
                          })
                        }
                        className="px-3 py-1.5 text-xs font-bold text-coral bg-coral/8 rounded-lg hover:bg-coral/15 transition-colors"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="font-display text-lg font-bold text-navy mb-2">
              {confirmAction.type === 'remove' && 'Remove Member'}
              {confirmAction.type === 'transfer' && 'Transfer Ownership'}
              {confirmAction.type === 'leave' && 'Leave Household'}
            </h3>
            <p className="text-text-secondary mb-5">
              {confirmAction.type === 'remove' &&
                `Are you sure you want to remove ${confirmAction.displayName} from this household?`}
              {confirmAction.type === 'transfer' &&
                `Are you sure you want to transfer ownership to ${confirmAction.displayName}? You will become a regular member.`}
              {confirmAction.type === 'leave' &&
                'Are you sure you want to leave this household?'}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={removeMemberMutation.isPending || transferOwnershipMutation.isPending}
                className={`px-4 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
                  confirmAction.type === 'transfer'
                    ? 'bg-teal hover:bg-teal-light'
                    : 'bg-coral hover:bg-coral/90'
                }`}
              >
                {(removeMemberMutation.isPending || transferOwnershipMutation.isPending)
                  ? 'Processing...'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
