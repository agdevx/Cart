// ABOUTME: Pantry management page with Items/Stores segmented control and horizontal filter tabs
// ABOUTME: Both Items and Stores tabs support filtering by all, personal, or per-household views

import { useState } from 'react'

import { Plus } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import type { InventoryFilter } from '@/pages/pantry/pantry-items-view'
import { PantryItemsView } from '@/pages/pantry/pantry-items-view'
import { PantryStoresView } from '@/pages/pantry/pantry-stores-view'
import { PageHeader } from '@/shared/page-header'
import { ScopeFilter } from '@/shared/scope-filter'

type InventoryTab = 'items' | 'stores'

export const PantryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [showItemCreateForm, setShowItemCreateForm] = useState(false)
  const { data: households } = useHouseholdsQuery()
  const { data: allItems } = useInventoryQuery()
  const hasItems = (allItems?.length ?? 0) > 0

  return (
    <div className="pb-4">
      <PageHeader>Your <span className="text-teal">Pantry</span></PageHeader>

      <div className="px-5">
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

      {/* Filter Tabs — both Items and Stores tabs */}
      <div className="mb-4">
        <ScopeFilter
          aria-label="Filter inventory"
          value={filter === 'all' ? 'all' : filter === 'personal' ? 'personal' : filter.split(':')[1]}
          onChange={(v) => setFilter(v === 'all' ? 'all' : v === 'personal' ? 'personal' : `household:${v}`)}
          households={households}
        />
      </div>

      {/* Add Item Button — Items tab only, hidden when empty state is showing */}
      {hasItems && activeTab === 'items' && (
        <button
          onClick={() => setShowItemCreateForm(!showItemCreateForm)}
          className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
        >
          <Plus className="w-5 h-5" />
          {showItemCreateForm ? 'Cancel' : 'Add Item'}
        </button>
      )}

      {/* Items View */}
      {activeTab === 'items' && (
        <PantryItemsView
          filter={filter}
          showCreateForm={showItemCreateForm}
          onOpenCreateForm={() => setShowItemCreateForm(true)}
          onCloseCreateForm={() => setShowItemCreateForm(false)}
        />
      )}

      {/* Stores View */}
      {activeTab === 'stores' && <PantryStoresView filter={filter} />}
      </div>
    </div>
  )
}
