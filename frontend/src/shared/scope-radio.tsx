// ABOUTME: Radio group for selecting personal vs household scope
// ABOUTME: Hidden when user has no household (solo mode)

interface ScopeRadioProps {
  value: string
  onChange: (value: string) => void
  household: { id: string; name: string | null } | null | undefined
  disabled?: boolean
}

export const ScopeRadio = ({ value, onChange, household, disabled }: ScopeRadioProps) => {
  if (!household) {
    return null
  }

  const options = [
    { value: 'personal', label: 'Personal' },
    { value: household.id, label: `${household.name} Household` },
  ]

  return (
    <div className="flex gap-4">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="scope"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            className="w-4 h-4 text-teal accent-teal"
          />
          <span className="text-sm font-display font-bold text-navy">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
