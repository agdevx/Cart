// ABOUTME: Household management page for single-household model
// ABOUTME: Two states: no household (create/join) or in household (members, invite, management, danger zone)

import { useState } from 'react'

import { ChevronDown, Copy, LogOut, Pencil, RefreshCw, Users } from 'lucide-react'

import { useCreateHouseholdMutation } from '@/apis/agdevx-cart-api/household/create-household.mutation'
import { useDeleteHouseholdMutation } from '@/apis/agdevx-cart-api/household/delete-household.mutation'
import { useDemoteOwnerMutation } from '@/apis/agdevx-cart-api/household/demote-owner.mutation'
import { useJoinHouseholdMutation } from '@/apis/agdevx-cart-api/household/join-household.mutation'
import { useLeaveHouseholdMutation } from '@/apis/agdevx-cart-api/household/leave-household.mutation'
import { usePromoteOwnerMutation } from '@/apis/agdevx-cart-api/household/promote-owner.mutation'
import { useRegenerateInviteCodeMutation } from '@/apis/agdevx-cart-api/household/regenerate-invite-code.mutation'
import { useRemoveHouseholdMemberMutation } from '@/apis/agdevx-cart-api/household/remove-household-member.mutation'
import { useUpdateHouseholdMutation } from '@/apis/agdevx-cart-api/household/update-household.mutation'
import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useInviteCodeQuery } from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import { useSwapStatusQuery } from '@/apis/agdevx-cart-api/household/use-swap-status.query'
import { useAuth } from '@/auth/use-auth'
import { ConfirmDialog } from '@/shared/confirm-dialog'
import { EmptyState } from '@/shared/empty-state'
import { PageHeader } from '@/shared/page-header'
import { SectionHeader } from '@/shared/section-header'
import { getErrorMessage } from '@/utils/error-messages'

import { MemberGrid } from './member-grid'
import { SwapConfirmModal } from './swap-confirm-modal'

/** Duration in milliseconds the user must hold the delete button */
const DELETE_HOLD_DURATION_MS = 5000

