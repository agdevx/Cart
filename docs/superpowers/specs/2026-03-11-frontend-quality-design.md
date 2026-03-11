# Frontend Quality Design

## Overview

Three targeted improvements to frontend reliability and usability: field-level form validation, a top-level React error boundary, and accessibility fixes. No new libraries except `react-error-boundary`.

## Current State

- **Form validation**: HTML5 `required`/`type` attributes with browser-native tooltips. Backend-specific errors (duplicate email) surface as generic toasts. Password requirements checklist exists on register page only.
- **Error boundaries**: None. A component render error crashes the entire app to a white screen.
- **Accessibility**: Generally decent — semantic HTML, focus states on inputs, `useFocusTrap` on ConfirmDialog, Escape key handling on modals and kebab menus. Gaps: some icon-only buttons lack `aria-label`, no skip-to-content link.

## Component Designs

### 1. Field-Level Form Validation

#### Forms in Scope

| Form | Location | Fields |
|------|----------|--------|
| Register | `register-page.tsx` | name, email, password, confirm password |
| Login | `login-page.tsx` | email, password |
| Profile edit | `profile-section.tsx` | name, email, current password (conditional) |
| Password change | `security-section.tsx` | current password, new password, confirm password |
| Create/edit household | `create-household-page.tsx`, inline edit | household name |
| Create/edit trip | `shopping-page.tsx` inline form | trip name |
| Create/edit store | `pantry-stores-view.tsx` inline form | store name |
| Create/edit inventory item | `pantry-items-view.tsx` inline form | item name |

#### Validation Rules

Rules mirror the backend DTO validation attributes for consistency:

| Field | Rules |
|-------|-------|
| Email | Required, valid email format, max 254 chars |
| Password | Required, 8–128 chars, at least 1 uppercase letter, at least 1 digit |
| Confirm password | Required, must match password field |
| User name | Required, max 64 chars |
| Household name | Required, max 100 chars |
| Store name | Required, max 100 chars |
| Inventory item name | Required, max 200 chars |
| Trip name | Required (no max length on backend DTO) |

#### Behavior Model

- **Validate on blur** — errors appear when the user leaves a field, not while typing
- **Re-validate on change after error** — once a field shows an error, validate on each keystroke so the error clears as the user fixes it
- **Validate all on submit** — catches anything the user skipped. Backend-specific errors (e.g., duplicate email returning `errorCode: "DUPLICATE_EMAIL"`) display inline on the relevant field
- **Never validate on first keystroke** — don't show errors before the user has finished entering a value
- **Submit button disabled** until all visible required fields pass client-side validation

#### Visual Treatment

- **Error state**: 2px coral border on the input, label text turns coral, error message in `text-sm text-coral` below the input with `mt-1`
- **Valid state**: 2px teal border on the input (subtle positive confirmation). Only shown on fields that have been touched/blurred.
- **Untouched state**: Default `border-navy/10` styling (no validation indicators)
- **Password requirements checklist**: Already exists on register page. Extend to the security section's new password field. Format: `✓`/`○` prefix with `text-teal`/`text-coral` color per requirement.

#### Implementation

**New hook: `useFieldValidation`** (`hooks/use-field-validation.ts`)

Takes a validation schema object mapping field names to arrays of validation functions. Returns:
- `errors: Record<string, string>` — current error messages per field
- `touched: Record<string, boolean>` — which fields have been blurred
- `handleBlur(fieldName)` — blur handler that triggers validation
- `handleChange(fieldName, value)` — change handler that re-validates if field has an error
- `validateAll(): boolean` — validates all fields, returns true if all pass
- `setFieldError(fieldName, message)` — for injecting backend errors
- `isValid: boolean` — whether **all** required fields have values and pass validation (not just touched ones). This drives submit button disabling — a form with untouched empty required fields is not valid.

**Shared validation rules** (`utils/validation-rules.ts`)

Reusable validation functions so register and settings stay in sync:
- `isRequired(fieldName)` — returns error if empty
- `isEmail()` — returns error if not valid email format
- `maxLength(n)` — returns error if exceeds length
- `minLength(n)` — returns error if under length
- `matchesField(otherFieldName)` — factory that returns a validator for confirm password. Validators receive `(value, allValues)` as arguments, so `matchesField('password')` can check `allValues.password` at validation time.
- `passwordStrength()` — checks uppercase + digit requirements

All validation functions follow the signature `(value: string, allValues: Record<string, string>) => string | null`, returning an error message or null. This lets cross-field validators like `matchesField` access other field values at validation time.

