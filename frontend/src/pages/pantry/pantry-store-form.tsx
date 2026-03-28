// ABOUTME: Create and Edit forms for pantry stores
// ABOUTME: Both forms own their own field state and validation; they call back with structured form data

import { useMemo, useState } from 'react'

import type { Store } from '@/apis/agdevx-cart-api/models/store'
import { useFieldValidation } from '@/services/use-field-validation.service'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { ScopeSelect } from '@/shared/scope-select'
import { isRequired, maxLength } from '@/utils/validation-rules'

export interface PantryStoreFormData {
  name: string
  householdId: string | null
}

interface CreatePantryStoreFormProps {
  stores: ReadonlyArray<Store>
  households: ReadonlyArray<{ id: string; name: string | null }> | undefined
  isPending: boolean
  onSubmit: (data: PantryStoreFormData) => void
  onCancel: () => void
}

interface EditPantryStoreFormProps {
  storeId: string
  initialName: string
  initialScope: string
  stores: ReadonlyArray<Store>
  households: ReadonlyArray<{ id: string; name: string | null }> | undefined
  isPending: boolean
  onSubmit: (data: PantryStoreFormData) => void
  onCancel: () => void
}

export const CreatePantryStoreForm = ({
  stores,
  households,
  isPending,
  onSubmit,
  onCancel,
}: CreatePantryStoreFormProps) => {
  const [storeName, setStoreName] = useState('')
  const [storeScope, setStoreScope] = useState<string>('personal')

  const schema = useMemo(() => ({
    name: [isRequired('Store name'), maxLength(100)],
  }), [])

  const values = useMemo(() => ({ name: storeName }), [storeName])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  const duplicateError = useMemo(() => {
    if (!storeName.trim() || !stores) return null
    const scopeStores = storeScope === 'personal'
      ? stores.filter((s) => s.userId !== null)
      : stores.filter((s) => s.householdId === storeScope)
    const isDuplicate = scopeStores.some(
      (s) => s.name.toLowerCase() === storeName.trim().toLowerCase()
    )
    return isDuplicate ? 'A store with this name already exists in this scope' : null
  }, [storeName, storeScope, stores])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    onSubmit({
      name: storeName.trim(),
      householdId: storeScope === 'personal' ? null : storeScope,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
      <FormField label="Store Name" htmlFor="storeName" error={errors.name ?? duplicateError ?? undefined}>
        <input
          id="storeName"
          type="text"
          autoFocus
          value={storeName}
          onChange={(e) => { setStoreName(e.target.value); handleChange('name', e.target.value) }}
          onBlur={() => handleBlur('name')}
          placeholder="e.g., Costco"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${(errors.name || duplicateError) ? 'border-coral border-2' : 'border-navy/10'}`}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Scope" htmlFor="storeScope">
        <ScopeSelect
          value={storeScope}
          onChange={setStoreScope}
          personalLabel="Personal"
          households={households}
          householdDescription="Household"
          disabled={isPending}
          aria-label="Scope"
        />
      </FormField>

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Create"
        isPending={isPending}
        disabled={!isValid || !!duplicateError}
      />
    </form>
  )
}

export const EditPantryStoreForm = ({
  storeId,
  initialName,
  initialScope,
  stores,
  households,
  isPending,
  onSubmit,
  onCancel,
}: EditPantryStoreFormProps) => {
  const [editingName, setEditingName] = useState(initialName)
  const [editingScope, setEditingScope] = useState<string>(initialScope)

  const schema = useMemo(() => ({
    name: [isRequired('Store name'), maxLength(100)],
  }), [])

  const values = useMemo(() => ({ name: editingName }), [editingName])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  const duplicateError = useMemo(() => {
    if (!editingName.trim() || !stores) return null
    const scopeStores = editingScope === 'personal'
      ? stores.filter((s) => s.userId !== null)
      : stores.filter((s) => s.householdId === editingScope)
    const isDuplicate = scopeStores.some(
      (s) => s.id !== storeId && s.name.toLowerCase() === editingName.trim().toLowerCase()
    )
    return isDuplicate ? 'A store with this name already exists in this scope' : null
  }, [editingName, editingScope, storeId, stores])

  const handleSubmit = () => {
    if (!validateAll()) {
      return
    }

    onSubmit({
      name: editingName.trim(),
      householdId: editingScope === 'personal' ? null : editingScope,
    })
  }

  return (
    <div className="mt-2 p-5 bg-surface rounded-2xl shadow-sm">
      <FormField label="Store Name" htmlFor={`editStoreName-${storeId}`} error={errors.name ?? duplicateError ?? undefined}>
        <input
          id={`editStoreName-${storeId}`}
          type="text"
          value={editingName}
          onChange={(e) => { setEditingName(e.target.value); handleChange('name', e.target.value) }}
          onBlur={() => handleBlur('name')}
          aria-label="Edit store name"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${(errors.name || duplicateError) ? 'border-coral border-2' : 'border-navy/10'}`}
          autoFocus
        />
      </FormField>

      <FormField label="Scope" htmlFor={`editStoreScope-${storeId}`}>
        <ScopeSelect
          value={editingScope}
          onChange={setEditingScope}
          personalLabel="Personal"
          households={households}
          householdDescription="Household"
          disabled={isPending}
          aria-label="Edit scope"
        />
      </FormField>

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Save"
        isPending={isPending}
        disabled={!isValid || !!duplicateError}
        type="button"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