export const HouseholdPage = () => {
  const { user } = useAuth()

  /* Queries */
  const { data: household, isLoading: householdLoading } = useHouseholdQuery()
  const { data: members, isLoading: membersLoading } = useHouseholdMembersQuery(household?.id ?? '')
  const { data: inviteCode, isLoading: codeLoading } = useInviteCodeQuery(household?.id ?? '')
  const { data: swapStatus } = useSwapStatusQuery()

  /* Mutations */
  const createMutation = useCreateHouseholdMutation()
  const joinMutation = useJoinHouseholdMutation()
  const leaveMutation = useLeaveHouseholdMutation()
  const deleteMutation = useDeleteHouseholdMutation()
  const updateMutation = useUpdateHouseholdMutation()
  const regenerateCodeMutation = useRegenerateInviteCodeMutation()
  const promoteMutation = usePromoteOwnerMutation()
  const demoteMutation = useDemoteOwnerMutation()
  const removeMemberMutation = useRemoveHouseholdMemberMutation()

  /* Form state */
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  /* Rename state */
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState('')

  /* UI state */
  const [codeCopied, setCodeCopied] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  /* Swap modal state — tracks which action triggered it and the target name */
  const [swapAction, setSwapAction] = useState<{
    type: 'create' | 'join'
    name: string
    code?: string
  } | null>(null)

  const currentUserId = user?.id ?? ''
  const currentMember = members?.find((m) => m.userId === currentUserId)
  const isOwner = currentMember?.isOwner ?? false
  const hasHousehold = !!household

  /* ── Create / Join with swap check ── */

  const executeCreate = async (name: string) => {
    try {
      await createMutation.mutateAsync({ name: name.trim() })
      setCreateName('')
      setSwapAction(null)
    } catch {
      // Error displayed inline
    }
  }

  const executeJoin = async (code: string) => {
    try {
      await joinMutation.mutateAsync({ inviteCode: code.trim() })
      setJoinCode('')
      setSwapAction(null)
    } catch {
      // Error displayed inline
    }
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) { return }

    /* Check swap status — if user is already in a household, may need confirmation */
    if (swapStatus && swapStatus.scenario !== 'none') {
      setSwapAction({ type: 'create', name: createName.trim() })
      return
    }

    executeCreate(createName)
  }

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) { return }

    if (swapStatus && swapStatus.scenario !== 'none') {
      setSwapAction({ type: 'join', name: joinCode.trim(), code: joinCode.trim() })
      return
    }

    executeJoin(joinCode)
  }

  const handleSwapConfirm = () => {
    if (!swapAction) { return }

    if (swapAction.type === 'create') {
      executeCreate(swapAction.name)
    } else {
      executeJoin(swapAction.code!)
    }
  }

  /* ── Invite code actions ── */

  const handleCopyCode = async () => {
    if (!inviteCode) { return }
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleRegenerateCode = () => {
    if (!household?.id) { return }
    regenerateCodeMutation.mutate(household.id)
  }

  /* ── Rename ── */

  const handleStartRename = () => {
    setEditName(household?.name || '')
    setIsRenaming(true)
  }

  const handleSaveRename = () => {
    if (!household?.id || !editName.trim()) { return }

    if (editName.trim() === household.name) {
      setIsRenaming(false)
      return
    }

    updateMutation.mutate(
      { householdId: household.id, name: editName.trim() },
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

  /* ── Leave / Delete ── */

  const handleLeave = () => {
    leaveMutation.mutate(undefined, {
      onSuccess: () => setShowLeaveConfirm(false),
    })
  }

  const handleDelete = () => {
    if (!household?.id) { return }
    deleteMutation.mutate(household.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    })
  }

  /* ── Member management ── */

  const handlePromote = (userId: string) => {
    if (!household?.id) { return }
    promoteMutation.mutate({ householdId: household.id, userId })
  }

  const handleDemote = (userId: string) => {
    if (!household?.id) { return }
    demoteMutation.mutate({ householdId: household.id, userId })
  }

  const handleRemoveMember = (userId: string) => {
    if (!household?.id) { return }
    removeMemberMutation.mutate({ householdId: household.id, userId })
  }

  /* ── Loading skeleton ── */

  if (householdLoading) {
    return (
      <div className="px-5 pt-7">
        <div className="h-9 w-44 bg-navy/8 animate-pulse rounded-lg mb-6" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="p-5 bg-surface rounded-2xl shadow-sm space-y-2">
              <div className="h-3 w-1/2 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2.5 w-1/4 bg-navy/8 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════
     State 1: No household — Create or Join
     ══════════════════════════════════════════════════════════ */

  if (!hasHousehold) {
    return (
      <div className="pb-4 animate-fade-in">
        <PageHeader>Your <span className="text-teal">Household</span></PageHeader>

        <div className="px-5">
          <EmptyState
            icon={Users}
            title="No household yet"
            subtitle="Create a new household or join one with an invite code"
          />

          {/* Create Household card */}
          <div className="mt-6 p-5 bg-surface rounded-2xl shadow-sm">
            <SectionHeader title="Create Household" />
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Household name"
                className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                disabled={createMutation.isPending}
              />

              {createMutation.isError && (
                <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
                  {getErrorMessage(createMutation.error)}
                </div>
              )}

              <button
                type="submit"
                disabled={!createName.trim() || createMutation.isPending}
                className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>

          {/* Join Household card */}
          <div className="mt-4 p-5 bg-surface rounded-2xl shadow-sm">
            <SectionHeader title="Join with Invite Code" />
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                disabled={joinMutation.isPending}
              />

              {joinMutation.isError && (
                <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
                  {getErrorMessage(joinMutation.error)}
                </div>
              )}

              <button
                type="submit"
                disabled={!joinCode.trim() || joinMutation.isPending}
                className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light disabled:opacity-50 transition-colors"
              >
                {joinMutation.isPending ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        {/* Swap confirmation modal */}
        {swapAction && swapStatus && (
          <SwapConfirmModal
            swapStatus={swapStatus}
            targetName={swapAction.name}
            onConfirm={handleSwapConfirm}
            onCancel={() => setSwapAction(null)}
            isPending={createMutation.isPending || joinMutation.isPending}
          />
        )}
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════
     State 2: In a household — Management view
     ══════════════════════════════════════════════════════════ */

  const isDataLoading = membersLoading || codeLoading

  return (
    <div className="pb-4 animate-fade-in">
      {/* Header with household name */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleSaveRename}
              autoFocus
              disabled={updateMutation.isPending}
              className="font-display text-[28px] font-extrabold text-teal tracking-tight bg-transparent border-b-2 border-teal focus:outline-none w-full"
            />
          ) : (
            <>
              <h1 className="font-display text-[28px] font-extrabold text-teal tracking-tight">
                {household.name || 'Unnamed Household'}
              </h1>
              {isOwner && (
                <button
                  onClick={handleStartRename}
                  aria-label="Rename household"
                  className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-text-secondary" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-5">
        {isDataLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="p-5 bg-surface rounded-2xl shadow-sm space-y-2">
                <div className="h-3 w-1/2 bg-navy/8 animate-pulse rounded-lg" />
                <div className="h-2.5 w-1/4 bg-navy/8 animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Members section */}
            <div className="mb-6 p-5 bg-surface rounded-2xl shadow-sm">
              <SectionHeader title={`Members (${members?.length || 0})`} />
              <MemberGrid
                members={members || []}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onPromote={handlePromote}
                onDemote={handleDemote}
                onRemove={handleRemoveMember}
                isPromoting={promoteMutation.isPending}
                isDemoting={demoteMutation.isPending}
                isRemoving={removeMemberMutation.isPending}
              />
            </div>

            {/* Invite Code section */}
            <div className="mb-6 p-5 bg-surface rounded-2xl shadow-sm">
              <SectionHeader title="Invite Code" />
              <div className="flex items-center gap-3 flex-wrap">
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

            {/* Leave section */}
            <div className="mb-6">
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-surface rounded-xl shadow-sm text-coral font-display font-bold text-sm hover:bg-coral/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Household
              </button>
            </div>

            {/* Danger Zone — owner-only delete section, collapsed by default */}
            {isOwner && (
              <div className="bg-coral/5 rounded-2xl border border-coral/20 overflow-hidden">
                <button
                  onClick={() => setDangerZoneOpen(!dangerZoneOpen)}
                  className="w-full p-5 flex items-center justify-between hover:bg-coral/5 transition-colors"
                >
                  <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-coral">Danger Zone</h2>
                  <ChevronDown className={`w-4 h-4 text-coral transition-transform ${dangerZoneOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-200 ${dangerZoneOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5">
                      <p className="text-sm text-text-secondary mb-3">
                        This will permanently delete the household and all its items and stores. This cannot be undone.
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
          </>
        )}
      </div>

      {/* Leave Confirmation Dialog */}
      {showLeaveConfirm && (
        <ConfirmDialog
          title="Leave Household"
          message={`Are you sure you want to leave "${household.name}"?`}
          confirmLabel="Leave"
          onConfirm={handleLeave}
          onCancel={() => setShowLeaveConfirm(false)}
          isPending={leaveMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog — requires 5-second long-press */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Household"
          message="This will permanently delete the household and all its items and stores. This cannot be undone."
          confirmLabel="Hold to Delete"
          holdDuration={DELETE_HOLD_DURATION_MS}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
