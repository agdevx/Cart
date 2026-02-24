// ABOUTME: Store management view with list, create, edit, and delete functionality
// ABOUTME: Groups stores by household with a personal stores section, inline editing and delete confirmation

import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateStoreMutation } from '@/apis/agdevx-cart-api/store/create-store.mutation'
import { useDeleteStoreMutation } from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import { useUpdateStoreMutation } from '@/apis/agdevx-cart-api/store/update-store.mutation'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'

export const InventoryStoresView = () => {
  const { data: households, isLoading: householdsLoading } = useHouseholdsQuery()
  const householdIds = households?.map((h) => h.id) || []
  const { data: stores, isLoading: storesLoading } = useStoresQuery(householdIds)
  const createMutation = useCreateStoreMutation()
  const updateMutation = useUpdateStoreMutation()
  const deleteMutation = useDeleteStoreMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeScope, setStoreScope] = useState<string>('personal')
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

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

  const handleStartEdit = (storeId: string, currentName: string) => {
    setEditingStoreId(storeId)
    setEditingName(currentName)
  }

  const handleSaveEdit = async () => {
    if (!editingStoreId || !editingName.trim()) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingStoreId,
        name: editingName.trim(),
      })
      setEditingStoreId(null)
      setEditingName('')
    } catch {
      // Error handled by mutation state
    }
  }

  const handleCancelEdit = () => {
    setEditingStoreId(null)
    setEditingName('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
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
    <div key={store.id} className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-center">
      {editingStoreId === store.id ? (
        <div className="flex items-center gap-2 flex-1 mr-2">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="flex-1 px-3 py-1.5 border border-navy/10 rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            autoFocus
          />
          <button
            onClick={handleSaveEdit}
            aria-label="Save store name"
            className="text-teal hover:text-teal-light transition-colors"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          <span className="font-bold text-navy">{store.name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartEdit(store.id, store.name)}
              aria-label="Edit store name"
              className="text-text-tertiary hover:text-teal transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteConfirm({ id: store.id, name: store.name })}
              aria-label="Delete store"
              className="text-text-tertiary hover:text-coral transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
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
          </div>

          <div className="mb-4">
            <label htmlFor="storeScope" className="block text-sm font-semibold text-navy-soft mb-1">
              Scope
            </label>
            <select
              id="storeScope"
              value={storeScope}
              onChange={(e) => setStoreScope(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            >
              <option value="personal">Personal</option>
              {households?.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !storeName.trim()}
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="font-display text-lg font-bold text-navy mb-2">Delete Store</h3>
            <p className="text-text-secondary mb-5">Are you sure you want to delete &quot;{deleteConfirm.name}&quot;?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
