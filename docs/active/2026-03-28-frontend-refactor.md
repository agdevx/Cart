# Frontend Refactoring — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Overview

Restructure the frontend codebase to follow domain-organized architecture, extract shared components from duplicated patterns, and clean up dead code. This establishes a foundation where changes happen in one place instead of being scattered across copy-pasted code.

## Phase 1: Folder Restructure

Move from flat file layout to domain-organized folders. No logic changes — only file moves and import updates.

### Before

```
frontend/src/
├── features/bottom-nav/
├── hooks/
├── pages/
│   ├── components/
│   │   └── tests/
│   ├── tests/
│   ├── shopping-page.tsx
│   ├── pantry-page.tsx
│   ├── pantry-items-view.tsx
│   ├── pantry-stores-view.tsx
│   ├── household-page.tsx
│   ├── household-detail-page.tsx
│   ├── create-household-page.tsx
│   ├── join-household-page.tsx
│   ├── settings-page.tsx
│   ├── login-page.tsx
│   ├── register-page.tsx
│   ├── trip-detail-page.tsx
│   ├── active-trip-page.tsx
│   └── add-trip-items-page.tsx
└── utils/
```

### After

```
frontend/src/
├── pages/
│   ├── shopping/
│   │   ├── shopping-page.tsx
│   │   ├── trip-detail-page.tsx
│   │   ├── active-trip-page.tsx
│   │   ├── add-trip-items-page.tsx
│   │   └── tests/
│   ├── pantry/
│   │   ├── pantry-page.tsx
│   │   ├── pantry-items-view.tsx
│   │   ├── pantry-stores-view.tsx
│   │   └── tests/
│   ├── household/
│   │   ├── household-page.tsx
│   │   ├── household-detail-page.tsx
│   │   ├── create-household-page.tsx
│   │   ├── join-household-page.tsx
│   │   └── tests/
│   ├── settings/
│   │   ├── settings-page.tsx
│   │   └── tests/
│   ├── login/
│   │   ├── login-page.tsx
│   │   └── tests/
│   └── register/
│       ├── register-page.tsx
│       └── tests/
├── shared/
│   ├── bottom-nav/
│   │   └── bottom-nav.tsx
│   ├── confirm-dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── empty-state.tsx
│   ├── page-header.tsx
│   ├── scope-select.tsx
│   ├── spinner.tsx
│   ├── store-accordion.tsx
│   ├── trip-card.tsx
│   ├── trip-item-row.tsx
│   └── tests/
├── services/
│   ├── use-field-validation.service.ts
│   ├── use-focus-trap.service.ts
│   ├── use-sse.service.ts
│   └── use-store-accordion-state.service.ts
├── utils/
│   ├── sort-households.ts
│   ├── sort-stores.ts
│   ├── sort-items.ts
│   └── (existing utils)
└── (apis/, auth/, state/, styles/ unchanged)
```

### Rules

- Move files, update all imports, verify tests pass. No logic changes.
- `pages/components/` contents → `shared/`
- `pages/components/tests/` → `shared/tests/`
- `features/bottom-nav/` → `shared/bottom-nav/`
- `hooks/` → `services/`, rename files with `Service` suffix (e.g., `use-field-validation.ts` → `use-field-validation.service.ts`)
- Each page's test files move into a `tests/` subfolder within the page folder
- Update path aliases if needed
- `profile-section.tsx` and `security-section.tsx` are only used by the settings page → move to `pages/settings/`

## Phase 2: Extract Shared Components

### ScopeFilter

**File:** `shared/scope-filter.tsx`

Replaces the duplicated All/Personal/Household tablist pattern. Used on:
- Pantry items view (filter tabs)
- Pantry stores view (new — being added as part of bug fix list)
- Add trip items page (source filter)

**Props:**
```typescript
interface ScopeFilterProps {
  value: string
  onChange: (value: string) => void
  households: Array<{ id: string; name: string | null }> | undefined
}
```

Renders a `role="tablist"` with All, Personal, and one button per household. Handles its own sorting of households alphabetically via the sort utility.

### StoreFilter

**File:** `shared/store-filter.tsx`

