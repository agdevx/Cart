// ABOUTME: All/Store filter tabs used on add-trip-items page
// ABOUTME: Sorts stores alphabetically and handles tab selection

import { useMemo } from 'react'

import { sortStores } from '@/utils/sort-stores'

interface StoreFilterProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly stores: ReadonlyArray<{ readonly id: string; readonly name: string }>
  readonly storeDisplayNames: ReadonlyMap<string, string>
}

export const StoreFilter = ({ value, onChange, stores, storeDisplayNames }: StoreFilterProps) => {
  const sorted = useMemo(() => sortStores(stores), [stores])

  const buttonClass = (isActive: boolean) =>
    `flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
      isActive
        ? 'bg-teal text-white shadow-sm'
        : 'text-text-secondary hover:text-navy'
    }`

  return (
    <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 overflow-x-auto">
      <button
        role="tab"
        aria-selected={value === 'all'}
        onClick={() => onChange('all')}
        className={buttonClass(value === 'all')}
      >
        All
      </button>
      {sorted.map((store) => (
        <button
          key={store.id}
          role="tab"
          aria-selected={value === store.id}
          onClick={() => onChange(store.id)}
          className={buttonClass(value === store.id)}
        >
          {storeDisplayNames.get(store.id) ?? store.name}
        </button>
      ))}
    </div>
  )
}
