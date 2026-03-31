// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling
// ABOUTME: Optional holdDuration prop requires long-press to confirm, with smooth CSS transition progress bar

import { useCallback, useEffect, useRef } from 'react'

import { useFocusTrap } from '@/services/use-focus-trap.service'
import { useLongPressService } from '@/services/use-long-press.service'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  holdDuration?: number
}

export const ConfirmDialog = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, isPending, holdDuration }: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialogRef, true)

  const stableOnConfirm = useCallback(() => onConfirm(), [onConfirm])
  const { pressing: holding, handlers: holdHandlers, duration: holdMs } = useLongPressService({
    duration: holdDuration ?? 0,
    onComplete: stableOnConfirm,
  })

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Focus Cancel button on mount (override focus trap's default of first element)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  const confirmButtonClass = "flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="bg-surface rounded-2xl mx-4 max-w-sm w-full shadow-lg overflow-hidden">
        {holdDuration && (
          <div className="w-full h-1 bg-navy/10">
            <div
              data-testid="hold-progress-bar"
              className="h-full bg-coral"
              style={{
                width: holding ? '100%' : '0%',
                transition: holding ? `width ${holdMs}ms linear` : 'none',
              }}
            />
          </div>
        )}
        <div className="p-6">
          <h3 id="confirm-dialog-title" className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
          <p className="text-text-secondary mb-5">{message}</p>
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
            {holdDuration ? (
              <button
                {...holdHandlers}
                disabled={isPending}
                className={confirmButtonClass}
              >
                {confirmLabel}
              </button>
            ) : (
              <button
                onClick={onConfirm}
                disabled={isPending}
                className={confirmButtonClass}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
