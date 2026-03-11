// ABOUTME: Fires a confetti burst for trip completion celebrations
// ABOUTME: Respects prefers-reduced-motion — skips confetti when set

import confetti from 'canvas-confetti'

export function fireCompletionConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } })
}
