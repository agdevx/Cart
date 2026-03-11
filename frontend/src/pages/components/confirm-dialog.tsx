// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling
// ABOUTME: Optional holdDuration prop requires long-press to confirm, with smooth CSS transition progress bar

import { useCallback, useEffect, useRef, useState } from 'react'

import { useFocusTrap } from '@/hooks/use-focus-trap'

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
  const [holding, setHolding] = useState(false)
  const holdingRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialogRef, true)

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

  const startHold = useCallback(() => {
    if (!holdDuration) return
    holdingRef.current = true
    setHolding(true)
  }, [holdDuration])

  const stopHold = useCallback(() => {
    if (!holdDuration) return
    holdingRef.current = false
    setHolding(false)
  }, [holdDuration])

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName === 'width' && holdingRef.current) {
      onConfirm()
    }
  }, [onConfirm])

  const confirmButtonClass = "flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div ref={dialogRef} className="bg-surface rounded-2xl mx-4 max-w-sm w-full shadow-lg overflow-hidden">
        {holdDuration && (
          <div className="w-full h-1 bg-navy/10">
            <div
              data-testid="hold-progress-bar"
              className="h-full bg-coral"
              style={{
                width: holding ? '100%' : '0%',
                transition: holding ? `width ${holdDuration}ms linear` : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            />
          </div>
        )}
        <div className="p-6">
          <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
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
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
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
