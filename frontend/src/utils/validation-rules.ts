// ABOUTME: Shared validation rule factories used by useFieldValidation hook across all forms.
// Each factory returns a validator with signature: (value: string, allValues: Record<string, string>) => string | null

type Validator = (value: string, allValues: Record<string, string>) => string | null

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isRequired(fieldLabel: string): Validator {
  return (value) => (!value.trim() ? `${fieldLabel} is required` : null)
}

export function isEmail(): Validator {
  return (value) => {
    if (!value) return null
    return EMAIL_REGEX.test(value) ? null : 'Please enter a valid email address'
  }
}

export function maxLength(max: number): Validator {
  return (value) => (value.length > max ? `Must be ${max} characters or less` : null)
}

export function minLength(min: number): Validator {
  return (value) => {
    if (!value) return null
    return value.length < min ? `Must be at least ${min} characters` : null
  }
}

export function matchesField(otherFieldName: string, label: string): Validator {
  return (value, allValues) => {
    if (!value) return null
    return value !== allValues[otherFieldName] ? `${label} don't match` : null
  }
}

export function passwordStrength(): Validator {
  return (value) => {
    if (!value) return null
    if (!/[A-Z]/.test(value)) return 'Must contain at least one uppercase letter'
    if (!/\d/.test(value)) return 'Must contain at least one number'
    return null
  }
}
