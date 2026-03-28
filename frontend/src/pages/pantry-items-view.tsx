// ABOUTME: Pantry items view with filter support for all, personal, household, and merged views
// ABOUTME: Groups items by household in "all" view, flat list for scoped filters, inline create and edit forms

import { useEffect, useMemo, useRef, useState } from 'react'

import { MoreVertical, Package, Pencil, Trash2 } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/create-inventory-item.mutation'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useUpdateInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/update-inventory-item.mutation'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useMergedInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useFieldValidation } from '@/hooks/use-field-validation'
import { getStoreDisplayNames } from '@/utils/get-store-display-names'
import { isRequired, maxLength } from '@/utils/validation-rules'

import { ConfirmDialog } from './components/confirm-dialog'
import { EmptyState } from './components/empty-state'
import { ScopeSelect } from './components/scope-select'
import { Spinner } from './components/spinner'

export type InventoryFilter = 'all' | 'personal' | `household:${string}` | `merged:${string}`

interface PantryItemsViewProps {
  filter: InventoryFilter
  showCreateForm: boolean
  onOpenCreateForm: () => void
  onCloseCreateForm: () => void
}

type FilterType = 'all' | 'personal' | 'household' | 'merged'

const parseFilter = (filter: InventoryFilter): { type: FilterType; id: string | null } => {
  if (filter === 'all' || filter === 'personal') {
    return { type: filter, id: null }
  }
  const [type, id] = filter.split(':')
  return { type: type as FilterType, id }
}

