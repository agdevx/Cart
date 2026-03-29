// ABOUTME: Form validation hook — validates on blur, re-validates on change after error,
// supports validateAll for submit and setFieldError for backend errors.

import { useCallback, useMemo, useState } from 'react'

type Validator = (value: string, allValues: Record<string, string>) => string | null
type ValidationSchema = Record<string, Validator[]>

export function useFieldValidation(schema: ValidationSchema, values: Record<string, string>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (fieldName: string): string | null => {
      const validators = schema[fieldName]
      if (!validators) return null
      for (const validator of validators) {
        const error = validator(values[fieldName] ?? '', values)
        if (error) return error
      }
      return null
    },
    [schema, values]
  )

  const handleBlur = useCallback(
    (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }))
      const error = validateField(fieldName)
      setErrors((prev) => {
        if (error) return { ...prev, [fieldName]: error }
        const { [fieldName]: _, ...rest } = prev
        return rest
      })
    },
    [validateField]
  )

  const handleChange = useCallback(
    (fieldName: string, value: string) => {
      if (!errors[fieldName]) return
      // Validate using the passed value directly to avoid stale closure
      // issues with React state batching (setState + handleChange in same handler)
      const validators = schema[fieldName]
      if (!validators) return
      const currentValues = { ...values, [fieldName]: value }
      let error: string | null = null
      for (const validator of validators) {
        error = validator(value, currentValues)
        if (error) break
      }
      setErrors((prev) => {
        if (error) return { ...prev, [fieldName]: error }
        const { [fieldName]: _, ...rest } = prev
        return rest
      })
    },
    [errors, schema, values]
  )

  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    const newTouched: Record<string, boolean> = {}
    for (const fieldName of Object.keys(schema)) {
      newTouched[fieldName] = true
      const error = validateField(fieldName)
      if (error) newErrors[fieldName] = error
    }
    setTouched((prev) => ({ ...prev, ...newTouched }))
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [schema, validateField])

  const setFieldError = useCallback((fieldName: string, message: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }))
    setErrors((prev) => ({ ...prev, [fieldName]: message }))
  }, [])

  const isValid = useMemo(() => {
    for (const fieldName of Object.keys(schema)) {
      const error = validateField(fieldName)
      if (error) return false
    }
    return true
  }, [schema, validateField])

  return { errors, touched, handleBlur, handleChange, validateAll, setFieldError, isValid }
}
