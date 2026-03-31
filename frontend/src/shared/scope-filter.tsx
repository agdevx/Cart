// ABOUTME: All/Personal/Household filter tabs used on pantry and add-trip-items pages
// ABOUTME: Shows three tabs when a household exists, returns null otherwise

interface ScopeFilterProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly household: { readonly id: string; readonly name: string | null } | null | undefined
  readonly 'aria-label'?: string
}

export const ScopeFilter = ({ value, onChange, household, 'aria-label': ariaLabel }: ScopeFilterProps) => {
  if (!household) {
    return null
  }

  const buttonClass = (isActive: boolean) =>
    `flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
      isActive
        ? 'bg-teal text-white shadow-sm'
        : 'text-text-secondary hover:text-navy'
    }`

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex bg-bg-warm rounded-xl p-1 overflow-x-auto">
      <button
        role="tab"
        aria-selected={value === 'all'}
        onClick={() => onChange('all')}
        className={buttonClass(value === 'all')}
      >
        All
      </button>
      <button
        role="tab"
        aria-selected={value === 'personal'}
        onClick={() => onChange('personal')}
        className={buttonClass(value === 'personal')}
      >
        Personal
      </button>
      <button
        role="tab"
        aria-selected={value === household.id}
        onClick={() => onChange(household.id)}
        className={buttonClass(value === household.id)}
      >
        {household.name} Household
      </button>
    </div>
  )
}
