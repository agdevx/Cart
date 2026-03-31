// ABOUTME: Store management view with list, create, edit, and delete functionality
// ABOUTME: Groups stores by household with a personal stores section, inline editing and delete confirmation
// ABOUTME: Accepts a filter prop to show all, personal-only, or a single household's stores

import { useEffect, useRef, useState } from 'react'

import { MoreVertical, Package, Pencil, Trash2 } from 'lucide-react'

import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useCreateStoreMutation } from '@/apis/agdevx-cart-api/store/create-store.mutation'
import { useDeleteStoreMutation } from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import { useUpdateStoreMutation } from '@/apis/agdevx-cart-api/store/update-store.mutation'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { ConfirmDialog } from '@/shared/confirm-dialog'
import { EmptyState } from '@/shared/empty-state'
import { SectionHeader } from '@/shared/section-header'
import { sortStores } from '@/utils/sort-stores'

import type { InventoryFilter } from './pantry-items-view'
import type { PantryStoreFormData } from './pantry-store-form'
import { CreatePantryStoreForm, EditPantryStoreForm } from './pantry-store-form'

interface PantryStoresViewProps {
  readonly filter: InventoryFilter
  /* Controlled visibility for the create form — driven by the parent FAB */
  readonly showCreateForm: boolean
  readonly onOpenCreateForm: () => void
  readonly onCloseCreateForm: () => void
}

export const PantryStoresView = ({ filter, showCreateForm, onOpenCreateForm, onCloseCreateForm }: PantryStoresViewProps) => {
  const { data: household, isLoading: householdLoading } = useHouseholdQuery()
  const { data: stores, isLoading: storesLoading } = useStoresQuery(household?.id ?? null)
  const createMutation = useCreateStoreMutation()
  const updateMutation = useUpdateStoreMutation()
  const deleteMutation = useDeleteStoreMutation()
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  if (storesLoading || householdLoading) {
    return (
      <div className="space-y-2 mt-2">
        {[0, 1].map((i) => (
          <div key={i} className="p-4 bg-surface rounded-xl shadow-sm space-y-2">
            <div className="h-3 w-[45%] bg-navy/8 animate-pulse rounded-lg" />
            <div className="h-2.5 w-1/5 bg-navy/8 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  const householdStores = household
    ? sortStores(stores?.filter((s) => s.householdId === household.id) || [])
    : []
  const personalStores = sortStores(stores?.filter((s) => s.userId !== null) || [])

  /* Derive the filtered set based on the active scope filter */
  const filterHouseholdId = filter.startsWith('household:') ? filter.split(':')[1] : null
  const filteredStores =
    filter === 'personal'
      ? personalStores
      : filterHouseholdId
        ? householdStores
        : null // null means "all" — use grouped view

  /* True when the currently visible scope has no stores (not just the global list) */
  const isFilteredEmpty = filteredStores !== null ? filteredStores.length === 0 : !stores || stores.length === 0

  const handleCreate = async (data: PantryStoreFormData) => {
    try {
      await createMutation.mutateAsync({
        name: data.name,
        householdId: data.householdId,
      })
      onCloseCreateForm()
    } catch {
      // Error handled by mutation state
    }
  }

  const handleStartEdit = (store: NonNullable<typeof stores>[number]) => {
    setEditingStoreId(store.id)
  }

  const handleSaveEdit = async (data: PantryStoreFormData) => {
    if (!editingStoreId) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingStoreId,
        name: data.name,
        householdId: data.householdId,
      })
      setEditingStoreId(null)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleCancelEdit = () => {
    setEditingStoreId(null)
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
        <EditPantryStoreForm
          storeId={store.id}
          initialName={store.name}
          initialScope={store.householdId ?? 'personal'}
          stores={stores ?? []}
          household={household}
          isPending={updateMutation.isPending}
          onSubmit={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Inline create form — visibility controlled by parent FAB */}
      {showCreateForm && (
        <CreatePantryStoreForm
          stores={stores ?? []}
          household={household}
          isPending={createMutation.isPending}
          onSubmit={handleCreate}
          onCancel={onCloseCreateForm}
        />
      )}

      {/* Empty state — shown when the active scope has no stores */}
      {isFilteredEmpty && (
        <EmptyState
          icon={Package}
          title="No stores yet"
          subtitle="Add your first store to organize your shopping"
          actionLabel="Add Store"
          onAction={onOpenCreateForm}
        />
      )}

      {/* Filtered view — flat list with no section headers when a specific scope is selected */}
      {filteredStores !== null && filteredStores.length > 0 && (
        <div className="space-y-2">
          {filteredStores.map(renderStoreRow)}
        </div>
      )}

      {/* Grouped view — Personal first, then households alphabetically */}
      {filteredStores === null && (
        <>
          {/* Personal stores section — always first */}
          {personalStores.length > 0 && (
            <div className="mb-6">
              <div className="mt-4">
                <SectionHeader title={`Personal Stores (${personalStores.length})`} />
              </div>
              <div className="space-y-2">
                {personalStores.map(renderStoreRow)}
              </div>
            </div>
          )}

          {/* Household store section */}
          {householdStores.length > 0 && (
            <div className="mb-6">
              <div className="mt-4">
                <SectionHeader title={`${household?.name ?? ''} (${householdStores.length})`} />
              </div>
              <div className="space-y-2">
                {householdStores.map(renderStoreRow)}
              </div>
            </div>
          )}
        </>
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
    </div>
  )
}
