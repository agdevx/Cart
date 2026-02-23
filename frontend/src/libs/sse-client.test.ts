import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSSEClient } from './sse-client'

interface MockEventSource {
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  readyState: number
  CONNECTING: number
  OPEN: number
  CLOSED: number
}

describe('createSSEClient', () => {
  let mockEventSource: MockEventSource

  beforeEach(() => {
    mockEventSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 0,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
    }

    global.EventSource = function() {
      return mockEventSource as unknown as EventSource
    } as unknown as typeof EventSource
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates EventSource with correct URL', () => {
    const client = createSSEClient('/api/events')

    // EventSource is created successfully
    expect(client).toBeDefined()
    expect(client.subscribe).toBeDefined()
    expect(client.close).toBeDefined()
  })

  it('subscribes to message events', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events')

    client.subscribe(onMessage)

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    )
  })

  it('handles incoming messages', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events')

    client.subscribe(onMessage)

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'message'
    )![1]

    const mockEvent = {
      data: JSON.stringify({ type: 'update', payload: { id: '1' } }),
    }

    messageHandler(mockEvent)

    expect(onMessage).toHaveBeenCalledWith({ type: 'update', payload: { id: '1' } })
  })

  it('handles error events', () => {
    const onError = vi.fn()
    const client = createSSEClient('/api/events')

    client.onError(onError)

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function)
    )

    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'error'
    )![1]

    errorHandler(new Error('Connection failed'))

    expect(onError).toHaveBeenCalled()
  })

  it('closes connection', () => {
    const client = createSSEClient('/api/events')

    client.close()

    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('unsubscribes message listener', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events')

    const unsubscribe = client.subscribe(onMessage)
    unsubscribe()

    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    )
  })
})
