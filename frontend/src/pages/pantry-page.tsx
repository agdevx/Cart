// ABOUTME: Pantry management page with Items/Stores segmented control and horizontal filter tabs
// ABOUTME: Items tab supports filtering by all, personal, or per-household views

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

      {/* Add Item Button — Items tab only */}
      {activeTab === 'items' && (
        <Link
          to={filter === 'all' || filter === 'personal' ? '/pantry/add' : `/pantry/add?scope=${filter}`}
          className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </Link>
      )}

      {/* Filter Tabs — Items tab only */}
      {activeTab === 'items' && (
        <div role="tablist" aria-label="Filter inventory" className="flex bg-bg-warm rounded-xl p-1 mb-4 overflow-x-auto">
          <button
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-teal text-white shadow-sm'
                : 'text-text-secondary hover:text-navy'
            }`}
          >
            All
          </button>
          <button
            role="tab"
            aria-selected={filter === 'personal'}
            onClick={() => setFilter('personal')}
            className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
              filter === 'personal'
                ? 'bg-teal text-white shadow-sm'
                : 'text-text-secondary hover:text-navy'
            }`}
          >
            Personal
          </button>
          {(households || []).map((household) => (
            <button
              key={household.id}
              role="tab"
              aria-selected={filter === `household:${household.id}`}
              onClick={() => setFilter(`household:${household.id}`)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
                filter === `household:${household.id}`
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              {household.name}
            </button>
          ))}
        </div>
      )}

      {/* Items View */}
      {activeTab === 'items' && <PantryItemsView filter={filter} />}

      {/* Stores View */}
      {activeTab === 'stores' && <PantryStoresView />}
    </div>
  )
}
