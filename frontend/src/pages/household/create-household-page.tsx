// ABOUTME: Create household page
// ABOUTME: Form for creating a new household

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateHouseholdMutation } from '@/apis/agdevx-cart-api/household/create-household.mutation'
import { ROUTES } from '@/routes'
import { useFieldValidation } from '@/services/use-field-validation.service'
import { FormField } from '@/shared/form-field'
import { Spinner } from '@/shared/spinner'
import { getErrorMessage } from '@/utilities/error-messages'
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOUSEHOLD)}
            className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !isValid}
            className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? <Spinner /> : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
