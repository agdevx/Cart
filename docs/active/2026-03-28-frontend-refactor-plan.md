# Frontend Refactoring — Implementation Plan (Phases 2-4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared components from duplicated patterns, split forms into own files, and clean up dead code.

**Architecture:** Extract reusable components into `shared/`, sort utilities into `utils/`, and split forms per the architecture rules in CLAUDE.md. Components never fetch data — they receive it via props.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest + RTL

**Spec:** `docs/active/2026-03-28-frontend-refactor.md`

---

## Task 1: Sort Utilities

**Files:**
- Create: `frontend/src/utils/sort-households.ts`
- Create: `frontend/src/utils/sort-stores.ts`
- Create: `frontend/src/utils/sort-items.ts`

- [ ] **Step 1: Create sort-households.ts**

```typescript
// ABOUTME: Sort households alphabetically by name using localeCompare
// ABOUTME: Used by ScopeFilter, pantry views, and household page

interface Sortable {
  readonly name: string | null
}

export const sortHouseholds = <T extends Sortable>(households: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...households].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
```

- [ ] **Step 2: Create sort-stores.ts**

```typescript
// ABOUTME: Sort stores alphabetically by name using localeCompare
// ABOUTME: Used by StoreFilter and pantry stores view

interface Sortable {
  readonly name: string
}

export const sortStores = <T extends Sortable>(stores: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...stores].sort((a, b) => a.name.localeCompare(b.name))
```

- [ ] **Step 3: Create sort-items.ts**

```typescript
// ABOUTME: Sort inventory items alphabetically by name using localeCompare
// ABOUTME: Used by pantry items view and add-trip-items page

interface Sortable {
  readonly name: string
}

export const sortItems = <T extends Sortable>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))
```

- [ ] **Step 4: Replace inline sorting across codebase**

Find every `[...arr].sort((a, b) => a.name.localeCompare(b.name))` pattern and replace with the utility function. Files to check:
- `pages/household/household-page.tsx` — sortedHouseholds
- `pages/pantry/pantry-items-view.tsx` — sortedItems, within-group sorting
- `pages/pantry/pantry-stores-view.tsx` — store sorting
- `pages/shopping/add-trip-items-page.tsx` — filteredItems sort
- `shared/scope-select.tsx` — household sorting in dropdown

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor: extract sort utilities for households, stores, and items"
```

---

## Task 2: SectionHeader Component

**Files:**
- Create: `frontend/src/shared/section-header.tsx`
- Create: `frontend/src/shared/tests/section-header.test.tsx`

- [ ] **Step 1: Write test for SectionHeader**

```tsx
// ABOUTME: Tests for SectionHeader shared component
// ABOUTME: Verifies title rendering, divider line, and optional action slot

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionHeader } from '../section-header'

