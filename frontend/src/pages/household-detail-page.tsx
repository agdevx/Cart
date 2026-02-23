// ABOUTME: Household detail page with member management
// ABOUTME: Shows invite code, member list, and role-based actions (remove, transfer, leave)

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
      <div className="p-4">
        <p>Loading household...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/household')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          &larr; Back to Households
        </button>
        <h1 className="text-2xl font-bold">Household Details</h1>
      </div>

      {/* Invite Code Card */}
      <div className="mb-6 p-4 bg-white border rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Invite Code</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold tracking-widest text-blue-700">
            {inviteCode || '------'}
          </span>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            {codeCopied ? 'Copied!' : 'Copy'}
          </button>
          {isOwner && (
            <button
              onClick={handleRegenerateCode}
              disabled={regenerateCodeMutation.isPending}
              className="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50"
            >
              {regenerateCodeMutation.isPending ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Share this code with others to let them join your household.
        </p>
      </div>

      {/* Members List */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">
          Members ({members?.length || 0})
        </h2>
        <div className="space-y-2">
          {members?.map((member) => {
            const isSelf = member.userId === user?.id
            const memberIsOwner = member.role === 'owner'

            return (
              <div
                key={member.userId}
                className="p-4 bg-white border rounded shadow-sm flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {member.userId === user?.id ? 'You' : member.userId}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        memberIsOwner
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
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
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Transfer Ownership
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: 'remove',
                            userId: member.userId,
                            displayName: member.userId,
                          })
                        }
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
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
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Leave Household
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold mb-2">
              {confirmAction.type === 'remove' && 'Remove Member'}
              {confirmAction.type === 'transfer' && 'Transfer Ownership'}
              {confirmAction.type === 'leave' && 'Leave Household'}
            </h3>
            <p className="text-gray-600 mb-4">
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
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={removeMemberMutation.isPending || transferOwnershipMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
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
