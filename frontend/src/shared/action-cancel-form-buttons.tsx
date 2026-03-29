// ABOUTME: Cancel/Submit button pair used in all form footers
// ABOUTME: Handles spinner display on pending state and disabled styling

import { Spinner } from './spinner'

interface ActionCancelFormButtonsProps {
  readonly onCancel: () => void
  readonly submitLabel: string
  readonly isPending: boolean
  readonly disabled?: boolean
  readonly type?: 'submit' | 'button'
  readonly onSubmit?: () => void
}

export const ActionCancelFormButtons = ({
  onCancel,
  submitLabel,
  isPending,
  disabled = false,
  type = 'submit',
  onSubmit,
}: ActionCancelFormButtonsProps) => (
  <div className="flex gap-3">
    <button
      type="button"
      onClick={onCancel}
      className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
    >
      Cancel
    </button>
    <button
      type={type}
      onClick={onSubmit}
      disabled={isPending || disabled}
      className="flex flex-1 items-center justify-center py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
    >
      {isPending ? <Spinner /> : submitLabel}
    </button>
  </div>
)