No external validation library. The form count is small and rules are straightforward.

### 2. Top-Level Error Boundary

#### Dependency

Install `react-error-boundary` — provides `ErrorBoundary` component with hooks-based API, avoiding class components.

#### Fallback UI

**New component: `ErrorFallback`** (`pages/components/error-fallback.tsx`)

Centered card matching the app's existing design language:
- White surface card (`bg-surface rounded-2xl shadow-md p-8 max-w-md`)
- Lucide `AlertTriangle` icon in coral
- Heading: "Something went wrong" (`font-display font-extrabold text-navy`)
- Subtitle: "An unexpected error occurred. Try reloading the page." (`text-text-secondary text-sm`)
- "Reload" button (teal primary style, calls `window.location.reload()`)
- "Go Home" text link below (navigates to `/`, styled as `text-teal hover:text-teal-light`)

#### Placement

In `app.tsx`, the ErrorBoundary wraps `AppRoutes` **inside** `BrowserRouter`, but remains a child of `AuthProvider` and `QueryClientProvider`. Nesting order:

```
Toaster → QueryClientProvider → AuthProvider → BrowserRouter → ErrorBoundary → AppRoutes
```

This means auth and query contexts survive the crash, and the boundary has access to React Router's `useLocation()` for reset behavior. The error boundary catches render errors from any page component.

#### Error Logging

`onError` callback logs to `console.error`. No external error reporting service — that's a production readiness concern outside this spec's scope.

#### Reset Behavior

Use `react-error-boundary`'s `resetKeys` prop with the current pathname from `useLocation()`. When the user navigates to a different route (via "Go Home" or browser back), the changed pathname in `resetKeys` clears the error state automatically. This works because the ErrorBoundary is inside `BrowserRouter` and can access the router context.

### 3. Targeted Accessibility Fixes

#### Skip-to-Content Link

**Location**: Top of `app.tsx`, before all other content.

**Behavior**: Visually hidden by default (`sr-only`). Becomes visible when focused via keyboard tab. Jumps focus to `#main-content` (an `id` added to the route outlet wrapper).

**Styling**: When focused — `fixed top-2 left-2 z-50 bg-teal text-white px-4 py-2 rounded-xl font-display font-bold focus:not-sr-only`. Disappears on blur.

#### Aria-Labels on Icon-Only Buttons

Audit and add `aria-label` to every button that contains only a Lucide icon with no visible text. Expected targets:

| Component | Button | Label |
|-----------|--------|-------|
| `trip-item-row.tsx` | Kebab menu trigger | "Item options" |
| `trip-card.tsx` | Kebab menu trigger | "Trip options" |
| `pantry-stores-view.tsx` | Kebab menu trigger | "Store options" |
| `pantry-items-view.tsx` | Kebab menu trigger | "Item options" |
| `confirm-dialog.tsx` | N/A — has text buttons, verify during audit | — |
| Various | Any other icon-only buttons found during audit | Descriptive action label |

The exact list will be confirmed during implementation by grepping for icon-only button patterns.

#### Modal Focus & ARIA Verification

Verify `ConfirmDialog`'s existing `useFocusTrap` implementation:
- Focus moves into the dialog on open
- Focus returns to the trigger element on close
- Tab cycles within the dialog (no escape to background)
- Escape key dismisses the dialog

Also verify that `ConfirmDialog` has `role="dialog"` and `aria-modal="true"` attributes. If missing, add them — this is the natural place since we're already touching this component for accessibility.

No major new implementation expected. If the existing implementation has gaps, fix them. Document findings either way.

## Testing Strategy

- **`useFieldValidation` hook**: Unit tests covering blur triggers, change-after-error clearing, validateAll, setFieldError, each validation rule function
- **Form integration**: Update existing page tests (register, login, settings) to verify inline error display on blur and clearing on fix
- **ErrorFallback component**: Unit test rendering the fallback, clicking Reload, clicking Go Home
- **Error boundary integration**: Test that a throwing component renders the fallback instead of crashing
- **Accessibility**: Verify skip link is visible on focus and navigates correctly. Verify aria-labels are present on icon-only buttons. Verify ConfirmDialog focus trap behavior.

## Out of Scope

- Validation library (Zod, Yup, React Hook Form) — overkill for current form count
- WCAG 2.1 AA full audit — separate initiative
- Accessibility linting (`eslint-plugin-jsx-a11y`) — can be added later independently
- External error reporting (Sentry, etc.) — production readiness concern
- E2E test updates — existing Playwright integration tests cover the real flows
