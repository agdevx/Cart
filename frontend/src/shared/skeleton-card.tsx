// ABOUTME: Reusable loading skeleton card with configurable pulsing rows
// ABOUTME: Replaces copy-pasted skeleton markup across page components

interface SkeletonRow {
  width: string
}

interface SkeletonCardProps {
  rows: SkeletonRow[]
}

export const SkeletonCard = ({ rows }: SkeletonCardProps) => (
  <div className="p-4 bg-surface rounded-xl shadow-sm space-y-2">
    {rows.map((row, i) => (
      <div key={i} className={`h-3 bg-navy/8 animate-pulse rounded-lg`} style={{ width: row.width }} />
    ))}
  </div>
)
