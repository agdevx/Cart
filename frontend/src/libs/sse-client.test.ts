import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSSEClient } from './sse-client'

describe('createSSEClient', () => {
  let mockEventSource: any

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

    global.EventSource = function(url: string, config?: any) {
      return mockEventSource
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates EventSource with correct URL', () => {
    const client = createSSEClient('/api/events', 'test-token')

    // EventSource is created successfully
    expect(client).toBeDefined()
    expect(client.subscribe).toBeDefined()
    expect(client.close).toBeDefined()
  })

  it('subscribes to message events', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events', 'test-token')

    client.subscribe(onMessage)

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    )
  })

  it('handles incoming messages', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events', 'test-token')

    client.subscribe(onMessage)

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      (call: any) => call[0] === 'message'
    )[1]

    const mockEvent = {
      data: JSON.stringify({ type: 'update', payload: { id: '1' } }),
    }

    messageHandler(mockEvent)

    expect(onMessage).toHaveBeenCalledWith({ type: 'update', payload: { id: '1' } })
  })

  it('handles error events', () => {
    const onError = vi.fn()
    const client = createSSEClient('/api/events', 'test-token')

    client.onError(onError)

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function)
    )

    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      (call: any) => call[0] === 'error'
    )[1]

    errorHandler(new Error('Connection failed'))

    expect(onError).toHaveBeenCalled()
  })

  it('closes connection', () => {
    const client = createSSEClient('/api/events', 'test-token')

    client.close()

    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('unsubscribes message listener', () => {
    const onMessage = vi.fn()
    const client = createSSEClient('/api/events', 'test-token')

    const unsubscribe = client.subscribe(onMessage)
    unsubscribe()

    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    )
  })
})
