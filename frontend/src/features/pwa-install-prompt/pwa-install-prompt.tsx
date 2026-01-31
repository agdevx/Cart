// ABOUTME: PWA install prompt component
// ABOUTME: Shows "Add to Home Screen" prompt for installable PWAs

import { useEffect, useState } from 'react'

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
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
    <div className="fixed bottom-20 left-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Install AGDevX Cart</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add to home screen for quick access and offline support
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
