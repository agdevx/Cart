// ABOUTME: TripItemRow component for displaying a trip item in planning or shopping mode
// ABOUTME: Supports kebab menu with edit/remove, inline edit form, and shopping checkbox toggle

import { Check, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { Store } from '@/apis/agdevx-cart-api/models/store'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'

interface TripItemRowProps {
  tripItem: TripItem
  itemName: string
  stores: Store[]
  storeDisplayNames: Map<string, string>
  onUpdate: (tripItemId: string, quantity: number, notes: string | null, storeId: string | null) => void
  onDelete: (tripItemId: string) => void
  isUpdating?: boolean
  showCheckbox?: boolean
  onToggleCheck?: (tripItemId: string, currentlyChecked: boolean) => void
  readOnly?: boolean
}

export const TripItemRow = ({
  tripItem,
  itemName,
  stores,
  storeDisplayNames,
  onUpdate,
  onDelete,
  isUpdating = false,
  showCheckbox = false,
  onToggleCheck,
  readOnly = false,
}: TripItemRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editQuantity, setEditQuantity] = useState(tripItem.quantity)
  const [editNotes, setEditNotes] = useState(tripItem.notes ?? '')
  const [editStoreId, setEditStoreId] = useState(tripItem.storeId ?? '')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click (mousedown)
  useEffect(() => {
    if (!menuOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen])

  const handleKebabClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen((prev) => !prev)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    setEditQuantity(tripItem.quantity)
    setEditNotes(tripItem.notes ?? '')
    setEditStoreId(tripItem.storeId ?? '')
    setEditing(true)
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onDelete(tripItem.id)
  }

  const handleSave = () => {
    onUpdate(
      tripItem.id,
      editQuantity,
      editNotes || null,
      editStoreId || null,
    )
  }

  const handleCancel = () => {
    setEditing(false)
    setEditQuantity(tripItem.quantity)
    setEditNotes(tripItem.notes ?? '')
    setEditStoreId(tripItem.storeId ?? '')
  }

  const handleRowClick = () => {
    if (!showCheckbox || editing || !onToggleCheck) return
    onToggleCheck(tripItem.id, tripItem.isChecked)
  }

  // Planning variant (no checkbox)
  if (!showCheckbox) {
    return (
      <div className="p-4 bg-surface rounded-xl shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <span className="font-bold text-navy">{itemName}</span>
            {/* Item details — hidden during edit */}
            {!editing && (
              <>
                <p className="text-sm text-text-secondary mt-1">
                  <span className="italic text-text-tertiary">Qty:</span> {tripItem.quantity}
                </p>
                {tripItem.inventoryItem?.notes && (
                  <p className="text-sm text-text-secondary mt-0.5">
                    <span className="italic text-text-tertiary">Pantry Notes:</span> {tripItem.inventoryItem.notes}
                  </p>
                )}
                {tripItem.notes && (
                  <p className="text-sm text-text-secondary mt-0.5">
                    <span className="italic text-text-tertiary">Shopping Notes:</span> {tripItem.notes}
                  </p>
                )}
              </>
            )}
          </div>
          {!readOnly && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleKebabClick}
                aria-label="Item actions"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-text-secondary" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[120px]">
                  <button
                    onClick={handleEditClick}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleRemoveClick}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {editing && (
          <EditForm
            editQuantity={editQuantity}
            editNotes={editNotes}
            editStoreId={editStoreId}
            stores={stores}
            storeDisplayNames={storeDisplayNames}
            isUpdating={isUpdating}
            onQuantityChange={setEditQuantity}
            onNotesChange={setEditNotes}
            onStoreIdChange={setEditStoreId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    )
  }

  // Shopping variant (with checkbox)
  const checkedBg = tripItem.isChecked ? 'bg-teal/8 shadow-none' : 'bg-surface'

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-4 p-4 rounded-xl shadow-sm cursor-pointer transition-all min-h-[60px] select-none active:scale-[0.98] ${checkedBg}`}
    >
      {/* Custom checkbox */}
      <div data-testid="item-checkbox" className="flex-shrink-0">
        {tripItem.isChecked ? (
          <div className="w-7 h-7 rounded-[10px] bg-teal border-2 border-teal flex items-center justify-center">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-[10px] border-[2.5px] border-navy/14 bg-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-base font-bold ${tripItem.isChecked ? 'line-through text-text-tertiary' : 'text-navy'}`}>
          {itemName}
        </span>
        {/* Item details — hidden during edit */}
        {!editing && (
          <>
            <p className="text-sm text-text-secondary mt-0.5">
              <span className="italic text-text-tertiary">Qty:</span> {tripItem.quantity}
            </p>
            {tripItem.inventoryItem?.notes && (
              <p className="text-sm text-text-secondary mt-0.5">
                <span className="italic text-text-tertiary">Pantry Notes:</span> {tripItem.inventoryItem.notes}
              </p>
            )}
            {tripItem.notes && (
              <p className="text-sm text-text-secondary mt-0.5">
                <span className="italic text-text-tertiary">Shopping Notes:</span> {tripItem.notes}
              </p>
            )}
          </>
        )}
      </div>

      {/* Kebab menu — stop touch/mousedown propagation to prevent mobile browsers
         from synthesizing a click on the parent row when tapping the kebab area */}
      {!readOnly && (
        <div
          className="relative flex-shrink-0 self-start"
          ref={menuRef}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleKebabClick}
            aria-label="Item actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-text-secondary" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[120px]">
              <button
                onClick={handleEditClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleRemoveClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline edit form in shopping mode */}
      {editing && (
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <EditForm
            editQuantity={editQuantity}
            editNotes={editNotes}
            editStoreId={editStoreId}
            stores={stores}
            storeDisplayNames={storeDisplayNames}
            isUpdating={isUpdating}
            onQuantityChange={setEditQuantity}
            onNotesChange={setEditNotes}
            onStoreIdChange={setEditStoreId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  )
}

// Extracted edit form to avoid duplication between planning and shopping variants
interface EditFormProps {
  editQuantity: number
  editNotes: string
  editStoreId: string
  stores: Store[]
  storeDisplayNames: Map<string, string>
  isUpdating: boolean
  onQuantityChange: (value: number) => void
  onNotesChange: (value: string) => void
  onStoreIdChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

const inputClassName = 'w-full px-3 py-2 border border-navy/10 rounded-lg bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

const EditForm = ({
  editQuantity,
  editNotes,
  editStoreId,
  stores,
  storeDisplayNames,
  isUpdating,
  onQuantityChange,
  onNotesChange,
  onStoreIdChange,
  onSave,
  onCancel,
}: EditFormProps) => (
  <div className="mt-3 space-y-3">
    <div>
      <label htmlFor="edit-quantity" className="block text-xs font-semibold text-text-secondary mb-1">Quantity</label>
      <input
        id="edit-quantity"
        type="number"
        min="1"
        value={editQuantity}
        onChange={(e) => onQuantityChange(Number(e.target.value))}
        disabled={isUpdating}
        className={inputClassName}
      />
    </div>
    <div>
      <label htmlFor="edit-notes" className="block text-xs font-semibold text-text-secondary mb-1">Shopping Notes</label>
      <input
        id="edit-notes"
        type="text"
        value={editNotes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add notes..."
        disabled={isUpdating}
        className={inputClassName}
      />
    </div>
    <div>
      <label htmlFor="edit-store" className="block text-xs font-semibold text-text-secondary mb-1">Store</label>
      <select
        id="edit-store"
        value={editStoreId}
        onChange={(e) => onStoreIdChange(e.target.value)}
        disabled={isUpdating}
        className={inputClassName}
      >
        <option value="">No store</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>{storeDisplayNames.get(store.id) ?? store.name}</option>
        ))}
      </select>
    </div>
    <div className="flex gap-3 pt-1">
      <button
        onClick={onCancel}
        disabled={isUpdating}
        className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={isUpdating}
        className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-teal hover:bg-teal-light disabled:opacity-50 transition-colors"
      >
        {isUpdating ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
)
