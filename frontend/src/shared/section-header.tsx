// ABOUTME: Section divider with uppercase title and horizontal rule
// ABOUTME: Used across shopping, pantry, household, and trip pages for grouping content

interface SectionHeaderProps {
  readonly title: string
  readonly action?: React.ReactNode
}

export const SectionHeader = ({ title, action }: SectionHeaderProps) => (
  <div className="flex items-center gap-2.5 mb-3">
    <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
      {title}
    </span>
    <span className="flex-1 h-px bg-navy/8" />
    {action}
  </div>
)
