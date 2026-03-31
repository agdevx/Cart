// ABOUTME: Member grid component displaying household members as avatar circles
// ABOUTME: Shows initials, name, owner badge, and owner-only management actions (promote/demote/remove)

import { useState } from 'react'

import { ChevronDown, ChevronUp, UserMinus } from 'lucide-react'

import type { HouseholdMember } from '@/apis/agdevx-cart-api/models/household'
import { ConfirmDialog } from '@/shared/confirm-dialog'

interface MemberGridProps {
  readonly members: HouseholdMember[]
  readonly currentUserId: string
  readonly isOwner: boolean
  readonly onPromote: (userId: string) => void
  readonly onDemote: (userId: string) => void
  readonly onRemove: (userId: string) => void
  readonly isPromoting: boolean
  readonly isDemoting: boolean
  readonly isRemoving: boolean
}

type ConfirmAction = {
  type: 'promote' | 'demote' | 'remove'
  userId: string
  memberName: string
}

/** Extracts up to two initials from a display name */
const getInitials = (name: string | null): string => {
  if (!name) { return '?' }

  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

export const MemberGrid = ({
  members,
  currentUserId,
  isOwner,
  onPromote,
  onDemote,
  onRemove,
  isPromoting,
  isDemoting,
  isRemoving,
}: MemberGridProps) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const handleCircleClick = (userId: string) => {
    if (!isOwner || userId === currentUserId) { return }
    setSelectedMemberId((prev) => (prev === userId ? null : userId))
  }

  const handleConfirm = () => {
    if (!confirmAction) { return }

    if (confirmAction.type === 'promote') {
      onPromote(confirmAction.userId)
    } else if (confirmAction.type === 'demote') {
      onDemote(confirmAction.userId)
    } else {
      onRemove(confirmAction.userId)
    }

    setConfirmAction(null)
    setSelectedMemberId(null)
  }

  const confirmMessages: Record<ConfirmAction['type'], (name: string) => string> = {
    promote: (name) => `Promote ${name} to co-owner? They will have full management access.`,
    demote: (name) => `Demote ${name} from co-owner? They will become a regular member.`,
    remove: (name) => `Remove ${name} from the household?`,
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId
          const isSelected = selectedMemberId === member.userId
          const displayName = isSelf ? 'You' : (member.name || 'Unknown')

          return (
            <div key={member.userId} className="flex flex-col items-center gap-1.5">
              {/* Avatar circle */}
              <button
                type="button"
                onClick={() => handleCircleClick(member.userId)}
                disabled={!isOwner || isSelf}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-teal/25 ring-2 ring-teal'
                    : 'bg-teal/15'
                } ${isOwner && !isSelf ? 'cursor-pointer hover:bg-teal/25' : 'cursor-default'}`}
              >
                <span className="text-lg font-display font-bold text-teal">
                  {getInitials(member.name)}
                </span>
              </button>

              {/* Name */}
              <span className="text-xs font-medium text-navy truncate max-w-[72px]">
                {displayName}
              </span>

              {/* Owner badge */}
              {member.isOwner && (
                <span className="text-[10px] font-bold text-amber uppercase tracking-wider">Owner</span>
              )}

              {/* Management actions — shown when owner selects a member */}
              {isOwner && isSelected && !isSelf && (
                <div className="flex gap-1 mt-1 animate-fade-in">
                  {member.isOwner ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'demote', userId: member.userId, memberName: displayName })}
                      aria-label={`Demote ${displayName}`}
                      className="p-1.5 rounded-lg bg-amber/10 text-amber hover:bg-amber/20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'promote', userId: member.userId, memberName: displayName })}
                      aria-label={`Promote ${displayName}`}
                      className="p-1.5 rounded-lg bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmAction({ type: 'remove', userId: member.userId, memberName: displayName })}
                    aria-label={`Remove ${displayName}`}
                    className="p-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Owner legend — only show if there are owners */}
      {isOwner && (
        <p className="text-xs text-text-tertiary mt-3">
          Tap a member to manage their role.
        </p>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'promote' ? 'Promote to Co-Owner'
              : confirmAction.type === 'demote' ? 'Demote from Co-Owner'
                : 'Remove Member'
          }
          message={confirmMessages[confirmAction.type](confirmAction.memberName)}
          confirmLabel={
            confirmAction.type === 'promote' ? 'Promote'
              : confirmAction.type === 'demote' ? 'Demote'
                : 'Remove'
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          isPending={isPromoting || isDemoting || isRemoving}
        />
      )}
    </>
  )
}
