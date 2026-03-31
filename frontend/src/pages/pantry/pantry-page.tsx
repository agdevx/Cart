// ABOUTME: Pantry management page with Items/Stores segmented control and horizontal filter tabs
// ABOUTME: Both Items and Stores tabs support filtering by all, personal, or per-household views

import { useState } from 'react'

import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import type { InventoryFilter } from '@/pages/pantry/pantry-items-view'
import { PantryItemsView } from '@/pages/pantry/pantry-items-view'
import { PantryStoresView } from '@/pages/pantry/pantry-stores-view'
import { Fab } from '@/shared/fab'
import { PageHeader } from '@/shared/page-header'
import { ScopeFilter } from '@/shared/scope-filter'

type InventoryTab = 'items' | 'stores'

export const PantryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [showItemCreateForm, setShowItemCreateForm] = useState(false)
  const [showStoreCreateForm, setShowStoreCreateForm] = useState(false)
  const { data: household } = useHouseholdQuery()
  useInventoryQuery() // prefetch for child PantryItemsView

  return (
    <div className="pb-4 animate-fade-in">
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
      {household && (
        <div className="mb-4">
          <ScopeFilter
            aria-label="Filter inventory"
            value={filter}
            onChange={setFilter}
            household={household}
          />
        </div>
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
      {activeTab === 'stores' && (
        <PantryStoresView
          filter={filter}
          showCreateForm={showStoreCreateForm}
          onOpenCreateForm={() => setShowStoreCreateForm(true)}
          onCloseCreateForm={() => setShowStoreCreateForm(false)}
        />
      )}
      </div>

      {/* FAB — one action per tab; hidden while the relevant create form is open */}
      {activeTab === 'items' && !showItemCreateForm && (
        <Fab
          actions={[{
            label: 'Add Item',
            onClick: () => setShowItemCreateForm(true),
          }]}
        />
      )}
      {activeTab === 'stores' && !showStoreCreateForm && (
        <Fab
          actions={[{
            label: 'Add Store',
            onClick: () => setShowStoreCreateForm(true),
          }]}
        />
      )}
    </div>
  )
}
