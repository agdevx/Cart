// ABOUTME: Store management view with list, create, edit, and delete functionality
// ABOUTME: Groups stores by household with a personal stores section, inline editing and delete confirmation
// ABOUTME: Accepts a filter prop to show all, personal-only, or a single household's stores

import { useRef, useState } from 'react'

import { MoreVertical, Package, Pencil, Trash2 } from 'lucide-react'

import { useCreateStoreMutation } from '@/apis/agdevx-cart-api/store/create-store.mutation'
import { useDeleteStoreMutation } from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import { useUpdateStoreMutation } from '@/apis/agdevx-cart-api/store/update-store.mutation'
import { useStoresWithDisplayNamesService } from '@/services/use-stores-with-display-names.service'
import { ConfirmDialog } from '@/shared/confirm-dialog'
import { DropdownMenu } from '@/shared/dropdown-menu'
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
  const { household, stores, isLoading } = useStoresWithDisplayNamesService()
  const createMutation = useCreateStoreMutation()
  const updateMutation = useUpdateStoreMutation()
  const deleteMutation = useDeleteStoreMutation()
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const kebabRef = useRef<HTMLButtonElement>(null)

  if (isLoading) {
    return null
  }

  const householdStores = household
    ? sortStores(stores?.filter((s) => s.householdId === household.id) || [])
    : []
  const personalStores = sortStores(stores?.filter((s) => s.userId !== null) || [])

  /* Derive the filtered set based on the active scope filter */
  const isHouseholdFilter = filter !== 'all' && filter !== 'personal'
  const filteredStores =
    filter === 'personal'
      ? personalStores
      : isHouseholdFilter
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
        <div>
          <button
            ref={menuOpenId === store.id ? kebabRef : undefined}
            onClick={() => setMenuOpenId(menuOpenId === store.id ? null : store.id)}
            aria-label="Store actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-text-tertiary" />
          </button>
          {menuOpenId === store.id && (
            <DropdownMenu anchorRef={kebabRef} onClose={() => setMenuOpenId(null)}>
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
            </DropdownMenu>
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
          isPending={createMutation.isPending || createMutation.isSuccess}
          onSubmit={handleCreate}
          onCancel={onCloseCreateForm}
        />
      )}

      {/* Empty state — shown when the active scope has no stores */}
      {isFilteredEmpty && (
        <EmptyState
          icon={Package}
          title="No stores yet"
          subtitle={
            filter === 'all'
              ? 'Add your first store to organize your shopping'
              : filter === 'personal'
                ? 'Add a personal store to get started'
                : `No stores in this household yet`
          }
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
