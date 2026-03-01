// ABOUTME: Inventory items view with filter support for all, personal, household, and merged views
// ABOUTME: Groups items by household in "all" view, flat list for scoped filters

import { useMemo } from 'react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useMergedInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'

interface InventoryItemsViewProps {
  filter: string
}

const parseFilter = (filter: string): { type: string; id: string | null } => {
  if (filter === 'all' || filter === 'personal') {
    return { type: filter, id: null }
  }
  const [type, id] = filter.split(':')
  return { type, id }
}

export const InventoryItemsView = ({ filter }: InventoryItemsViewProps) => {
  const { type: filterType, id: filterId } = parseFilter(filter)
  const { data: households } = useHouseholdsQuery()
  const deleteMutation = useDeleteInventoryItemMutation()

  const allQuery = useInventoryQuery()
  const personalQuery = usePersonalInventoryQuery()
  const householdQuery = useHouseholdInventoryQuery(filterType === 'household' ? filterId : null)
  const mergedQuery = useMergedInventoryQuery(filterType === 'merged' ? filterId : null)

  const activeQuery = useMemo(() => {
    switch (filterType) {
      case 'personal':
        return personalQuery
      case 'household':
        return householdQuery
      case 'merged':
        return mergedQuery
      default:
        return allQuery
    }
  }, [filterType, allQuery, personalQuery, householdQuery, mergedQuery])

  const items = activeQuery.data
  const isLoading = activeQuery.isLoading

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) {
    return <p className="text-text-secondary">Loading inventory...</p>
  }

  if (!items || items.length === 0) {
    return <p className="text-text-secondary mt-4">No inventory items yet. Add your first item!</p>
  }

  const renderItem = (item: InventoryItem) => (
    <div
      key={item.id}
      className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-start"
    >
      <div>
        <h3 className="font-bold text-navy">{item.name}</h3>
        {item.notes && (
          <p className="text-sm text-text-secondary mt-0.5">{item.notes}</p>
        )}
      </div>
      <button
        onClick={() => handleDelete(item.id)}
        disabled={deleteMutation.isPending}
        className="text-coral hover:text-coral/80 text-sm font-semibold"
      >
        Delete
      </button>
    </div>
  )

  //== For "all" filter, group by household sections
  if (filterType === 'all') {
    const householdItemsMap = new Map<string, InventoryItem[]>()
    for (const household of households || []) {
      householdItemsMap.set(
        household.id,
        items.filter((item) => item.householdId === household.id)
      )
    }
    const personalItems = items.filter((item) => item.ownerUserId !== null)

    return (
      <>
        {(households || []).map((household) => {
          const householdItems = householdItemsMap.get(household.id) || []
          if (householdItems.length === 0) return null
          return (
            <div key={household.id} className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">{household.name}</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {householdItems.map(renderItem)}
              </div>
            </div>
          )
        })}

        {personalItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Personal Items</span>
              <span className="flex-1 h-px bg-navy/8" />
            </div>
            <div className="space-y-2">
              {personalItems.map(renderItem)}
            </div>
          </div>
        )}
      </>
    )
  }

  //== For scoped filters, render a flat list
  return (
    <div className="space-y-2">
      {items.map(renderItem)}
    </div>
  )
}
