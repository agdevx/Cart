// ABOUTME: Create and Edit forms for pantry inventory items
// ABOUTME: Both forms own their own field state and validation; they call back with structured form data

import { useMemo, useState } from 'react'

import type { Store } from '@/apis/agdevx-cart-api/models/store'
import { useFieldValidation } from '@/services/use-field-validation.service'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { ScopeRadio } from '@/shared/scope-radio'
import { isRequired, maxLength } from '@/utils/validation-rules'

export interface PantryItemFormData {
  name: string
  notes: string | null
  householdId: string | null
  defaultStoreId: string | null
}

interface CreatePantryItemFormProps {
  initialScope: string
  household: { id: string; name: string | null } | null | undefined
  /** All stores — the form filters by selected scope internally */
  allStores: ReadonlyArray<Store>
  storeDisplayNames: ReadonlyMap<string, string>
  isPending: boolean
  onSubmit: (data: PantryItemFormData) => void
  onCancel: () => void
}

interface EditPantryItemFormProps {
  itemId: string
  initialName: string
  initialNotes: string
  initialScope: string
  initialDefaultStoreId: string | null
  ownerUserId: string | null
  household: { id: string; name: string | null } | null | undefined
  /** All stores — the form filters by selected scope internally */
  allStores: ReadonlyArray<Store>
  storeDisplayNames: ReadonlyMap<string, string>
  isPending: boolean
  onSubmit: (data: PantryItemFormData & { ownerUserId: string | null }) => void
  onCancel: () => void
}

export const CreatePantryItemForm = ({
  initialScope,
  household,
  allStores,
  storeDisplayNames,
  isPending,
  onSubmit,
  onCancel,
}: CreatePantryItemFormProps) => {
  const [itemName, setItemName] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [itemScope, setItemScope] = useState<string>(initialScope)
  const [itemDefaultStoreId, setItemDefaultStoreId] = useState<string | null>(null)

  //== Filter stores by the selected scope so only relevant options are shown
  const filteredStores = useMemo(() => {
    if (itemScope === 'personal') {
      return allStores.filter((s) => s.userId !== null)
    }
    if (itemScope === '') {
      return []
    }
    return allStores.filter((s) => s.householdId === itemScope)
  }, [allStores, itemScope])

  const schema = useMemo(() => ({
    name: [isRequired('Item name'), maxLength(200)],
  }), [])

  const values = useMemo(() => ({ name: itemName }), [itemName])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    onSubmit({
      name: itemName.trim(),
      notes: itemNotes.trim() || null,
      householdId: itemScope === 'personal' ? null : itemScope,
      defaultStoreId: itemDefaultStoreId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-5 bg-surface rounded-2xl shadow-sm">
      <FormField label="Item Name" htmlFor="itemName" error={errors.name}>
        <input
          id="itemName"
          type="text"
          autoFocus
          value={itemName}
          onChange={(e) => { setItemName(e.target.value); handleChange('name', e.target.value) }}
          onBlur={() => handleBlur('name')}
          placeholder="e.g., Milk"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors.name ? 'border-coral border-2' : 'border-navy/10'}`}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Scope" htmlFor="itemScope">
        <ScopeRadio
          value={itemScope}
          onChange={(val) => {
            setItemScope(val)
            setItemDefaultStoreId(null)
          }}
          household={household}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Notes (optional)" htmlFor="itemNotes">
        <input
          id="itemNotes"
          type="text"
          value={itemNotes}
          onChange={(e) => setItemNotes(e.target.value)}
          placeholder="Additional details"
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={isPending}
        />
      </FormField>

      <FormField label="Default Store (optional)" htmlFor="itemDefaultStore">
        <select
          id="itemDefaultStore"
          value={itemDefaultStoreId || ''}
          onChange={(e) => setItemDefaultStoreId(e.target.value || null)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={isPending}
        >
          <option value="">None</option>
          {filteredStores.map((store) => (
            <option key={store.id} value={store.id}>{storeDisplayNames.get(store.id) ?? store.name}</option>
          ))}
        </select>
      </FormField>

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Create"
        isPending={isPending}
        disabled={!isValid || itemScope === ''}
      />
    </form>
  )
}

export const EditPantryItemForm = ({
  itemId,
  initialName,
  initialNotes,
  initialScope,
  initialDefaultStoreId,
  ownerUserId,
  household,
  allStores,
  storeDisplayNames,
  isPending,
  onSubmit,
  onCancel,
}: EditPantryItemFormProps) => {
  const [editName, setEditName] = useState(initialName)
  const [editNotes, setEditNotes] = useState(initialNotes)
  const [editScope, setEditScope] = useState<string>(initialScope)
  const [editDefaultStoreId, setEditDefaultStoreId] = useState<string | null>(initialDefaultStoreId)

  const schema = useMemo(() => ({
    name: [isRequired('Item name'), maxLength(200)],
  }), [])

  const values = useMemo(() => ({ name: editName }), [editName])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  //== Filter stores by the selected scope so only relevant options are shown
  const filteredStores = useMemo(() => {
    if (editScope === '' || editScope === 'personal') {
      return allStores.filter((s) => s.userId !== null)
    }
    return allStores.filter((s) => s.householdId === editScope)
  }, [allStores, editScope])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    onSubmit({
      name: editName.trim(),
      notes: editNotes.trim() || null,
      householdId: editScope === 'personal' ? null : editScope,
      ownerUserId: editScope === 'personal' ? ownerUserId : null,
      defaultStoreId: editDefaultStoreId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-surface rounded-2xl shadow-sm mt-2">
      <FormField label="Item Name" htmlFor={`editName-${itemId}`} error={errors.name}>
        <input
          id={`editName-${itemId}`}
          type="text"
          autoFocus
          value={editName}
          onChange={(e) => { setEditName(e.target.value); handleChange('name', e.target.value) }}
          onBlur={() => handleBlur('name')}
          placeholder="e.g., Milk"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors.name ? 'border-coral border-2' : 'border-navy/10'}`}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Scope" htmlFor={`editScope-${itemId}`}>
        <ScopeRadio
          value={editScope}
          onChange={(val) => {
            setEditScope(val)
            setEditDefaultStoreId(null)
          }}
          household={household}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Notes (optional)" htmlFor={`editNotes-${itemId}`}>
        <input
          id={`editNotes-${itemId}`}
          type="text"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Additional details"
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={isPending}
        />
      </FormField>

      <FormField label="Default Store (optional)" htmlFor={`editDefaultStore-${itemId}`}>
        <select
          id={`editDefaultStore-${itemId}`}
          value={editDefaultStoreId || ''}
          onChange={(e) => setEditDefaultStoreId(e.target.value || null)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={isPending}
        >
          <option value="">None</option>
          {filteredStores.map((store) => (
            <option key={store.id} value={store.id}>{storeDisplayNames.get(store.id) ?? store.name}</option>
          ))}
        </select>
      </FormField>

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Save"
        isPending={isPending}
        disabled={!isValid}
      />
    </form>
  )
}
