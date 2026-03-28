// ABOUTME: Custom dropdown for selecting personal vs household scope
// ABOUTME: Renders household description text in muted styling, which native selects cannot do

import { useEffect, useRef, useState } from 'react'

import { ChevronDown } from 'lucide-react'

import { sortHouseholds } from '@/utils/sort-households'

interface ScopeSelectProps {
  value: string
  onChange: (value: string) => void
  personalLabel: string
  households: ReadonlyArray<{ id: string; name: string | null }> | undefined
  householdDescription: string
  disabled?: boolean
  'aria-label'?: string
}

export const ScopeSelect = ({ value, onChange, personalLabel, households, householdDescription, disabled, 'aria-label': ariaLabel }: ScopeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getSelectedLabel = () => {
    if (value === '') {
      return <span className="text-text-tertiary">Select scope...</span>
    }

    if (value === 'personal') {
      return personalLabel
    }

    const household = households?.find((h) => h.id === value)
    if (household) {
      return (
        <>
          {household.name} <span className="text-text-tertiary">({householdDescription})</span>
        </>
      )
    }

    return personalLabel
  }

  const handleSelect = (newValue: string) => {
    onChange(newValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal text-left flex items-center justify-between"
      >
        <span>{getSelectedLabel()}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-surface border border-navy/10 rounded-xl shadow-lg z-20 overflow-hidden">
          <button
            type="button"
            onClick={() => handleSelect('personal')}
            className={`w-full px-4 py-3 text-left transition-colors ${
              value === 'personal' ? 'bg-teal/8 text-teal font-semibold' : 'hover:bg-bg-warm text-text'
            }`}
          >
            {personalLabel}
          </button>

          {sortHouseholds(households ?? []).map((household) => (
            <button
              key={household.id}
              type="button"
              onClick={() => handleSelect(household.id)}
              className={`w-full px-4 py-3 text-left transition-colors ${
                value === household.id ? 'bg-teal/8 text-teal font-semibold' : 'hover:bg-bg-warm text-text'
              }`}
            >
              {household.name} <span className="text-text-tertiary">({householdDescription})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