describe('SectionHeader', () => {
  it('should render title text', () => {
    render(<SectionHeader title="In Progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('should render action when provided', () => {
    render(<SectionHeader title="Test" action={<button>Toggle</button>} />)
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/shared/tests/section-header.test.tsx`

- [ ] **Step 3: Implement SectionHeader**

```tsx
// ABOUTME: Section divider with uppercase title and horizontal rule
// ABOUTME: Used across shopping, pantry, household, and trip pages for grouping content

interface SectionHeaderProps {
  readonly title: string
  readonly action?: React.ReactNode
}

export const SectionHeader = ({ title, action }: SectionHeaderProps) => (
  <div className="flex items-center gap-2.5 mb-3">
    <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
      {title}
    </span>
    <span className="flex-1 h-px bg-navy/8" />
    {action}
  </div>
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/shared/tests/section-header.test.tsx`

- [ ] **Step 5: Replace all 9 inline section headers with SectionHeader**

Files to update (replace the inline `<div className="flex items-center gap-2.5 ...">` pattern):
- `pages/shopping/shopping-page.tsx` — "In Progress", "Planning", "Completed" (Completed has a ChevronDown action)
- `pages/pantry/pantry-items-view.tsx` — household group headers, "Personal Items"
- `pages/pantry/pantry-stores-view.tsx` — household group headers, "Personal Stores"
- `pages/shopping/trip-detail-page.tsx` — "Shopping List"
- `pages/household/household-detail-page.tsx` — "Members"

For each: import `SectionHeader` from `@/shared/section-header` and replace the inline JSX.

The "Completed" section in shopping-page.tsx is special — it's a `<button>` with an onClick and ChevronDown. Pass the chevron as the `action` prop.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract SectionHeader shared component"
```

---

## Task 3: FormField Component

**Files:**
- Create: `frontend/src/shared/form-field.tsx`
- Create: `frontend/src/shared/tests/form-field.test.tsx`

- [ ] **Step 1: Write test for FormField**

```tsx
// ABOUTME: Tests for FormField shared component
// ABOUTME: Verifies label, error display, and children rendering

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FormField } from '../form-field'

describe('FormField', () => {
  it('should render label and children', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render error message when provided', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('should apply error styling to label when error is present', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <input id="email" />
      </FormField>
    )
    const label = screen.getByText('Email')
    expect(label.className).toContain('text-coral')
  })

  it('should apply default styling to label when no error', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    )
    const label = screen.getByText('Email')
    expect(label.className).toContain('text-navy-soft')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement FormField**

```tsx
// ABOUTME: Reusable form field wrapper with label and error display
// ABOUTME: Wraps any input element with consistent label styling and error message placement

interface FormFieldProps {
  readonly label: string
  readonly htmlFor: string
  readonly error?: string
  readonly children: React.ReactNode
}

export const FormField = ({ label, htmlFor, error, children }: FormFieldProps) => (
  <div className="mb-3">
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-semibold mb-1 ${error ? 'text-coral' : 'text-navy-soft'}`}
    >
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-sm text-coral">{error}</p>}
  </div>
)
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace inline form field patterns across codebase**

Replace the `<div className="mb-3"><label ...>...<input ...>{errors && <p ...>}` pattern in:
- `pages/pantry/pantry-items-view.tsx` — create form fields (name, scope, notes, default store) and edit form fields
- `pages/pantry/pantry-stores-view.tsx` — create and edit form fields
- `pages/shopping/shopping-page.tsx` — trip name field
- `pages/household/create-household-page.tsx` — household name field
- `pages/household/join-household-page.tsx` — invite code field
- `pages/login/login-page.tsx` — email and password fields
- `pages/register/register-page.tsx` — email, password, confirm password, name fields
- `pages/settings/profile-section.tsx` — name and email fields
- `pages/settings/security-section.tsx` — current password, new password, confirm password fields
- `shared/trip-item-row.tsx` — EditForm quantity, notes, store fields

Each file: import `FormField` from `@/shared/form-field`, wrap the input in `<FormField label="..." htmlFor="..." error={errors.field}>`.

**Important:** The login and register pages have a custom `labelClass` function that changes label color based on errors. FormField handles this internally, so the `labelClass` function can be removed. The `borderClass` function for input styling stays — it's on the input itself, not the label wrapper.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract FormField shared component"
```

---

## Task 4: ActionCancelFormButtons Component

**Files:**
- Create: `frontend/src/shared/action-cancel-form-buttons.tsx`
- Create: `frontend/src/shared/tests/action-cancel-form-buttons.test.tsx`

- [ ] **Step 1: Write test**

```tsx
// ABOUTME: Tests for ActionCancelFormButtons shared component
// ABOUTME: Verifies cancel/submit rendering, spinner on pending, disabled state

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ActionCancelFormButtons } from '../action-cancel-form-buttons'

describe('ActionCancelFormButtons', () => {
  it('should render cancel and submit buttons', () => {
    render(
      <ActionCancelFormButtons
        onCancel={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />
    )
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('should show spinner when pending', () => {
    render(
      <ActionCancelFormButtons
        onCancel={vi.fn()}
        submitLabel="Save"
        isPending={true}
      />
    )
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should call onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ActionCancelFormButtons
        onCancel={onCancel}
        submitLabel="Save"
        isPending={false}
      />
    )
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ActionCancelFormButtons**

```tsx
// ABOUTME: Cancel/Submit button pair used in all form footers
// ABOUTME: Handles spinner display on pending state and disabled styling

import { Spinner } from './spinner'

interface ActionCancelFormButtonsProps {
  readonly onCancel: () => void
  readonly submitLabel: string
  readonly isPending: boolean
  readonly disabled?: boolean
  readonly type?: 'submit' | 'button'
  readonly onSubmit?: () => void
}

export const ActionCancelFormButtons = ({
  onCancel,
  submitLabel,
  isPending,
  disabled = false,
  type = 'submit',
  onSubmit,
}: ActionCancelFormButtonsProps) => (
  <div className="flex gap-3">
    <button
      type="button"
      onClick={onCancel}
      className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
    >
      Cancel
    </button>
    <button
      type={type}
      onClick={onSubmit}
      disabled={isPending || disabled}
      className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
    >
      {isPending ? <Spinner /> : submitLabel}
    </button>
  </div>
)
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace inline button pairs across codebase**

Replace the `<div className="flex gap-3">..Cancel..Submit..</div>` pattern in:
- `pages/pantry/pantry-items-view.tsx` — create form buttons and edit form buttons
- `pages/pantry/pantry-stores-view.tsx` — create and edit form buttons
- `pages/shopping/shopping-page.tsx` — trip create form buttons
- `pages/household/create-household-page.tsx` — form buttons
- `pages/household/join-household-page.tsx` — form buttons
- `shared/trip-card.tsx` — edit form buttons (uses type="button" with onSubmit instead of form submit)
- `shared/trip-item-row.tsx` — EditForm buttons
- `pages/settings/security-section.tsx` — password change buttons

For the `trip-item-row.tsx` EditForm, the buttons are smaller (`py-2.5 text-sm`). Check if the default sizing works or if the component needs a `size` prop. If only one place needs smaller buttons, pass a className override or keep the inline version for that one case.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract ActionCancelFormButtons shared component"
```

---

## Task 5: PasswordCriteria Component

**Files:**
- Create: `frontend/src/shared/password-criteria.tsx`
- Create: `frontend/src/shared/tests/password-criteria.test.tsx`

- [ ] **Step 1: Write test**

```tsx
// ABOUTME: Tests for PasswordCriteria shared component
// ABOUTME: Verifies checklist updates based on password input

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PasswordCriteria } from '../password-criteria'

describe('PasswordCriteria', () => {
  it('should show all unchecked for empty password', () => {
    render(<PasswordCriteria password="" />)
    expect(screen.getByText(/8\+ characters/)).toBeInTheDocument()
    expect(screen.getByText('○ 8+ characters')).toBeInTheDocument()
  })

  it('should check length requirement when met', () => {
    render(<PasswordCriteria password="abcdefgh" />)
    expect(screen.getByText('✓ 8+ characters')).toBeInTheDocument()
  })

  it('should check uppercase requirement when met', () => {
    render(<PasswordCriteria password="A" />)
    expect(screen.getByText('✓ One uppercase letter')).toBeInTheDocument()
  })

  it('should check number requirement when met', () => {
    render(<PasswordCriteria password="1" />)
    expect(screen.getByText('✓ One number')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement PasswordCriteria**

```tsx
// ABOUTME: Live password requirements checklist
// ABOUTME: Shows check/uncheck status for length, uppercase, and number requirements

interface PasswordCriteriaProps {
  readonly password: string
}

export const PasswordCriteria = ({ password }: PasswordCriteriaProps) => {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  return (
    <div className="mt-2 text-xs text-text-secondary">
      <p className="font-semibold mb-1">Requirements:</p>
      <div className="space-y-1">
        <p className={hasMinLength ? 'text-teal' : ''}>
          {hasMinLength ? '✓' : '○'} 8+ characters
        </p>
        <p className={hasUppercase ? 'text-teal' : ''}>
          {hasUppercase ? '✓' : '○'} One uppercase letter
        </p>
        <p className={hasNumber ? 'text-teal' : ''}>
          {hasNumber ? '✓' : '○'} One number
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace inline password criteria in register-page and security-section**

- `pages/register/register-page.tsx` — remove `hasMinLength`, `hasUppercase`, `hasNumber` vars and the criteria JSX block. Replace with `<PasswordCriteria password={password} />`.
- `pages/settings/security-section.tsx` — same, replace with `<PasswordCriteria password={newPassword} />`.

Note: The register page has a "Requirements:" header in the criteria. The security section does not. Check both and make the component match what's there. If they differ, use the version with the header and update both to be consistent.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract PasswordCriteria shared component"
```

---

## Task 6: ScopeFilter Component

**Files:**
- Create: `frontend/src/shared/scope-filter.tsx`
- Create: `frontend/src/shared/tests/scope-filter.test.tsx`

- [ ] **Step 1: Write test**

```tsx
// ABOUTME: Tests for ScopeFilter shared component
// ABOUTME: Verifies All/Personal/Household tab rendering and selection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScopeFilter } from '../scope-filter'

const mockHouseholds = [
  { id: 'h2', name: 'Beta House' },
  { id: 'h1', name: 'Alpha House' },
]

describe('ScopeFilter', () => {
  it('should render All, Personal, and household tabs', () => {
    render(<ScopeFilter value="all" onChange={vi.fn()} households={mockHouseholds} />)
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alpha House' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta House' })).toBeInTheDocument()
  })

  it('should sort households alphabetically', () => {
    render(<ScopeFilter value="all" onChange={vi.fn()} households={mockHouseholds} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[2]).toHaveTextContent('Alpha House')
    expect(tabs[3]).toHaveTextContent('Beta House')
  })

  it('should call onChange when tab is clicked', async () => {
    const onChange = vi.fn()
    render(<ScopeFilter value="all" onChange={onChange} households={mockHouseholds} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Personal' }))
    expect(onChange).toHaveBeenCalledWith('personal')
  })

  it('should mark active tab as selected', () => {
    render(<ScopeFilter value="personal" onChange={vi.fn()} households={mockHouseholds} />)
    expect(screen.getByRole('tab', { name: 'Personal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ScopeFilter**

```tsx
// ABOUTME: All/Personal/Household filter tabs used on pantry and add-trip-items pages
// ABOUTME: Sorts households alphabetically and handles tab selection

import { useMemo } from 'react'

import { sortHouseholds } from '@/utils/sort-households'

interface ScopeFilterProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly households: ReadonlyArray<{ readonly id: string; readonly name: string | null }> | undefined
}

export const ScopeFilter = ({ value, onChange, households }: ScopeFilterProps) => {
  const sorted = useMemo(
    () => sortHouseholds(households || []),
    [households]
  )

  const buttonClass = (isActive: boolean) =>
    `flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
      isActive
        ? 'bg-teal text-white shadow-sm'
        : 'text-text-secondary hover:text-navy'
    }`

  return (
    <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 overflow-x-auto">
      <button
        role="tab"
        aria-selected={value === 'all'}
        onClick={() => onChange('all')}
        className={buttonClass(value === 'all')}
      >
        All
      </button>
      <button
        role="tab"
        aria-selected={value === 'personal'}
        onClick={() => onChange('personal')}
        className={buttonClass(value === 'personal')}
      >
        Personal
      </button>
      {sorted.map((household) => (
        <button
          key={household.id}
          role="tab"
          aria-selected={value === household.id}
          onClick={() => onChange(household.id)}
          className={buttonClass(value === household.id)}
        >
          {household.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace inline scope filter tabs**

Replace the duplicated tablist patterns in:
- `pages/pantry/pantry-page.tsx` — the filter tabs (All/Personal/Household buttons). The `value` maps to the `filter` state. For household tabs, the value is `household:${household.id}` — so ScopeFilter's onChange callback needs to produce that format. Either: (a) have the parent wrap the onChange, or (b) add a `valuePrefix` prop. Option (a) is simpler: `onChange={(v) => setFilter(v === 'all' ? 'all' : v === 'personal' ? 'personal' : \`household:${v}\`)}`.
- `pages/shopping/add-trip-items-page.tsx` — the source filter tabs. The `value` is `sourceFilter` state. Same mapping approach.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract ScopeFilter shared component"
```

---

## Task 7: StoreFilter Component

**Files:**
- Create: `frontend/src/shared/store-filter.tsx`
- Create: `frontend/src/shared/tests/store-filter.test.tsx`

- [ ] **Step 1: Write test**

```tsx
// ABOUTME: Tests for StoreFilter shared component
// ABOUTME: Verifies All/Store tab rendering, sorting, and selection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StoreFilter } from '../store-filter'

const mockStores = [
  { id: 's2', name: 'Walmart' },
  { id: 's1', name: 'Costco' },
]

const mockDisplayNames = new Map([
  ['s1', 'Costco'],
  ['s2', 'Walmart'],
])

describe('StoreFilter', () => {
  it('should render All tab and store tabs', () => {
    render(<StoreFilter value="all" onChange={vi.fn()} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Costco' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Walmart' })).toBeInTheDocument()
  })

  it('should sort stores alphabetically', () => {
    render(<StoreFilter value="all" onChange={vi.fn()} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[1]).toHaveTextContent('Costco')
    expect(tabs[2]).toHaveTextContent('Walmart')
  })

  it('should call onChange when tab is clicked', async () => {
    const onChange = vi.fn()
    render(<StoreFilter value="all" onChange={onChange} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Costco' }))
    expect(onChange).toHaveBeenCalledWith('s1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement StoreFilter**

```tsx
// ABOUTME: All/Store filter tabs used on add-trip-items page
// ABOUTME: Sorts stores alphabetically and handles tab selection

import { useMemo } from 'react'

import { sortStores } from '@/utils/sort-stores'

interface StoreFilterProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly stores: ReadonlyArray<{ readonly id: string; readonly name: string }>
  readonly storeDisplayNames: ReadonlyMap<string, string>
}

export const StoreFilter = ({ value, onChange, stores, storeDisplayNames }: StoreFilterProps) => {
  const sorted = useMemo(() => sortStores(stores), [stores])

  const buttonClass = (isActive: boolean) =>
    `flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
      isActive
        ? 'bg-teal text-white shadow-sm'
        : 'text-text-secondary hover:text-navy'
    }`

  return (
    <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 overflow-x-auto">
      <button
        role="tab"
        aria-selected={value === 'all'}
        onClick={() => onChange('all')}
        className={buttonClass(value === 'all')}
      >
        All
      </button>
      {sorted.map((store) => (
        <button
          key={store.id}
          role="tab"
          aria-selected={value === store.id}
          onClick={() => onChange(store.id)}
          className={buttonClass(value === store.id)}
        >
          {storeDisplayNames.get(store.id) ?? store.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace inline store filter tabs**

Replace in `pages/shopping/add-trip-items-page.tsx` — the store filter tablist.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract StoreFilter shared component"
```

---

## Task 8: Extract Pantry Item Forms

**Files:**
- Create: `frontend/src/pages/pantry/pantry-item-form.tsx`
- Modify: `frontend/src/pages/pantry/pantry-items-view.tsx`

- [ ] **Step 1: Extract create and edit forms into pantry-item-form.tsx**

Extract the create form JSX (the `<form onSubmit={handleCreate}>` block) and edit form JSX (`renderEditForm`) from `pantry-items-view.tsx` into a new component file. Both forms share the same fields (name, scope, notes, default store), so a single `PantryItemForm` component with a `mode: 'create' | 'edit'` prop (or separate named exports `CreatePantryItemForm` / `EditPantryItemForm`) works.

The form component receives all needed data via props:
- `onSubmit`, `onCancel`
- `isPending`
- `households`, `stores`, `storeDisplayNames`
- Initial values (for edit mode)
- Validation state (or manage internally with `useFieldValidation`)

The form does NOT fetch data — the parent provides everything.

- [ ] **Step 2: Update pantry-items-view.tsx to use extracted forms**

Import the form component(s) and replace the inline JSX. The view file should shrink significantly.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: extract pantry item forms into own file"
```

---

## Task 9: Extract Pantry Store Forms

**Files:**
- Create: `frontend/src/pages/pantry/pantry-store-form.tsx`
- Modify: `frontend/src/pages/pantry/pantry-stores-view.tsx`

Same pattern as Task 8 but for store create/edit forms.

- [ ] **Step 1: Extract create and edit forms**

Extract from `pantry-stores-view.tsx`. Fields: name, scope.

- [ ] **Step 2: Update pantry-stores-view.tsx**

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: extract pantry store forms into own file"
```

---

## Task 10: Extract Trip Create Form

**Files:**
- Create: `frontend/src/pages/shopping/trip-create-form.tsx`
- Modify: `frontend/src/pages/shopping/shopping-page.tsx`

- [ ] **Step 1: Extract trip create form**

Extract the `<form onSubmit={handleCreateTrip}>` block from `shopping-page.tsx`. The form has one field (trip name) plus validation.

- [ ] **Step 2: Update shopping-page.tsx**

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: extract trip create form into own file"
```

---

## Task 11: Dead Code Audit

- [ ] **Step 1: Run TypeScript strict check**

Run: `cd frontend && npx tsc -b --noEmit`
Note any unused variable/import warnings.

- [ ] **Step 2: Run ESLint**

Run: `cd frontend && npx eslint src/`
Note any unused import warnings.

- [ ] **Step 3: Search for stale close-on-outside-click handlers**

Grep for `addEventListener('mousedown'` and `addEventListener('keydown'` in files that now use DropdownMenu. These handlers should have been removed when DropdownMenu was adopted. If any remain, remove them.

- [ ] **Step 4: Fix ScopeSelect missing escape key handler**

In `shared/scope-select.tsx`, the close handler only handles outside clicks, not Escape key. Add Escape handling.

- [ ] **Step 5: Remove unused imports and dead code**

Clean up anything found in steps 1-3.

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: remove dead code and fix stale event handlers"
```
