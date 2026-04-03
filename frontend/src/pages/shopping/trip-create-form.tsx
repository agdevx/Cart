// ABOUTME: Create form for shopping trips
// ABOUTME: Owns its own field state and validation; calls back with structured form data

import { useMemo, useState } from 'react'

import { useFieldValidation } from '@/services/use-field-validation.service'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { ScopeRadio } from '@/shared/scope-radio'
import { isRequired } from '@/utils/validation-rules'

export interface TripCreateFormData {
  name: string
  tripDate: string | null
  householdId: string | null
}

interface TripCreateFormProps {
  readonly household: { id: string; name: string | null } | null | undefined
  readonly isPending: boolean
  readonly onSubmit: (data: TripCreateFormData) => void
  readonly onCancel: () => void
}

export const TripCreateForm = ({ household, isPending, onSubmit, onCancel }: TripCreateFormProps) => {
  const [tripName, setTripName] = useState('')
  const [tripDate, setTripDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [tripScope, setTripScope] = useState<string>('personal')

  const schema = useMemo(() => ({
    name: [isRequired('Trip name')],
  }), [])

  const values = useMemo(() => ({ name: tripName }), [tripName])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    onSubmit({
      name: tripName.trim(),
      tripDate: tripDate || null,
      householdId: tripScope === 'personal' ? null : tripScope,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
      <FormField label="Trip Name" htmlFor="tripName" error={errors.name}>
        <input
          id="tripName"
          type="text"
          autoFocus
          value={tripName}
          onChange={(e) => { setTripName(e.target.value); handleChange('name', e.target.value) }}
          onBlur={() => handleBlur('name')}
          placeholder="e.g., Weekly Groceries"
          className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors.name ? 'border-coral border-2' : 'border-navy/10'}`}
          disabled={isPending}
        />
      </FormField>

      <FormField label="Trip Date" htmlFor="tripDate">
        <input
          id="tripDate"
          type="date"
          value={tripDate}
          onChange={(e) => setTripDate(e.target.value)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          disabled={isPending}
        />
      </FormField>

      {household && (
        <FormField label="Scope" htmlFor="tripScope">
          <ScopeRadio
            value={tripScope}
            onChange={setTripScope}
            household={household}
            disabled={isPending}
          />
        </FormField>
      )}

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Create"
        isPending={isPending}
        disabled={!isValid}
      />
    </form>
  )
}
