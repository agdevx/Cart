// ABOUTME: React hook for managing SSE connections
// ABOUTME: Handles lifecycle of SSE client with cleanup on unmount

import { useEffect, useRef } from 'react'
import { createSSEClient } from '@/libs/sse-client'

export const useSSE = (url: string, onMessage: (data: unknown) => void, enabled: boolean = true): void => {
  const clientRef = useRef<ReturnType<typeof createSSEClient> | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const client = createSSEClient(url)
    clientRef.current = client

    const unsubscribe = client.subscribe(onMessage)

    client.onError((error) => {
      console.error('SSE connection error:', error)
    })

    return () => {
      unsubscribe()
      client.close()
      clientRef.current = null
    }
  }, [url, onMessage, enabled])
}
