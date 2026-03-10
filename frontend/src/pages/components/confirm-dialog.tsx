// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling
// ABOUTME: Optional holdDuration prop requires long-press to confirm, with progress bar feedback

import { useEffect, useRef, useState } from 'react'

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
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const startHold = () => {
    if (!holdDuration) return
    startTimeRef.current = Date.now()
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / holdDuration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        stopHold()
        onConfirm()
      }
    }, 50)
  }

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setProgress(0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const confirmButtonClass = "px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl mx-4 max-w-sm w-full shadow-lg overflow-hidden">
        {holdDuration && (
          <div className="w-full h-1 bg-navy/10">
            <div
              data-testid="hold-progress-bar"
              className="h-full bg-coral"
              style={{ width: `${progress}%`, transition: 'none' }}
            />
          </div>
        )}
        <div className="p-6">
          <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
          <p className="text-text-secondary mb-5">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
            {holdDuration ? (
              <button
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
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
