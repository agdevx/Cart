// ABOUTME: Pantry items view with filter support for all, personal, household, and merged views
// ABOUTME: Groups items by household in "all" view, flat list for scoped filters

import { useEffect, useRef, useState } from 'react'

import { MoreVertical, Trash2 } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useMergedInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'

import { ConfirmDialog } from './components/confirm-dialog'

export type InventoryFilter = 'all' | 'personal' | `household:${string}` | `merged:${string}`

interface PantryItemsViewProps {
  filter: InventoryFilter
}

type FilterType = 'all' | 'personal' | 'household' | 'merged'

const parseFilter = (filter: InventoryFilter): { type: FilterType; id: string | null } => {
  if (filter === 'all' || filter === 'personal') {
    return { type: filter, id: null }
  }
  const [type, id] = filter.split(':')
  return { type: type as FilterType, id }
}

export const PantryItemsView = ({ filter }: PantryItemsViewProps) => {
  const { type: filterType, id: filterId } = parseFilter(filter)
  const { data: households } = useHouseholdsQuery()
  const deleteMutation = useDeleteInventoryItemMutation()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!menuOpenId) return
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpenId])

  //== All four hooks are called unconditionally (React rules of hooks). Inactive scoped hooks
  //== receive null IDs which disables them via `enabled`. The all/personal hooks stay in cache
  //== when not active — TanStack Query handles this efficiently with no unnecessary refetches.
  const allQuery = useInventoryQuery()
  const personalQuery = usePersonalInventoryQuery()
  const householdQuery = useHouseholdInventoryQuery(filterType === 'household' ? filterId : null)
  const mergedQuery = useMergedInventoryQuery(filterType === 'merged' ? filterId : null)

  const activeQuery = (() => {
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
  })()

  const items = activeQuery.data
  const isLoading = activeQuery.isLoading

  const handleDelete = (id: string, name: string) => {
    setMenuOpenId(null)
    setDeleteConfirm({ id, name })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteMutation.mutateAsync(deleteConfirm.id)
    setDeleteConfirm(null)
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
      <div className="relative" ref={menuOpenId === item.id ? menuRef : undefined}>
        <button
          onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
          aria-label="Item actions"
          className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-text-tertiary" />
        </button>
        {menuOpenId === item.id && (
          <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
            <button
              onClick={() => handleDelete(item.id, item.name)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
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

        {deleteConfirm && (
          <ConfirmDialog
            title="Delete Item"
            message={`Delete "${deleteConfirm.name}"? This can't be undone.`}
            confirmLabel="Delete"
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteConfirm(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </>
    )
  }

  //== For scoped filters, render a flat list
  return (
    <>
      <div className="space-y-2">
        {items.map(renderItem)}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Item"
          message={`Delete "${deleteConfirm.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </>
  )
}
