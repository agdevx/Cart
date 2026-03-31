// ABOUTME: Custom hook for long-press interactions with progress tracking
// ABOUTME: Standardizes the hold-to-confirm pattern used in trip cards and confirmation dialogs

import { useCallback, useRef, useState } from 'react'

interface UseLongPressOptions {
  duration: number
  onComplete: () => void
}

export const useLongPressService = ({ duration, onComplete }: UseLongPressOptions) => {
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPressing(true)
    timerRef.current = setTimeout(() => {
      setPressing(false)
      onComplete()
    }, duration)
  }, [duration, onComplete])

  const cancel = useCallback((e?: React.PointerEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPressing(false)
  }, [])

  const handlers = {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }

  return { pressing, handlers, duration }
}
