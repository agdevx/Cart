// ABOUTME: PWA install prompt component
// ABOUTME: Shows "Add to Home Screen" prompt for installable PWAs

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-surface p-5 rounded-2xl shadow-lg border border-navy/8 z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-display font-bold text-navy">Install AGDevX Cart</h3>
          <p className="text-sm text-text-secondary mt-1">
            Add to home screen for quick access and offline support
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-tertiary hover:text-navy-soft transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 bg-teal text-white py-2.5 px-4 rounded-xl font-display font-bold hover:bg-teal-light transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-bg-warm text-navy-soft py-2.5 px-4 rounded-xl font-semibold hover:bg-navy/10 transition-colors"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
