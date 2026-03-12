# Frontend Quality Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add field-level form validation, a top-level React error boundary, and targeted accessibility fixes.

**Architecture:** Custom `useFieldValidation` hook with shared validation rules replaces per-page inline validation. `react-error-boundary` wraps routes inside BrowserRouter. Skip-to-content link and ConfirmDialog ARIA attributes for accessibility.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, react-error-boundary, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-11-frontend-quality-design.md`

---

## Chunk 1: Validation Foundation

### Task 1: Shared Validation Rules

**Files:**
- Create: `frontend/src/utils/validation-rules.ts`
- Create: `frontend/src/utils/tests/validation-rules.test.ts`

- [ ] **Step 1: Write failing tests for all validation rules**

```typescript
// frontend/src/utils/tests/validation-rules.test.ts
// ABOUTME: Tests for shared validation rule functions used across all forms

import { describe, it, expect } from 'vitest'
import {
  isRequired,
  isEmail,
  maxLength,
  minLength,
  matchesField,
  passwordStrength,
} from '../validation-rules'

const allValues = { password: 'Test1234', confirmPassword: 'Test1234' }

describe('isRequired', () => {
  it('returns error when empty', () => {
    expect(isRequired('Name')('', allValues)).toBe('Name is required')
  })

  it('returns error when whitespace only', () => {
    expect(isRequired('Name')('   ', allValues)).toBe('Name is required')
  })

  it('returns null when valid', () => {
    expect(isRequired('Name')('August', allValues)).toBeNull()
  })
})

describe('isEmail', () => {
  it('returns error for invalid email', () => {
    expect(isEmail()('notanemail', allValues)).toBe('Please enter a valid email address')
  })

  it('returns error for missing domain', () => {
    expect(isEmail()('user@', allValues)).toBe('Please enter a valid email address')
  })

  it('returns null for valid email', () => {
    expect(isEmail()('user@example.com', allValues)).toBeNull()
  })

  it('returns null for empty (let isRequired handle that)', () => {
    expect(isEmail()('', allValues)).toBeNull()
  })
})

describe('maxLength', () => {
  it('returns error when exceeds limit', () => {
    expect(maxLength(5)('abcdef', allValues)).toBe('Must be 5 characters or less')
  })

  it('returns null when within limit', () => {
    expect(maxLength(5)('abcde', allValues)).toBeNull()
  })
})