Replaces the duplicated store tablist pattern. Used on:
- Add trip items page (store filter)

**Props:**
```typescript
interface StoreFilterProps {
  value: string
  onChange: (value: string) => void
  stores: Array<{ id: string; name: string }>
  storeDisplayNames: Map<string, string>
}
```

Renders a `role="tablist"` with All and one button per store. Handles its own sorting of stores alphabetically via the sort utility.

### Sort Utilities

**Files:** `utils/sort-households.ts`, `utils/sort-stores.ts`, `utils/sort-items.ts`

Pure functions used by both filter components and page views.

```typescript
/* sort-households.ts */
/* Sorts households alphabetically by name. Personal-first ordering is a display concern handled by the consuming component, not this utility. */
export const sortHouseholds = <T extends { name: string | null }>(households: T[]): T[]

/* sort-stores.ts */
export const sortStores = <T extends { name: string }>(stores: T[]): T[]

/* sort-items.ts */
export const sortItems = <T extends { name: string }>(items: T[]): T[]
```

All use `localeCompare` and return new arrays (no mutation).

### SectionHeader

**File:** `shared/section-header.tsx`

Replaces the 9 duplicated section divider patterns.

**Props:**
```typescript
interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
}
```

Renders:
```tsx
<div className="flex items-center gap-2.5 mb-3">
  <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">{title}</span>
  <span className="flex-1 h-px bg-navy/8" />
  {action}
</div>
```

The `action` prop handles the Completed section's chevron toggle, member count badges, etc.

### FormField

**File:** `shared/form-field.tsx`

Replaces 15+ duplicated label + input + error patterns.

**Props:**
```typescript
interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}
```

Renders the label with proper styling (coral when error, navy-soft otherwise), wraps children (the input), and conditionally renders the error message. The input itself is passed as `children` so the component doesn't need to know about input types, select elements, or ScopeSelect.

### ActionCancelFormButtons

**File:** `shared/action-cancel-form-buttons.tsx`

Replaces 11 duplicated Cancel/Submit button pairs.

**Props:**
```typescript
interface ActionCancelFormButtonsProps {
  onCancel: () => void
  submitLabel: string
  isPending: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
  onSubmit?: () => void
}
```

Renders the `flex gap-3` container with Cancel button (bg-bg-warm styling) and Submit button (teal with Spinner when pending). The `type` prop defaults to `'submit'` for form submissions, `'button'` for non-form actions (like TripCard's save).

### PasswordCriteria

**File:** `shared/password-criteria.tsx`

Replaces the duplicated password requirement checks in register-page and security-section.

**Props:**
```typescript
interface PasswordCriteriaProps {
  password: string
}
```

Computes `hasMinLength`, `hasUppercase`, `hasNumber` internally and renders the checklist with ✓/○ indicators.

## Phase 3: Extract Forms

Per architecture rules: forms live in their own file, Create and Edit colocate.

### Pantry Item Forms

**File:** `pages/pantry/pantry-item-form.tsx`

Extract from `pantry-items-view.tsx`:
- Create form (currently inline, ~80 lines)
- Edit form (currently `renderEditForm`, ~80 lines)

Both share the same fields (name, scope, notes, default store). The component takes props for initial values, onSubmit, onCancel, and isPending.

### Pantry Store Forms

**File:** `pages/pantry/pantry-store-form.tsx`

Extract from `pantry-stores-view.tsx`:
- Create form
- Edit form

Same pattern — both share name + scope fields.

### Trip Create Form

**File:** `pages/shopping/trip-create-form.tsx`

Extract from `shopping-page.tsx`:
- The trip name form that appears when "Plan a new trip" is clicked

## Phase 4: Dead Code Audit

After all restructuring and extractions:
- Remove unused imports across all files
- Remove functions/variables that are no longer referenced
- Remove stale close-on-outside-click handlers that were replaced by DropdownMenu
- Fix ScopeSelect's missing escape key handler
- Remove any orphaned test files or test utilities
- Run TypeScript check (`npx tsc -b --noEmit`) to catch unreferenced code
- Run ESLint to catch unused variables