export const PantryItemsView = ({ filter, showCreateForm, onOpenCreateForm, onCloseCreateForm }: PantryItemsViewProps) => {
  const { type: filterType, id: filterId } = parseFilter(filter)
  const { data: households } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const createMutation = useCreateInventoryItemMutation()
  const deleteMutation = useDeleteInventoryItemMutation()
  const updateMutation = useUpdateInventoryItemMutation()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  //== Inline edit form state
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editScope, setEditScope] = useState<string>('personal')
  const [editDefaultStoreId, setEditDefaultStoreId] = useState<string | null>(null)

  //== Inline create form state
  const [itemName, setItemName] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [itemScope, setItemScope] = useState<string>('personal')
  const [itemDefaultStoreId, setItemDefaultStoreId] = useState<string | null>(null)

  const createSchema = useMemo(() => ({
    name: [isRequired('Item name'), maxLength(200)],
  }), [])

  const createValues = useMemo(() => ({ name: itemName }), [itemName])

  const { errors: createErrors, handleBlur: handleCreateBlur, handleChange: handleCreateChange, validateAll: validateCreateAll, isValid: isCreateValid } = useFieldValidation(createSchema, createValues)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateCreateAll()) {
      return
    }

    try {
      await createMutation.mutateAsync({
        name: itemName.trim(),
        notes: itemNotes.trim() || null,
        householdId: itemScope === 'personal' ? null : itemScope,
        defaultStoreId: itemDefaultStoreId,
      })
      setItemName('')
      setItemNotes('')
      setItemScope('personal')
      setItemDefaultStoreId(null)
      onCloseCreateForm()
    } catch {
      // Error handled by mutation state
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setMenuOpenId(null)
    setEditingItemId(item.id)
    setEditName(item.name)
    setEditNotes(item.notes || '')
    setEditScope(item.householdId || 'personal')
    setEditDefaultStoreId(item.defaultStoreId)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingItemId || !editName.trim()) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingItemId,
        name: editName.trim(),
        notes: editNotes.trim() || null,
        householdId: editScope === 'personal' ? null : editScope,
        ownerUserId: editScope === 'personal' ? items?.find((i) => i.id === editingItemId)?.ownerUserId ?? null : null,
        defaultStoreId: editDefaultStoreId,
      })
      setEditingItemId(null)
    } catch {
      // Error handled by mutation state
    }
  }

  const storeDisplayNames = useMemo(
    () => getStoreDisplayNames(stores ?? [], households ?? []),
    [stores, households]
  )

  //== Filter stores by the selected scope (for create form)
  const filteredStores = useMemo(() => {
    if (!stores) return []
    if (itemScope === 'personal') {
      return stores.filter((s) => s.userId !== null)
    }
    return stores.filter((s) => s.householdId === itemScope)
  }, [stores, itemScope])

  //== Filter stores by the selected scope (for edit form)
  const editFilteredStores = useMemo(() => {
    if (!stores) return []
    if (editScope === 'personal') {
      return stores.filter((s) => s.userId !== null)
    }
    return stores.filter((s) => s.householdId === editScope)
  }, [stores, editScope])

  useEffect(() => {
    if (!menuOpenId) return
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
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

  const sortedItems = useMemo(
    () => [...(items || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  )

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
    <form onSubmit={handleCreate} className="mb-4 p-5 bg-surface rounded-2xl shadow-sm">
      <div className="mb-3">
        <label htmlFor="itemName" className="block text-sm font-semibold text-navy-soft mb-1">
          Item Name
        </label>
        <input
          id="itemName"
          type="text"
          autoFocus
          value={itemName}
          onChange={(e) => { setItemName(e.target.value); handleCreateChange('name', e.target.value) }}
          onBlur={() => handleCreateBlur('name')}
          placeholder="e.g., Milk"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${createErrors.name ? 'border-coral border-2' : 'border-navy/10'}`}
          disabled={createMutation.isPending}
        />
        {createErrors.name && <p className="mt-1 text-sm text-coral">{createErrors.name}</p>}
      </div>

      <div className="mb-3">
        <label htmlFor="itemScope" className="block text-sm font-semibold text-navy-soft mb-1">
          Scope
        </label>
        <ScopeSelect
          value={itemScope}
          onChange={(val) => {
            setItemScope(val)
            setItemDefaultStoreId(null)
          }}
          personalLabel="Personal"
          households={households}
          householdDescription="Household"
          disabled={createMutation.isPending}
          aria-label="Scope"
        />
      </div>

      <div className="mb-3">
        <label htmlFor="itemNotes" className="block text-sm font-semibold text-navy-soft mb-1">
          Notes (optional)
        </label>
        <input
          id="itemNotes"
          type="text"
          value={itemNotes}
          onChange={(e) => setItemNotes(e.target.value)}
          placeholder="Additional details"
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={createMutation.isPending}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="itemDefaultStore" className="block text-sm font-semibold text-navy-soft mb-1">
          Default Store (optional)
        </label>
        <select
          id="itemDefaultStore"
          value={itemDefaultStoreId || ''}
          onChange={(e) => setItemDefaultStoreId(e.target.value || null)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={createMutation.isPending}
        >
          <option value="">None</option>
          {filteredStores.map((store) => (
            <option key={store.id} value={store.id}>{storeDisplayNames.get(store.id) ?? store.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCloseCreateForm}
          className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || !isCreateValid}
          className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
        >
          {createMutation.isPending ? <Spinner /> : 'Create'}
        </button>
      </div>
    </form>
  )

  if (isLoading) {
    return (
      <>
        {createForm}
        <div className="space-y-2 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-4 bg-surface rounded-xl shadow-sm space-y-2">
              <div className="h-3 w-1/2 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2.5 w-1/3 bg-navy/8 animate-pulse rounded-lg" />
            </div>
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
    <form onSubmit={handleEditSubmit} className="p-5 bg-surface rounded-2xl shadow-sm mt-2">
      <div className="mb-3">
        <label htmlFor={`editName-${item.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
          Item Name
        </label>
        <input
          id={`editName-${item.id}`}
          type="text"
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="e.g., Milk"
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="mb-3">
        <label htmlFor={`editScope-${item.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
          Scope
        </label>
        <ScopeSelect
          value={editScope}
          onChange={(val) => {
            setEditScope(val)
            setEditDefaultStoreId(null)
          }}
          personalLabel="Personal"
          households={households}
          householdDescription="Household"
          disabled={updateMutation.isPending}
          aria-label="Scope"
        />
      </div>

      <div className="mb-3">
        <label htmlFor={`editNotes-${item.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
          Notes (optional)
        </label>
        <input
          id={`editNotes-${item.id}`}
          type="text"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Additional details"
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="mb-4">
        <label htmlFor={`editDefaultStore-${item.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
          Default Store (optional)
        </label>
        <select
          id={`editDefaultStore-${item.id}`}
          value={editDefaultStoreId || ''}
          onChange={(e) => setEditDefaultStoreId(e.target.value || null)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={updateMutation.isPending}
        >
          <option value="">None</option>
          {editFilteredStores.map((store) => (
            <option key={store.id} value={store.id}>{storeDisplayNames.get(store.id) ?? store.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setEditingItemId(null)}
          className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateMutation.isPending || !editName.trim()}
          className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
        >
          {updateMutation.isPending ? <Spinner /> : 'Save'}
        </button>
      </div>
    </form>
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
        <div className="relative" ref={menuOpenId === item.id ? menuRef : undefined}>
          <button
            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
            aria-label="Item actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-text-tertiary" />
          </button>
          {menuOpenId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
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
            </div>
          )}
        </div>
      </div>
      {editingItemId === item.id && renderEditForm(item)}
    </div>
  )

  //== For "all" filter, group by household sections
  if (filterType === 'all') {
    const householdItemsMap = new Map<string, InventoryItem[]>()
    for (const household of households || []) {
      householdItemsMap.set(
        household.id,
        sortedItems.filter((item) => item.householdId === household.id)
      )
    }
    const personalItems = sortedItems.filter((item) => item.ownerUserId !== null)

    return (
      <div className="animate-fade-in">
        {createForm}
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
