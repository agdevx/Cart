// ABOUTME: Household detail page with member management
// ABOUTME: Shows invite code, member list, and role-based actions (remove, transfer, leave)

import { ArrowLeft, ChevronDown, Copy, Pencil, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useDeleteHouseholdMutation } from '@/apis/agdevx-cart-api/household/delete-household.mutation'
import { useRegenerateInviteCodeMutation } from '@/apis/agdevx-cart-api/household/regenerate-invite-code.mutation'
import { useRemoveHouseholdMemberMutation } from '@/apis/agdevx-cart-api/household/remove-household-member.mutation'
import { useTransferHouseholdOwnershipMutation } from '@/apis/agdevx-cart-api/household/transfer-household-ownership.mutation'
import { useUpdateHouseholdMutation } from '@/apis/agdevx-cart-api/household/update-household.mutation'
import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useInviteCodeQuery } from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import { useAuth } from '@/auth/use-auth'

import { ConfirmDialog } from './components/confirm-dialog'

export const HouseholdDetailPage = () => {
  const { id: householdId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: household, isLoading: householdLoading } = useHouseholdQuery(householdId!)
  const { data: members, isLoading: membersLoading } = useHouseholdMembersQuery(householdId!)
  const { data: inviteCode, isLoading: codeLoading } = useInviteCodeQuery(householdId!)
  const updateHouseholdMutation = useUpdateHouseholdMutation()
  const deleteHouseholdMutation = useDeleteHouseholdMutation()
  const removeMemberMutation = useRemoveHouseholdMemberMutation()
  const transferOwnershipMutation = useTransferHouseholdOwnershipMutation()
  const regenerateCodeMutation = useRegenerateInviteCodeMutation()

  const [codeCopied, setCodeCopied] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'transfer' | 'leave'
    userId: string
    memberName: string
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

  const handleStartRename = () => {
    setEditName(household?.name || '')
    setIsRenaming(true)
  }

  const handleSaveRename = () => {
    if (!householdId || !editName.trim()) return
    if (editName.trim() === household?.name) {
      setIsRenaming(false)
      return
    }
    updateHouseholdMutation.mutate(
      { householdId, name: editName.trim() },
      { onSuccess: () => setIsRenaming(false) }
    )
  }

  const handleCancelRename = () => {
    setIsRenaming(false)
    setEditName(household?.name || '')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRename()
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  const handleRenameBlur = () => {
    handleSaveRename()
  }

  const handleDeleteHousehold = () => {
    if (!householdId) return
    deleteHouseholdMutation.mutate(householdId, {
      onSuccess: () => navigate('/household'),
    })
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

  if (membersLoading || codeLoading || householdLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading household...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-14 pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/household')}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Households
        </button>
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              autoFocus
              disabled={updateHouseholdMutation.isPending}
              className="font-display text-[28px] font-extrabold text-navy tracking-tight bg-transparent border-b-2 border-teal focus:outline-none w-full"
            />
          ) : (
            <>
              <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
                {household?.name || 'Unnamed Household'}
              </h1>
              <button
                onClick={handleStartRename}
                aria-label="Rename household"
                className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
              >
                <Pencil className="w-4 h-4 text-text-secondary" />
              </button>
            </>
          )}
        </div>
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
                              memberName: member.userId,
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
                              memberName: member.userId,
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
                            memberName: 'yourself',
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

      {/* Danger Zone — owner-only delete section, collapsed by default */}
      {isOwner && (
        <div className="mt-6 bg-coral/5 rounded-2xl border border-coral/20 overflow-hidden">
          <button
            onClick={() => setDangerZoneOpen(!dangerZoneOpen)}
            className="w-full p-5 flex items-center justify-between"
          >
            <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-coral">Danger Zone</h2>
            <ChevronDown className={`w-4 h-4 text-coral transition-transform ${dangerZoneOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`grid transition-all duration-200 ${dangerZoneOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="px-5 pb-5">
                <p className="text-sm text-text-secondary mb-3">
                  This will permanently delete the household and all its items and stores. This can't be undone.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 bg-coral text-white rounded-xl font-display font-bold hover:bg-coral/90 transition-colors"
                >
                  Delete Household
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Household - Are you sure?"
          message="This will permanently delete the household and all its items and stores. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteHousehold}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={deleteHouseholdMutation.isPending}
        />
      )}

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
                `Are you sure you want to remove ${confirmAction.memberName} from this household?`}
              {confirmAction.type === 'transfer' &&
                `Are you sure you want to transfer ownership to ${confirmAction.memberName}? You will become a regular member.`}
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
