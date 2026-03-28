// ABOUTME: Fallback UI for the top-level error boundary. Shows a friendly error
// message with Reload and Go Home options when a component render error occurs.

import type { FallbackProps } from 'react-error-boundary'
import { Link } from 'react-router-dom'

import { AlertTriangle } from 'lucide-react'

export function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl shadow-md p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-coral/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-coral" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-navy mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          An unexpected error occurred. Try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-teal text-white py-3 px-4 rounded-xl font-display font-bold hover:bg-teal-light transition-colors mb-3"
        >
          Reload
        </button>
        <Link
          to="/"
          onClick={resetErrorBoundary}
          className="text-sm text-teal hover:text-teal-light font-semibold transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
