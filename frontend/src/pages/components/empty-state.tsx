// ABOUTME: Reusable empty state with icon, title, optional subtitle, and optional CTA button
// ABOUTME: Used across 7 pages to replace plain "No items yet" text

import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-teal" />
      </div>
      <h3 className="font-display text-[17px] font-bold text-navy mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-text-secondary text-center">{subtitle}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