describe('minLength', () => {
  it('returns error when under limit', () => {
    expect(minLength(8)('abc', allValues)).toBe('Must be at least 8 characters')
  })

  it('returns null when at limit', () => {
    expect(minLength(8)('abcdefgh', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(minLength(8)('', allValues)).toBeNull()
  })
})

describe('matchesField', () => {
  it('returns error when fields do not match', () => {
    const values = { password: 'Test1234', confirmPassword: 'Different' }
    expect(matchesField('password', 'Passwords')('Different', values)).toBe("Passwords don't match")
  })

  it('returns null when fields match', () => {
    expect(matchesField('password', 'Passwords')('Test1234', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(matchesField('password', 'Passwords')('', allValues)).toBeNull()
  })
})

describe('passwordStrength', () => {
  it('returns error when missing uppercase', () => {
    expect(passwordStrength()('test1234', allValues)).toBe('Must contain at least one uppercase letter')
  })

  it('returns error when missing digit', () => {
    expect(passwordStrength()('Testtest', allValues)).toBe('Must contain at least one number')
  })

  it('returns null when strong enough', () => {
    expect(passwordStrength()('Test1234', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(passwordStrength()('', allValues)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/tests/validation-rules.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validation rules**

```typescript
// frontend/src/utils/validation-rules.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/tests/validation-rules.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/validation-rules.ts frontend/src/utils/tests/validation-rules.test.ts
git commit -m "feat: add shared validation rule functions"
```

---

### Task 2: useFieldValidation Hook

**Files:**
- Create: `frontend/src/hooks/use-field-validation.ts`
- Create: `frontend/src/hooks/tests/use-field-validation.test.ts`

- [ ] **Step 1: Write failing tests for the hook**

```typescript
// frontend/src/hooks/tests/use-field-validation.test.ts
// ABOUTME: Tests for useFieldValidation hook — blur triggers, change-after-error, validateAll, setFieldError, isValid

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFieldValidation } from '../use-field-validation'
import { isRequired, isEmail } from '@/utils/validation-rules'

const schema = {
  name: [isRequired('Name')],
  email: [isRequired('Email'), isEmail()],
}

describe('useFieldValidation', () => {
  it('starts with no errors and isValid false (empty required fields)', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    expect(result.current.errors).toEqual({})
    expect(result.current.isValid).toBe(false)
  })

  it('validates on blur and shows error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    act(() => result.current.handleBlur('name'))
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.touched.name).toBe(true)
  })

  it('clears error on change after error when value is fixed', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    act(() => result.current.handleBlur('name'))
    expect(result.current.errors.name).toBe('Name is required')

    // Pass the current value directly to avoid stale closure issues
    act(() => result.current.handleChange('name', 'August'))
    expect(result.current.errors.name).toBeUndefined()
  })

  it('does not validate on change if field has no error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: '' })
    )
    act(() => result.current.handleChange('name', 'August'))
    expect(result.current.errors.name).toBeUndefined()
    expect(result.current.touched.name).toBeUndefined()
  })

  it('validateAll marks all fields and returns false on errors', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    let valid: boolean
    act(() => { valid = result.current.validateAll() })
    expect(valid!).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Email is required')
  })

  it('validateAll returns true when all fields valid', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: 'a@b.com' })
    )
    let valid: boolean
    act(() => { valid = result.current.validateAll() })
    expect(valid!).toBe(true)
  })

  it('setFieldError injects a backend error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: 'a@b.com' })
    )
    act(() => result.current.setFieldError('email', 'Email already registered'))
    expect(result.current.errors.email).toBe('Email already registered')
  })

  it('isValid reflects all required fields having values and passing', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useFieldValidation(schema, v),
      { initialProps: { v: { name: '', email: '' } } }
    )
    expect(result.current.isValid).toBe(false)

    rerender({ v: { name: 'August', email: 'a@b.com' } })
    expect(result.current.isValid).toBe(true)
  })

  it('runs validators in order and stops at first error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: 'bad' })
    )
    act(() => result.current.handleBlur('email'))
    expect(result.current.errors.email).toBe('Please enter a valid email address')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/hooks/tests/use-field-validation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

```typescript
// frontend/src/hooks/use-field-validation.ts
// ABOUTME: Form validation hook — validates on blur, re-validates on change after error,
// supports validateAll for submit and setFieldError for backend errors.

import { useState, useCallback, useMemo } from 'react'

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/hooks/tests/use-field-validation.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-field-validation.ts frontend/src/hooks/tests/use-field-validation.test.ts
git commit -m "feat: add useFieldValidation hook"
```

---

## Chunk 2: Form Integration

### Task 3: Register Page Validation

**Files:**
- Modify: `frontend/src/pages/register-page.tsx`
- Modify: `frontend/src/pages/tests/register-page.test.tsx` (update/add validation tests)

The register page already has inline validation with `touched` tracking and `border-coral` styling. Refactor to use `useFieldValidation` instead of the manual approach. This removes the per-field computed validation booleans and replaces them with the hook.

- [ ] **Step 1: Refactor register-page.tsx to use useFieldValidation**

Key changes:
- Import `useFieldValidation` and validation rule functions
- Replace individual `isEmailValid`, `isPasswordLong`, etc. variables with the hook
- Define schema with `useMemo` to avoid reference instability: `name: [isRequired('Name'), maxLength(64)]`, `email: [isRequired('Email'), isEmail(), maxLength(254)]`, `password: [isRequired('Password'), minLength(8), maxLength(128), passwordStrength()]`, `confirmPassword: [isRequired('Confirm password'), matchesField('password', 'Passwords')]`
- Pass `{ name, email, password, confirmPassword }` as values
- Replace `touched` state with hook's `touched`
- Replace manual error computation with `errors` from hook
- Replace `isFormValid` with hook's `isValid`
- Replace `onBlur` handlers with `handleBlur('fieldName')`
- Add `onChange` wrappers that call both `setState` and `handleChange('fieldName', e.target.value)` — the value must be passed explicitly to avoid stale closures
- In submit handler: call `validateAll()` first, use `setFieldError('email', ...)` for `DUPLICATE_EMAIL` backend error
- Remove `serverEmailError` state (replaced by `setFieldError`)
- Input border class: `touched[field] && !errors[field] ? 'border-teal border-2' : errors[field] ? 'border-coral border-2' : 'border-navy/10'`
- Label class: `errors[field] ? 'text-coral' : 'text-navy-soft'`
- Error message below each input: `{errors[field] && <p className="mt-1 text-sm text-coral">{errors[field]}</p>}`
- Keep existing password requirements checklist — it reads from `password` state directly, not from the hook

- [ ] **Step 2: Update register page tests**

Add tests for:
- Error message appears below email field on blur with invalid email
- Error message clears when user fixes the email
- Submit button disabled when form incomplete
- Duplicate email error shows inline on email field (mock mutation to throw ApiError with `errorCode: 'DUPLICATE_EMAIL'`)
- Existing tests should still pass (successful registration flow)

- [ ] **Step 3: Run all register page tests**

Run: `cd frontend && npx vitest run src/pages/tests/register-page.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/register-page.tsx frontend/src/pages/tests/register-page.test.tsx
git commit -m "refactor: register page uses useFieldValidation hook"
```

---

### Task 4: Login Page Validation

**Files:**
- Modify: `frontend/src/pages/login-page.tsx`
- Modify: `frontend/src/pages/tests/login-page.test.tsx`

Login currently has no field-level validation display. Add it.

- [ ] **Step 1: Add useFieldValidation to login-page.tsx**

Key changes:
- Import `useFieldValidation`, `isRequired`, `isEmail`
- Schema: `email: [isRequired('Email'), isEmail()]`, `password: [isRequired('Password')]`
- Pass `{ email, password }` as values
- Add `onBlur` and `onChange` wrappers
- Replace `email.trim() && password.trim()` disabled check with `!isValid`
- Add error border styling and error messages below fields
- Add teal valid border on touched fields
- In submit handler: call `validateAll()` before mutation
- Replace generic "Login failed" error box with `setFieldError('email', 'Invalid email or password')` on login failure

- [ ] **Step 2: Update login page tests**

Add tests for:
- Error shows on empty email blur
- Error clears on valid input
- Login failure shows inline error on email field
- Submit button disabled when fields empty

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/pages/tests/login-page.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/login-page.tsx frontend/src/pages/tests/login-page.test.tsx
git commit -m "feat: login page field-level validation"
```

---

### Task 5: Profile Section Validation

**Files:**
- Modify: `frontend/src/pages/components/profile-section.tsx`
- Modify: `frontend/src/pages/components/tests/profile-section.test.tsx`

- [ ] **Step 1: Refactor profile-section.tsx to use useFieldValidation**

Key changes:
- Import `useFieldValidation`, `isRequired`, `isEmail`, `maxLength`
- Schema: `name: [isRequired('Name'), maxLength(64)]`, `email: [isRequired('Email'), isEmail(), maxLength(254)]`
- Conditionally add `currentPassword: [isRequired('Password')]` to schema only when email has changed
- Replace manual `isEmailValid`/`isNameValid`/`isFormValid` with hook
- Replace `emailError` state with `setFieldError` for backend errors (duplicate email)
- Add error/valid border styling and error messages
- Reset hook state when entering/exiting edit mode (create new schema on mode change)

- [ ] **Step 2: Update tests**

Add tests for inline error display on blur and clearing.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/pages/components/tests/profile-section.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/components/profile-section.tsx frontend/src/pages/components/tests/profile-section.test.tsx
git commit -m "refactor: profile section uses useFieldValidation hook"
```

---

### Task 6: Security Section Validation

**Files:**
- Modify: `frontend/src/pages/components/security-section.tsx`
- Modify: `frontend/src/pages/components/tests/security-section.test.tsx`

- [ ] **Step 1: Refactor security-section.tsx to use useFieldValidation**

Key changes:
- Import `useFieldValidation`, `isRequired`, `minLength`, `maxLength`, `matchesField`, `passwordStrength`
- Schema: `currentPassword: [isRequired('Current password')]`, `newPassword: [isRequired('New password'), minLength(8), maxLength(128), passwordStrength()]`, `confirmPassword: [isRequired('Confirm password'), matchesField('newPassword', 'Passwords')]`
- Replace manual validation with hook
- Replace `passwordError` state with `setFieldError` for backend "Incorrect password" error
- Add password requirements checklist for `newPassword` (same pattern as register page)
- Add error/valid border styling and error messages

- [ ] **Step 2: Update tests**

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/pages/components/tests/security-section.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/components/security-section.tsx frontend/src/pages/components/tests/security-section.test.tsx
git commit -m "refactor: security section uses useFieldValidation hook"
```

---

### Task 7: Simple Form Validation (Household, Trip, Store, Inventory)

**Files:**
- Modify: `frontend/src/pages/create-household-page.tsx`
- Modify: `frontend/src/pages/shopping-page.tsx` (trip create/edit form)
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (store create/edit form)
- Modify: `frontend/src/pages/pantry-items-view.tsx` (item create/edit form)

These forms each have a single name field. The validation is just `isRequired` plus `maxLength`.

- [ ] **Step 1: Add useFieldValidation to each form**

For each form:
- Import hook and rules
- Schema: `name: [isRequired('<Entity> name'), maxLength(<limit>)]`
  - Household: 100, Store: 100, Inventory item: 200, Trip: no max
- Replace `!name.trim()` disabled check with `!isValid`
- Add error border and message on the name input
- In submit handler: call `validateAll()` first

- [ ] **Step 2: Update existing tests for these pages**

For pages with existing tests, add a test verifying the name field shows an error on blur when empty and clears when filled. If a page has no existing test file, note it but don't create a new test file — the `useFieldValidation` hook itself is already tested.

Test files to check and update:
- `frontend/src/pages/tests/create-household-page.test.tsx` (if exists)
- `frontend/src/pages/tests/shopping-page.test.tsx` (if exists)

For pantry views, existing tests may live in `pages/tests/` — check and add validation assertions where test files exist.

- [ ] **Step 3: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/create-household-page.tsx frontend/src/pages/shopping-page.tsx frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/pantry-items-view.tsx
git commit -m "feat: add field validation to household, trip, store, and inventory forms"
```

---

## Chunk 3: Error Boundary

### Task 8: Install react-error-boundary and Create ErrorFallback

**Files:**
- Create: `frontend/src/pages/components/error-fallback.tsx`
- Create: `frontend/src/pages/components/tests/error-fallback.test.tsx`

- [ ] **Step 1: Install react-error-boundary**

Run: `cd frontend && npm install react-error-boundary`

- [ ] **Step 2: Write failing tests for ErrorFallback**

```typescript
// frontend/src/pages/components/tests/error-fallback.test.tsx
// ABOUTME: Tests for the error boundary fallback UI

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ErrorFallback } from '../error-fallback'

describe('ErrorFallback', () => {
  const mockError = new Error('Test error')
  const mockResetErrorBoundary = vi.fn()

  it('renders heading and subtitle', () => {
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
  })

  it('calls window.location.reload when Reload is clicked', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    })
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadMock).toHaveBeenCalled()
  })

  it('renders Go Home link that calls resetErrorBoundary', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /go home/i })
    expect(link).toHaveAttribute('href', '/')
    await user.click(link)
    expect(mockResetErrorBoundary).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/components/tests/error-fallback.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement ErrorFallback**

```typescript
// frontend/src/pages/components/error-fallback.tsx
// ABOUTME: Fallback UI for the top-level error boundary. Shows a friendly error
// message with Reload and Go Home options when a component render error occurs.

import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl shadow-md p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-coral/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-coral" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-navy mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          An unexpected error occurred. Try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-teal text-white py-3 px-4 rounded-xl font-display font-bold hover:bg-teal-light transition-colors mb-3"
        >
          Reload
        </button>
        <Link
          to="/"
          onClick={resetErrorBoundary}
          className="text-sm text-teal hover:text-teal-light font-semibold transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/components/tests/error-fallback.test.tsx`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/components/error-fallback.tsx frontend/src/pages/components/tests/error-fallback.test.tsx package.json package-lock.json
git commit -m "feat: add ErrorFallback component and react-error-boundary"
```

---

### Task 9: Wire Error Boundary into app.tsx

**Files:**
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Add ErrorBoundary wrapping AppRoutes inside BrowserRouter**

In `app.tsx`:
- Import `ErrorBoundary` from `react-error-boundary`
- Import `ErrorFallback` from `@/pages/components/error-fallback`
- Import `useLocation` from `react-router-dom`
- Create a wrapper component `ErrorBoundaryWithReset` that uses `useLocation()` to pass `resetKeys={[pathname]}` (the hook must be called inside BrowserRouter)
- Wrap `AppRoutes` with `ErrorBoundaryWithReset`:

```tsx
function ErrorBoundaryWithReset({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => console.error('Uncaught render error:', error)}
      resetKeys={[pathname]}
    >
      {children}
    </ErrorBoundary>
  )
}
```

Nesting becomes:
```
Toaster → QueryClientProvider → AuthProvider → BrowserRouter → ErrorBoundaryWithReset → AppRoutes
```

- [ ] **Step 2: Write integration test for error boundary**

Create a test that verifies a throwing component is caught:

```typescript
// frontend/src/pages/components/tests/error-boundary-integration.test.tsx
// ABOUTME: Integration test verifying the error boundary catches render errors

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '../error-fallback'

function ThrowingComponent(): JSX.Element {
  throw new Error('Test render error')
}

describe('Error boundary integration', () => {
  it('renders ErrorFallback when a child component throws', () => {
    // Suppress console.error from the intentional throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    spy.mockRestore()
  })
})
```

- [ ] **Step 3: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app.tsx frontend/src/pages/components/tests/error-boundary-integration.test.tsx
git commit -m "feat: wire top-level error boundary into app"
```

---

## Chunk 4: Accessibility

### Task 10: Skip-to-Content Link

**Files:**
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Add skip-to-content link and main content id**

In `app.tsx`:
- Add a skip link as the first child inside `BrowserRouter` (before `ErrorBoundaryWithReset`):

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-teal focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-display focus:font-bold"
>
  Skip to content
</a>
```

- Add `id="main-content"` to the route outlet wrapper. In `AuthenticatedLayout`, the wrapper `<div className="bg-bg min-h-screen pb-24">` should get `id="main-content"`. For public routes (login/register), add `id="main-content"` to the outermost `<div>` inside each page component (`login-page.tsx` and `register-page.tsx`). Since React Router only renders one route at a time, duplicate IDs across routes are not a concern.

- [ ] **Step 2: Verify manually and run tests**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app.tsx
git commit -m "feat: add skip-to-content link for accessibility"
```

---

### Task 11: ConfirmDialog ARIA Attributes

**Files:**
- Modify: `frontend/src/pages/components/confirm-dialog.tsx`
- Modify: `frontend/src/pages/components/tests/confirm-dialog.test.tsx`

- [ ] **Step 1: Add role="dialog" and aria-modal="true" to ConfirmDialog**

In `confirm-dialog.tsx`, add ARIA attributes to the **inner content card div** (the one with `ref={dialogRef}`), NOT the outer backdrop overlay:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby="confirm-dialog-title"` (add matching `id="confirm-dialog-title"` to the `<h3>`)

- [ ] **Step 2: Add test verifying ARIA attributes**

```typescript
it('has correct ARIA attributes', () => {
  render(<ConfirmDialog {...defaultProps} />)
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title')
})
```

- [ ] **Step 3: Verify existing focus trap tests still pass**

Run: `cd frontend && npx vitest run src/pages/components/tests/confirm-dialog.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/components/confirm-dialog.tsx frontend/src/pages/components/tests/confirm-dialog.test.tsx
git commit -m "fix: add ARIA dialog attributes to ConfirmDialog"
```

---

### Task 12: Audit Icon-Only Buttons

**Files:**
- Potentially modify: any component with icon-only buttons missing `aria-label`

- [ ] **Step 1: Grep for icon-only button patterns**

Run: `cd frontend && grep -rn '<button' src/pages/ --include='*.tsx' | grep -v 'aria-label'`

Cross-reference with buttons that contain only Lucide icon components and no text children. The exploration found that trip-card, trip-item-row, pantry-stores-view, and pantry-items-view **already have** `aria-label` on their kebab buttons. This task may find nothing — that's fine, document the finding.

- [ ] **Step 2: Fix any buttons found without labels**

For each icon-only button missing `aria-label`, add a descriptive label.

- [ ] **Step 3: Run full test suite + TypeScript check**

Run: `cd frontend && npx vitest run && npx tsc -b --noEmit`
Expected: All PASS

- [ ] **Step 4: Run ESLint**

Run: `cd frontend && npx eslint src/`
Expected: No errors

- [ ] **Step 5: Commit (if changes were made)**

Stage only the specific files that were modified, then commit:

```bash
git commit -m "fix: add missing aria-labels on icon-only buttons"
```

---

## Final Verification

### Task 13: Full Suite Verification

- [ ] **Step 1: Run complete frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 3: Run ESLint**

Run: `cd frontend && npx eslint src/`
Expected: No errors

- [ ] **Step 4: Manual smoke test**

Start the app (`npm run dev`) and verify:
- Register page: blur empty fields → inline errors appear; fix field → error clears; submit with used email → inline "already registered" error
- Login page: blur empty fields → inline errors; failed login → inline error
- Settings: profile and password forms show inline validation
- Trigger a render error (React DevTools or temporary throw) → ErrorFallback shows; "Go Home" recovers
- Tab from URL bar → skip link appears → Enter → focus jumps to main content
