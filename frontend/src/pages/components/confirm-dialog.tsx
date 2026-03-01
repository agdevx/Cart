// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

export const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onCancel, isPending }: ConfirmDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg">
        <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
        <p className="text-text-secondary mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
