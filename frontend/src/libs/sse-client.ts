// ABOUTME: SSE (Server-Sent Events) client wrapper for real-time updates
// ABOUTME: Provides type-safe EventSource interface with subscription management

export interface SSEClient {
  subscribe: (onMessage: (data: any) => void) => () => void
  onError: (onError: (error: Event) => void) => void
  close: () => void
}

export const createSSEClient = (url: string, token: string): SSEClient => {
  const eventSource = new EventSource(url, {
    withCredentials: true,
  })

  const messageHandlers: ((data: any) => void)[] = []
  let errorHandler: ((error: Event) => void) | null = null

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      messageHandlers.forEach((handler) => handler(data))
    } catch (error) {
      console.error('Failed to parse SSE message:', error)
    }
  }

  const handleError = (event: Event) => {
    if (errorHandler) {
      errorHandler(event)
    }
  }

  eventSource.addEventListener('message', handleMessage)
  eventSource.addEventListener('error', handleError)

  return {
    subscribe: (onMessage: (data: any) => void) => {
      messageHandlers.push(onMessage)

      return () => {
        const index = messageHandlers.indexOf(onMessage)
        if (index > -1) {
          messageHandlers.splice(index, 1)
        }
        eventSource.removeEventListener('message', handleMessage)
      }
    },

    onError: (onError: (error: Event) => void) => {
      errorHandler = onError
    },

    close: () => {
      eventSource.close()
    },
  }
}
