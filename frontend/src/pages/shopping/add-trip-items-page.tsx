// ABOUTME: Full-screen page for selecting pantry items to add to a shopping trip
// ABOUTME: Supports search, source filtering, batch selection, and quantity editing

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ArrowLeft, Search } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useAddTripItemMutation } from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { tripDetailPath } from '@/routes'
import { EmptyState } from '@/shared/empty-state'
import { ScopeFilter } from '@/shared/scope-filter'
import { Spinner } from '@/shared/spinner'
import { getStoreDisplayNames } from '@/utils/get-store-display-names'
import { sortItems } from '@/utils/sort-items'

type SourceFilter = 'all' | 'personal' | string

interface SelectedItem {
  quantity: number
  storeId: string | null
}

export const AddTripItemsPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: inventory } = useInventoryQuery()
  const { data: households } = useHouseholdsQuery()
  const { data: tripItems } = useTripItemsQuery(tripId!)
  const householdIds = useMemo(() => households?.map((h) => h.id) ?? [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const addTripItemMutation = useAddTripItemMutation()

  const [searchText, setSearchText] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({})
  const [isAdding, setIsAdding] = useState(false)

  // Reset store filter when source filter changes
  useEffect(() => {
    setStoreFilter('all')
  }, [sourceFilter])

  // IDs of items already on the trip
  const existingItemIds = useMemo(
    () => new Set(tripItems?.map((ti) => ti.inventoryItemId) || []),
    [tripItems]
  )

  // Derive stores visible in the store filter based on the current source filter scope
  const filteredStores = useMemo(() => {
    if (!stores) return []
    if (sourceFilter === 'all') return stores
    if (sourceFilter === 'personal') {
      return stores.filter((s) => s.userId !== null && s.householdId === null)
    }
    // sourceFilter is a household ID
    return stores.filter((s) => s.householdId === sourceFilter)
  }, [stores, sourceFilter])

  const storeDisplayNames = useMemo(
    () => getStoreDisplayNames(stores ?? [], households ?? []),
    [stores, households]
  )

  // Filter inventory items based on source filter, store filter, search text, and existing trip items
  const filteredItems = useMemo(() => {
    if (!inventory) return []

    let items = inventory.filter((item) => !existingItemIds.has(item.id))

    // Apply source filter
    if (sourceFilter === 'personal') {
      items = items.filter((item) => item.ownerUserId !== null && item.householdId === null)
    } else if (sourceFilter !== 'all') {
      // sourceFilter is a household ID
      items = items.filter((item) => item.householdId === sourceFilter)
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      items = items.filter((item) => item.defaultStoreId === storeFilter)
    }

    // Apply search text filter
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(search))
    }

    return sortItems(items)
  }, [inventory, existingItemIds, sourceFilter, storeFilter, searchText])

  const selectedCount = Object.keys(selectedItems).length

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      const item = inventory?.find((i) => i.id === itemId)
      return { ...prev, [itemId]: { quantity: 1, storeId: item?.defaultStoreId ?? null } }
    })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: Math.max(1, quantity) },
    }))
  }

  const updateStore = (itemId: string, storeId: string | null) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], storeId },
    }))
  }

  const handleAddItems = async () => {
    if (!tripId || selectedCount === 0) return

    setIsAdding(true)
    try {
      await Promise.all(
        Object.entries(selectedItems).map(([inventoryItemId, { quantity, storeId }]) =>
          addTripItemMutation.mutateAsync({
            tripId,
            inventoryItemId,
            quantity,
            storeId,
          })
        )
      )
      navigate(tripDetailPath(tripId!))
    } catch {
      // Error handled by mutation state
      setIsAdding(false)
    }
  }

  const getSourceLabel = (householdId: string | null): string => {
    if (!householdId) return 'Personal'
    const household = households?.find((h) => h.id === householdId)
    return household?.name || 'Household'
  }

  if (tripLoading) {
    return (
      <div className="px-5 pt-7">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="px-5 pt-7">
        <p className="text-text-secondary">Trip not found</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-7 pb-28 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(tripDetailPath(tripId!))}
        className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trip
      </button>

      {/* Title */}
      <div className="mb-4">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">Add Items</h1>
        <p className="text-text-secondary text-sm">{trip.name}</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
        />
      </div>

      {/* Source and store filter toggles */}
      <div className="space-y-3 mb-4">
        {/* Source filter */}
        <ScopeFilter
          value={sourceFilter}
          onChange={setSourceFilter}
          households={households}
        />

        {/* Store filter */}
        <div className="overflow-x-auto">
          <div role="tablist" className="flex bg-bg-warm rounded-xl p-1">
            <button
              role="tab"
              aria-selected={storeFilter === 'all'}
              onClick={() => setStoreFilter('all')}
              className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
                storeFilter === 'all'
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              All
            </button>
            {filteredStores.map((store) => (
              <button
                key={store.id}
                role="tab"
                aria-selected={storeFilter === store.id}
                onClick={() => setStoreFilter(store.id)}
                className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
                  storeFilter === store.id
                    ? 'bg-teal text-white shadow-sm'
                    : 'text-text-secondary hover:text-navy'
                }`}
              >
                {storeDisplayNames.get(store.id) ?? store.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {filteredItems.map((item) => {
          const isSelected = !!selectedItems[item.id]
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-4 bg-surface rounded-2xl shadow-sm cursor-pointer transition-colors ${
                isSelected ? 'ring-2 ring-teal' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Custom checkbox */}
                <div
                  data-testid="item-checkbox"
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-teal border-teal text-white'
                      : 'border-navy/20 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <span className="font-display font-bold text-navy">{item.name}</span>
                  <span className="ml-2 text-xs text-text-tertiary">{getSourceLabel(item.householdId)}</span>
                </div>
              </div>

              {/* Store dropdown + quantity (second line, when selected) */}
              {isSelected && (
                <div className="flex items-center gap-2 mt-3 pl-9" onClick={(e) => e.stopPropagation()}>
                  <select
                    id={`store-${item.id}`}
                    aria-label="Store"
                    value={selectedItems[item.id].storeId ?? ''}
                    onChange={(e) => updateStore(item.id, e.target.value || null)}
                    className="flex-1 min-w-0 px-3 py-2 min-h-[38px] border border-navy/10 rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                  >
                    <option value="">Any Store</option>
                    {(stores ?? []).map((store) => (
                      <option key={store.id} value={store.id}>
                        {storeDisplayNames.get(store.id) ?? store.name}
                      </option>
                    ))}
                  </select>
                  <input
                    id={`qty-${item.id}`}
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    value={selectedItems[item.id].quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                    className="w-14 px-2 py-2 text-center border border-navy/10 rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <EmptyState
            icon={Search}
            title="No items found"
            subtitle="Try a different search term"
          />
        )}
      </div>

      {/* Sticky "Add Items" button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-5">
          <button
            onClick={handleAddItems}
            disabled={isAdding}
            className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors shadow-lg"
          >
            {isAdding ? <Spinner /> : `Add Items (${selectedCount} ${selectedCount === 1 ? 'item' : 'items'})`}
          </button>
        </div>
      )}
    </div>
  )
}
