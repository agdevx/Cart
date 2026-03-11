// ABOUTME: Store management view with list, create, edit, and delete functionality
// ABOUTME: Groups stores by household with a personal stores section, inline editing and delete confirmation

import { useEffect, useMemo, useRef, useState } from 'react'

import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateStoreMutation } from '@/apis/agdevx-cart-api/store/create-store.mutation'
import { useDeleteStoreMutation } from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import { useUpdateStoreMutation } from '@/apis/agdevx-cart-api/store/update-store.mutation'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'

import { ConfirmDialog } from './components/confirm-dialog'
import { ScopeSelect } from './components/scope-select'

export const PantryStoresView = () => {
  const { data: households, isLoading: householdsLoading } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores, isLoading: storesLoading } = useStoresQuery(householdIds)
  const createMutation = useCreateStoreMutation()
  const updateMutation = useUpdateStoreMutation()
  const deleteMutation = useDeleteStoreMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeScope, setStoreScope] = useState<string>('personal')
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingScope, setEditingScope] = useState<string>('personal')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const createDuplicateError = useMemo(() => {
    if (!storeName.trim() || !stores) return null
    const scopeStores = storeScope === 'personal'
      ? stores.filter((s) => s.userId !== null)
      : stores.filter((s) => s.householdId === storeScope)
    const isDuplicate = scopeStores.some(
      (s) => s.name.toLowerCase() === storeName.trim().toLowerCase()
    )
    return isDuplicate ? 'A store with this name already exists in this scope' : null
  }, [storeName, storeScope, stores])

  const editDuplicateError = useMemo(() => {
    if (!editingName.trim() || !stores || !editingStoreId) return null
    const scopeStores = editingScope === 'personal'
      ? stores.filter((s) => s.userId !== null)
      : stores.filter((s) => s.householdId === editingScope)
    const isDuplicate = scopeStores.some(
      (s) => s.id !== editingStoreId && s.name.toLowerCase() === editingName.trim().toLowerCase()
    )
    return isDuplicate ? 'A store with this name already exists in this scope' : null
  }, [editingName, editingScope, editingStoreId, stores])

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

  if (storesLoading || householdsLoading) {
    return <p className="text-text-secondary">Loading stores...</p>
  }

  const householdStoresMap = new Map<string, typeof stores>()
  for (const household of households || []) {
    householdStoresMap.set(
      household.id,
      stores?.filter((s) => s.householdId === household.id) || []
    )
  }
  const personalStores = stores?.filter((s) => s.userId !== null) || []

  const isEmpty = !stores || stores.length === 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeName.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({
        name: storeName.trim(),
        householdId: storeScope === 'personal' ? null : storeScope,
      })
      setStoreName('')
      setStoreScope('personal')
      setShowCreateForm(false)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleStartEdit = (store: NonNullable<typeof stores>[number]) => {
    setEditingStoreId(store.id)
    setEditingName(store.name)
    setEditingScope(store.householdId ?? 'personal')
  }

  const handleSaveEdit = async () => {
    if (!editingStoreId || !editingName.trim()) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingStoreId,
        name: editingName.trim(),
        householdId: editingScope === 'personal' ? null : editingScope,
      })
      setEditingStoreId(null)
      setEditingName('')
      setEditingScope('personal')
    } catch {
      // Error handled by mutation state
    }
  }

  const handleCancelEdit = () => {
    setEditingStoreId(null)
    setEditingName('')
    setEditingScope('personal')
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) {
      return
    }

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch {
      // Error handled by mutation state
    }
  }

  const renderStoreRow = (store: NonNullable<typeof stores>[number]) => (
    <div key={store.id}>
      <div className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-center">
        <span className="font-bold text-navy">{store.name}</span>
        <div className="relative" ref={menuOpenId === store.id ? menuRef : undefined}>
          <button
            onClick={() => setMenuOpenId(menuOpenId === store.id ? null : store.id)}
            aria-label="Store actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-text-tertiary" />
          </button>
          {menuOpenId === store.id && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
              <button
                onClick={() => { setMenuOpenId(null); handleStartEdit(store) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => { setMenuOpenId(null); setDeleteConfirm({ id: store.id, name: store.name }) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable edit form below the store row */}
      {editingStoreId === store.id && (
        <div className="mt-2 p-5 bg-surface rounded-2xl shadow-sm">
          <div className="mb-3">
            <label htmlFor={`editStoreName-${store.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
              Store Name
            </label>
            <input
              id={`editStoreName-${store.id}`}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              aria-label="Edit store name"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              autoFocus
            />
            {editDuplicateError && (
              <p className="text-coral text-sm mt-1">{editDuplicateError}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor={`editStoreScope-${store.id}`} className="block text-sm font-semibold text-navy-soft mb-1">
              Scope
            </label>
            <ScopeSelect
              value={editingScope}
              onChange={setEditingScope}
              personalLabel="Personal"
              households={households}
              householdDescription="Household"
              disabled={updateMutation.isPending}
              aria-label="Edit scope"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelEdit}
              disabled={updateMutation.isPending}
              className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-display font-bold hover:bg-navy/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editingName.trim() || !!editDuplicateError}
              className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Add Store toggle button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-2"
      >
        <Plus className="w-5 h-5" />
        {showCreateForm ? 'Cancel' : 'Add Store'}
      </button>

      {/* Inline create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
          <div className="mb-3">
            <label htmlFor="storeName" className="block text-sm font-semibold text-navy-soft mb-1">
              Store Name
            </label>
            <input
              id="storeName"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g., Costco"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            />
            {createDuplicateError && (
              <p className="text-coral text-sm mt-1">{createDuplicateError}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="storeScope" className="block text-sm font-semibold text-navy-soft mb-1">
              Scope
            </label>
            <ScopeSelect
              value={storeScope}
              onChange={setStoreScope}
              personalLabel="Personal"
              households={households}
              householdDescription="Household"
              disabled={createMutation.isPending}
              aria-label="Scope"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-display font-bold hover:bg-navy/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !storeName.trim() || !!createDuplicateError}
              className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {isEmpty && (
        <p className="text-text-secondary mt-4">No stores yet. Add your first store!</p>
      )}

      {/* Household store sections */}
      {(households || []).map((household) => {
        const householdStores = householdStoresMap.get(household.id) || []
        if (householdStores.length === 0) {
          return null
        }
        return (
          <div key={household.id} className="mb-6">
            <div className="flex items-center gap-2.5 mt-4 mb-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">{household.name}</span>
              <span className="flex-1 h-px bg-navy/8" />
            </div>
            <div className="space-y-2">
              {householdStores.map(renderStoreRow)}
            </div>
          </div>
        )
      })}

      {/* Personal stores section */}
      {personalStores.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-4 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Personal Stores</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-2">
            {personalStores.map(renderStoreRow)}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Store"
          message={`Are you sure you want to delete "${deleteConfirm.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </>
  )
}
