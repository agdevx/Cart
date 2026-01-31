// ABOUTME: React hook for managing SSE connections
// ABOUTME: Handles lifecycle of SSE client with cleanup on unmount

import { useEffect, useRef } from 'react'
import { createSSEClient } from '@/libs/sse-client'

export const useSSE = (url: string, token: string, onMessage: (data: any) => void, enabled: boolean = true) => {
  const clientRef = useRef<ReturnType<typeof createSSEClient> | null>(null)

  useEffect(() => {
    if (!enabled || !token) {
      return
    }

    const client = createSSEClient(url, token)
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
  }, [url, token, onMessage, enabled])

  return clientRef.current
}
