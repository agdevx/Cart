// ABOUTME: Create form for shopping trips
// ABOUTME: Owns its own field state and validation; calls back with structured form data

import { useMemo, useState } from 'react'

import { useFieldValidation } from '@/services/use-field-validation.service'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { isRequired } from '@/utils/validation-rules'

export interface TripCreateFormData {
  name: string
}

interface TripCreateFormProps {
  readonly isPending: boolean
  readonly onSubmit: (data: TripCreateFormData) => void
  readonly onCancel: () => void
}

export const TripCreateForm = ({ isPending, onSubmit, onCancel }: TripCreateFormProps) => {
  const [tripName, setTripName] = useState('')

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

    onSubmit({ name: tripName.trim() })
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

      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Create"
        isPending={isPending}
        disabled={!isValid}
      />
    </form>
  )
}
