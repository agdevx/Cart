// ABOUTME: Pantry items view with filter support for all, personal, household, and merged views
// ABOUTME: Groups items by household in "all" view, flat list for scoped filters, inline create and edit forms

import { useMemo, useRef, useState } from 'react'

import { MoreVertical, Package, Pencil, Trash2 } from 'lucide-react'

import { useCreateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useUpdateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/update-inventory-item.mutation'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useMergedInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { useStoresWithDisplayNamesService } from '@/services/use-stores-with-display-names.service'
import { ConfirmDialog } from '@/shared/confirm-dialog'
import { DropdownMenu } from '@/shared/dropdown-menu'
import { EmptyState } from '@/shared/empty-state'
import { SectionHeader } from '@/shared/section-header'
import { SkeletonCard } from '@/shared/skeleton-card'
import { sortItems } from '@/utils/sort-items'

import type { PantryItemFormData } from './pantry-item-form'
import { CreatePantryItemForm, EditPantryItemForm } from './pantry-item-form'

export type InventoryFilter = 'all' | 'personal' | `household:${string}` | `merged:${string}`

interface PantryItemsViewProps {
  readonly filter: InventoryFilter
  readonly showCreateForm: boolean
  readonly onOpenCreateForm: () => void
  readonly onCloseCreateForm: () => void
}

type FilterType = 'all' | 'personal' | 'household' | 'merged'

const parseFilter = (filter: InventoryFilter): { type: FilterType; id: string | null } => {
  if (filter === 'all' || filter === 'personal') {
    return { type: filter, id: null }
  }
  const [type, id] = filter.split(':')
  return { type: type as FilterType, id }
}

//== Derive the default scope for the create form based on the active filter.
//== Empty string means "All" filter — the user must choose a scope before submitting.
const getCreateInitialScope = (filter: InventoryFilter): string => {
  if (filter === 'personal') {
    return 'personal'
  }
  if (filter.startsWith('household:')) {
    return filter.split(':')[1]
  }
  return ''
}

export const PantryItemsView = ({ filter, showCreateForm, onOpenCreateForm, onCloseCreateForm }: PantryItemsViewProps) => {
  const { type: filterType, id: filterId } = parseFilter(filter)
  const { household, stores, storeDisplayNames } = useStoresWithDisplayNamesService()
  const createMutation = useCreateInventoryItemMutation()
  const deleteMutation = useDeleteInventoryItemMutation()
  const updateMutation = useUpdateInventoryItemMutation()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const kebabRef = useRef<HTMLButtonElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const handleCreate = async (data: PantryItemFormData) => {
    try {
      await createMutation.mutateAsync(data)
      onCloseCreateForm()
    } catch {
      // Error handled by mutation state
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setMenuOpenId(null)
    setEditingItemId(item.id)
  }

  const handleEditSubmit = async (data: PantryItemFormData & { ownerUserId: string | null }) => {
    if (!editingItemId) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingItemId,
        ...data,
      })
      setEditingItemId(null)
    } catch {
      // Error handled by mutation state
    }
  }

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

  const sortedItems = useMemo(() => sortItems(items || []), [items])

  const handleDelete = (id: string, name: string) => {
    setMenuOpenId(null)
    setDeleteConfirm({ id, name })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteMutation.mutateAsync(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const createForm = showCreateForm && (
    <CreatePantryItemForm
      initialScope={getCreateInitialScope(filter)}
      household={household}
      allStores={stores ?? []}
      storeDisplayNames={storeDisplayNames}
      isPending={createMutation.isPending}
      onSubmit={handleCreate}
      onCancel={onCloseCreateForm}
    />
  )

  if (isLoading) {
    return (
      <>
        {createForm}
        <div className="space-y-2 mt-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} rows={[{ width: '50%' }, { width: '33%' }]} />
          ))}
        </div>
      </>
    )
  }

  if (!items || items.length === 0) {
    return (
      <>
        {createForm}
        <EmptyState
          icon={Package}
          title="No inventory items yet"
          subtitle="Add your first item to start building your pantry"
          actionLabel="Add Item"
          onAction={onOpenCreateForm}
        />
      </>
    )
  }

  const renderEditForm = (item: InventoryItem) => (
    <EditPantryItemForm
      itemId={item.id}
      initialName={item.name}
      initialNotes={item.notes || ''}
      initialScope={item.householdId || 'personal'}
      initialDefaultStoreId={item.defaultStoreId}
      ownerUserId={item.ownerUserId}
      household={household}
      allStores={stores ?? []}
      storeDisplayNames={storeDisplayNames}
      isPending={updateMutation.isPending}
      onSubmit={handleEditSubmit}
      onCancel={() => setEditingItemId(null)}
    />
  )

  const renderItem = (item: InventoryItem) => (
    <div key={item.id}>
      <div className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-start">
        <div>
          <h3 className="font-bold text-navy">{item.name}</h3>
          {item.notes && (
            <p className="text-sm text-text-secondary mt-0.5">{item.notes}</p>
          )}
        </div>
        <div>
          <button
            ref={menuOpenId === item.id ? kebabRef : undefined}
            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
            aria-label="Item actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-text-tertiary" />
          </button>
          {menuOpenId === item.id && (
            <DropdownMenu anchorRef={kebabRef} onClose={() => setMenuOpenId(null)}>
              <button
                onClick={() => handleEdit(item)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text hover:bg-bg-warm transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id, item.name)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </DropdownMenu>
          )}
        </div>
      </div>
      {editingItemId === item.id && renderEditForm(item)}
    </div>
  )

  //== For "all" filter, group into personal and household sections
  if (filterType === 'all') {
    const personalItems = sortedItems.filter((item) => item.ownerUserId !== null)
    const householdItems = household
      ? sortedItems.filter((item) => item.householdId === household.id)
      : []

    return (
      <div className="animate-fade-in">
        {createForm}

        {personalItems.length > 0 && (
          <div className="mb-6">
            <SectionHeader title={`Personal Items (${personalItems.length})`} />
            <div className="space-y-2">
              {personalItems.map(renderItem)}
            </div>
          </div>
        )}

        {householdItems.length > 0 && (
          <div className="mb-6">
            <SectionHeader title={`${household?.name ?? ''} (${householdItems.length})`} />
            <div className="space-y-2">
              {householdItems.map(renderItem)}
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
      </div>
    )
  }

  //== For scoped filters, render a flat list
  return (
    <div className="animate-fade-in">
      {createForm}
      <div className="space-y-2">
        {sortedItems.map(renderItem)}
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
    </div>
  )
}
