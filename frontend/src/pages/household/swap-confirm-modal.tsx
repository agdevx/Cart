// ABOUTME: Modal for confirming household swap (create/join while already in a household)
// ABOUTME: Shows scenario-specific messaging with 5-second long-press confirmation for destructive actions

import type { SwapStatusResponse } from '@/apis/agdevx-cart-api/models/household'
import { ConfirmDialog } from '@/shared/confirm-dialog'

/** Duration in milliseconds the user must hold the confirm button */
const SWAP_HOLD_DURATION_MS = 5000

interface SwapConfirmModalProps {
  readonly swapStatus: SwapStatusResponse
  /** Name of the household being joined or created */
  readonly targetName: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
  readonly isPending: boolean
}

/**
 * Builds the modal message based on the swap scenario.
 * Returns null for the 'none' scenario (no modal needed).
 */
const getSwapMessage = (
  scenario: SwapStatusResponse['scenario'],
  currentName: string | null,
  targetName: string,
  coOwnerName: string | null,
): string | null => {
  const current = currentName || 'your current household'
  const target = targetName || 'the new household'

  switch (scenario) {
    case 'none':
      return null

    case 'regular-member':
      return `Joining "${target}" will remove you from "${current}".`

    case 'has-co-owner':
      return `You're an owner of "${current}". Joining "${target}" will remove you from "${current}". ${coOwnerName || 'The co-owner'} will remain as owner.`

    case 'sole-member':
      return `You're the only member of "${current}". By joining "${target}", your current household will be deleted with all of its data.`

    case 'ownership-transfer-required':
      return `You cannot join this household until you transfer ownership of your current household to one of the other members.`
  }
}

export const SwapConfirmModal = ({
  swapStatus,
  targetName,
  onConfirm,
  onCancel,
  isPending,
}: SwapConfirmModalProps) => {
  const message = getSwapMessage(
    swapStatus.scenario,
    swapStatus.currentHouseholdName,
    targetName,
    swapStatus.coOwnerName,
  )

  /* 'none' scenario — no modal needed, caller should handle this */
  if (!message) { return null }

  /* 'ownership-transfer-required' — dismiss-only, no confirm action */
  if (swapStatus.scenario === 'ownership-transfer-required') {
    return (
      <ConfirmDialog
        title="Cannot Switch Households"
        message={message}
        confirmLabel="OK"
        onConfirm={onCancel}
        onCancel={onCancel}
        isPending={false}
      />
    )
  }

  /* Destructive swap — requires 5-second long-press */
  return (
    <ConfirmDialog
      title="Switch Households?"
      message={message}
      confirmLabel="Hold to Confirm"
      holdDuration={SWAP_HOLD_DURATION_MS}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isPending={isPending}
    />
  )
}
