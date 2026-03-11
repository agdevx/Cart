// ABOUTME: Tests that confetti fires correctly and respects reduced-motion

import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock canvas-confetti
const confettiMock = vi.fn()
vi.mock('canvas-confetti', () => ({
  default: (...args: unknown[]) => confettiMock(...args),
}))

describe('fireCompletionConfetti', () => {
  afterEach(() => {
    confettiMock.mockClear()
    vi.restoreAllMocks()
  })

  it('fires confetti with expected config', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { fireCompletionConfetti } = await import('../confetti')

    fireCompletionConfetti()

    expect(confettiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        particleCount: 80,
        spread: 60,
      }),
    )
  })

  it('skips confetti when prefers-reduced-motion is set', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    // Reset module cache so matchMedia stub takes effect
    vi.resetModules()
    const { fireCompletionConfetti } = await import('../confetti')

    fireCompletionConfetti()

    expect(confettiMock).not.toHaveBeenCalled()
  })
})
