// ABOUTME: Pantry management page with Items/Stores segmented control and filter dropdown
// ABOUTME: Items tab supports filtering by all, personal, household, or merged views

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Plus } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { PantryItemsView } from '@/pages/pantry-items-view'
import type { InventoryFilter } from '@/pages/pantry-items-view'
import { PantryStoresView } from '@/pages/pantry-stores-view'

type InventoryTab = 'items' | 'stores'

export const PantryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const { data: households } = useHouseholdsQuery()

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Pantry</span>
        </h1>
        {activeTab === 'items' && (
          <Link
            to="/pantry/add"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        )}
      </div>

      {/* Segmented Control */}
      <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 mb-4">
        <button
          role="tab"
          aria-selected={activeTab === 'items'}
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'items'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Items
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stores'}
          onClick={() => setActiveTab('stores')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'stores'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Stores
        </button>
      </div>

      {/* Filter Dropdown — Items tab only */}
      {activeTab === 'items' && (
        <select
          aria-label="Filter inventory"
          value={filter}
          onChange={(e) => setFilter(e.target.value as InventoryFilter)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent mb-4"
        >
          <option value="all">All Items</option>
          <option value="personal">Personal</option>
          {(households || []).map((household) => (
            <optgroup key={household.id} label={household.name ?? undefined}>
              <option value={`household:${household.id}`}>{household.name}</option>
              <option value={`merged:${household.id}`}>{household.name} + Personal</option>
            </optgroup>
          ))}
        </select>
      )}

      {/* Items View */}
      {activeTab === 'items' && <PantryItemsView filter={filter} />}

      {/* Stores View */}
      {activeTab === 'stores' && <PantryStoresView />}
    </div>
  )
}
