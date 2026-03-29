// ABOUTME: Create household page
// ABOUTME: Form for creating a new household

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateHouseholdMutation } from '@/apis/agdevx-cart-api/household/create-household.mutation'
import { ROUTES } from '@/routes'
import { useFieldValidation } from '@/services/use-field-validation.service'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { getErrorMessage } from '@/utils/error-messages'
import { isRequired, maxLength } from '@/utils/validation-rules'

export const CreateHouseholdPage = () => {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const createMutation = useCreateHouseholdMutation()

  const schema = useMemo(() => ({
    name: [isRequired('Household name'), maxLength(100)],
  }), [])

  const values = useMemo(() => ({ name }), [name])

  const { errors, handleBlur, handleChange, validateAll, isValid } = useFieldValidation(schema, values)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    try {
      await createMutation.mutateAsync({ name: name.trim() })
      navigate(ROUTES.HOUSEHOLD)
    } catch {
      // Error displayed inline via getErrorMessage(mutation.error)
    }
  }

  return (
    <div className="px-5 pt-7 pb-8">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight mb-6">Create Household</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Household Name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); handleChange('name', e.target.value) }}
            onBlur={() => handleBlur('name')}
            placeholder="Enter household name"
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors.name ? 'border-coral border-2' : 'border-navy/10'}`}
            disabled={createMutation.isPending}
          />
        </FormField>

        {createMutation.isError && (
          <div className="p-3 bg-coral/10 text-coral rounded-xl font-semibold text-sm">
            {getErrorMessage(createMutation.error)}
          </div>
        )}

        <div className="pt-2">
          <ActionCancelFormButtons
            onCancel={() => navigate(ROUTES.HOUSEHOLD)}
            submitLabel="Create"
            isPending={createMutation.isPending}
            disabled={!isValid}
          />
        </div>
      </form>
    </div>
  )
}
