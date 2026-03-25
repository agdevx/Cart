# App Improvements Round 3

## Design Spec


## Overview

14 frontend tasks across 6 chunks focusing on infrastructure cleanup, UI consistency, shopping list polish, accordion behavior fixes, trip features, and animation polish. Task #2 (store scoping rearchitecture) is deferred.

## Chunk 1 — Infrastructure & Global Layout

### Task #1: Centralized routes.ts

Create `frontend/src/routes.ts` exporting all route path constants and parameterized path helpers.

```ts
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PANTRY: '/pantry',
  PANTRY_ADD: '/pantry/add',
  SHOPPING: '/shopping',
  TRIP_DETAIL: '/shopping/:tripId',
  TRIP_ADD_ITEMS: '/shopping/:tripId/add-items',
  ACTIVE_TRIP: '/shopping/:tripId/active',
  HOUSEHOLD: '/household',
  HOUSEHOLD_CREATE: '/household/create',
  HOUSEHOLD_JOIN: '/household/join',
  HOUSEHOLD_DETAIL: '/household/:id',
  SETTINGS: '/settings',
} as const

export const tripDetailPath = (tripId: string) => `/shopping/${tripId}`
export const tripAddItemsPath = (tripId: string) => `/shopping/${tripId}/add-items`
export const activeTripPath = (tripId: string) => `/shopping/${tripId}/active`
export const householdDetailPath = (id: string) => `/household/${id}`
```

Replace all hardcoded route strings across `app.tsx`, `navigate()` calls, and link targets.

### Task #13: Reduce Top Spacing by Half

All page headers currently use `pt-14` (56px). Change to `pt-7` (28px). Also reduce `pb-8` to `pb-4` proportionally.

Pages that adopt the `PageHeader` component (Task #14) get this automatically. Pages with non-standard header structures (e.g., `add-trip-items-page.tsx` with its back button, `active-trip-page.tsx`) should have their `pt-14` manually adjusted to `pt-7` without adopting `PageHeader`.

### Task #14: User Name in Page Header

Create a shared `PageHeader` component at `pages/components/page-header.tsx`:

```tsx
<div className="px-5 pt-7 pb-4 flex items-end justify-between">
  <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
    {children}
  </h1>
  <span className="text-lg text-text-secondary font-semibold">{userName}</span>
</div>
```

- User name sourced from `useAuth().user.name`
- Fallback: if `user.name` is null or empty, display nothing (omit the name span entirely)
- 18px (`text-lg`) semibold, `text-text-secondary` color
- Right-aligned, baseline-aligned with the title
- Appears on all authenticated pages including trip-name pages

Pages with standard headers (Pantry, Shopping, Household, Settings, Trip Detail) replace their inline header markup with `<PageHeader>`. Pages with non-standard headers (Add Items, Active Trip) do not use `PageHeader` — they just get spacing adjusted per Task #13.

### Task #8: Standardize Button Layout (includes Task #3)

All action/cancel button pairs become side-by-side, 50/50 width, cancel left, action right:

```tsx
<div className="flex gap-3 pt-2">
  <button className="flex-1 ...cancel-styles...">Cancel</button>
  <button className="flex-1 ...action-styles...">Save</button>
</div>
```

Affected locations (full audit):
- ConfirmDialog (already side-by-side, just needs flex-1 on both)
- TripItemRow inline edit form
- Pantry inline add item form
- Pantry inline edit item form
- Pantry inline add store form
- Pantry inline edit store form
- Create trip form
- Create household page
- Join household page

Note: Login and Register pages only have a single submit button (no cancel), so they are not affected by this audit.

Task #3 (unify pantry add/edit button styling) is absorbed into this audit.

## Chunk 2 — Pantry Form Consistency

Task #3 is merged into Task #8 above. No separate work needed.

## Chunk 3 — Trip Shopping List: Notes & Styling

All changes are within the `TripItemRow` component (`pages/components/trip-item-row.tsx`).

### Task #5: Label Notes

Add distinct labels before each note's text:
- Pantry-level notes → "Pantry Notes:"
- Trip-level notes → "Shopping Notes:"

### Task #6: Normalize Text Sizes

Quantity, Pantry Notes, and Shopping Notes all use the same text size (13px / `text-sm`), matching current quantity size. Labels are italicized:

```tsx
<div className="text-sm text-text-secondary mt-1">
  <span className="italic text-text-tertiary">Qty:</span> {quantity}
</div>
<div className="text-sm text-text-secondary mt-0.5">
  <span className="italic text-text-tertiary">Pantry Notes:</span> {pantryNotes}
</div>
<div className="text-sm text-text-secondary mt-0.5">
  <span className="italic text-text-tertiary">Shopping Notes:</span> {shoppingNotes}
</div>
```

### Task #7: Hide Notes in Edit Mode

When `isEditing` is true, the notes display section (Qty, Pantry Notes, Shopping Notes) is hidden. The user sees them in the form inputs instead. The edit form's notes field is labeled "Shopping Notes" to clarify which notes are being edited.

## Chunk 4 — Trip Accordions

### Task #4: Default Accordion State by View Context

The `useStoreAccordionState` hook gains a `viewContext` parameter (`'planning' | 'shopping'`) that controls both the localStorage key and the default state.

- localStorage key format: `accordion-{tripId}-{viewContext}` (replaces current `trip-accordion-{tripId}`)
- Planning view (`viewContext: 'planning'`): defaults to all expanded (`expandedStores[storeName] ?? true`)
- Shopping view (`viewContext: 'shopping'`): defaults to all collapsed (`expandedStores[storeName] ?? false`)
- `TripDetailPage` calls the hook with `'planning'`; `ActiveTripPage` calls it with `'shopping'`

Persistence still applies: user overrides are remembered per view independently.

### Task #9: Bug — Fully-Checked Accordion Not Expandable

The auto-collapse logic currently locks the accordion when all items are checked. Fix:

- Track a `userOverride` flag per accordion group (ephemeral — React state only, not persisted to localStorage; resets on page navigation, which is acceptable since auto-collapse is a convenience)
- Auto-collapse only fires if the user hasn't manually toggled that group during this session
- The accordion header remains clickable at all times regardless of checked state
- User manually expanding a fully-checked group sets the override, preventing auto-collapse from re-collapsing it

### Accordion Cleanup on Trip Completion

When a trip is completed, delete its localStorage keys (using the key format established in Task #4):
- `accordion-{tripId}-planning`
- `accordion-{tripId}-shopping`

This prevents unbounded localStorage growth over time.

## Chunk 5 — Trip Features

### Task #10: Read-Only View for Completed Trips

Two changes required:

**Entry point — TripCard:** Currently, completed trips render as a static `<div>` with `opacity-60`. Change completed trips to be a clickable `<Link>` to `/shopping/{tripId}`, same as non-completed trips. Keep the visual muting (opacity) to distinguish them.

**Destination — TripDetailPage:** The page detects `trip.isCompleted` and renders in read-only mode:

- No "Add Items" button
- No kebab menus on item rows
- No "Start Shopping" / "Continue Shopping" button
- Store accordions render normally (all expanded by default)
- TripItemRow renders without `onDelete`, `onUpdate`, or `onToggleCheck` handlers

The same `TripDetailPage` component handles both modes — no new page needed.

### Task #11: Trip "Edit" Replaces "Rename"

In the `TripCard` kebab menu:
- "Rename" option becomes "Edit"
- Instead of an inline text input, expands into a full edit form:
  - Name input (pre-filled with current trip name)
  - ScopeSelect dropdown (pre-filled with current scope — personal or household)
  - Cancel / Save buttons (side-by-side per Task #8)

**Backend changes required:** The current `UpdateTripRequest` DTO only has a `Name` field. Extend it to include an optional `HouseholdId` field to support scope changes:
- Add `Guid? HouseholdId` to `UpdateTripRequest`
- Update `TripService.UpdateTrip` to handle scope changes (set/clear `HouseholdId`)
- Validate: if setting `HouseholdId`, verify the user is a member of that household
- Update the frontend mutation to send `householdId` alongside `name`

### Task #15: Inline Store Selection on Add Items Page

The Add Items page (`add-trip-items-page.tsx`) already has a store dropdown for selected items. This task **redesigns the layout** of the existing store selection:

**Current layout:** Store dropdown and quantity appear as separate inline elements next to the item name on the same row.

**New layout:** When an item is checked:
- A second row appears below the item name, indented past the checkbox (48px left padding)
- Contains: store dropdown (flex-1) + quantity input (fixed width), side by side
- Store dropdown defaults to the item's `DefaultStoreId` from the pantry inventory; falls back to "Any Store"
- "Any Store" option maps to `storeId: null`
- The dropdown is full-width minus the quantity input for good mobile tap targets
- Increased minimum height on the store dropdown for better mobile tap targets (min-h-[38px])
- Source filter tabs (All | Personal | Household) remain unchanged at the top

## Chunk 6 — UI Polish

### Task #12: Smooth Hold-to-Confirm Progress Bar

Replace the JS-interval-based progress bar with a CSS transition approach:

- `pointerdown`: Apply a CSS class that sets `transition: width {holdDuration}ms linear` and `width: 100%`
- `pointerup` / `pointerleave` / `pointercancel`: Remove the class, width returns to 0%
- `transitionend`: Fire the confirm callback (hold completed). Filter by `event.propertyName === 'width'` to avoid premature firing from other transitions (e.g., `transition-colors` on the button)
- No JS interval or requestAnimationFrame needed

The `holdDuration` prop on ConfirmDialog controls the CSS transition duration. The result is a perfectly smooth, jitter-free progress fill.

## Out of Scope

- **Task #2**: Store scoping across personal/household contexts — deferred for further design thinking

## Implementation Plan


> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 14 UI/UX improvements across infrastructure, layout, trip features, and polish for the AGDevX.Cart app.

**Architecture:** Frontend-heavy round — 13 of 14 tasks are pure frontend. Task #11 requires a small backend change (add `HouseholdId` to `UpdateTripRequest`). Changes are organized into 6 chunks that can largely be executed independently, though Chunk 1 (routes, PageHeader, button standardization) should go first as it establishes patterns used by later chunks.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, React Router 6, Jotai, .NET 8 (backend)

**Spec:** `docs/superpowers/specs/2026-03-09-app-improvements-round3-design.md`

---

## Chunk 1: Infrastructure & Global Layout (Tasks #1, #13, #14, #8, #3)

### Task 1: Centralized routes.ts

**Files:**
- Create: `frontend/src/routes.ts`
- Modify: `frontend/src/app.tsx`
- Modify: Every file that uses hardcoded route strings (navigate, Link to=, etc.)

- [ ] **Step 1: Create `frontend/src/routes.ts`**

```ts
// ABOUTME: Centralized route path constants and parameterized path helpers
// ABOUTME: All route strings should be imported from here, never hardcoded

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PANTRY: '/pantry',
  SHOPPING: '/shopping',
  TRIP_DETAIL: '/shopping/:tripId',
  TRIP_ADD_ITEMS: '/shopping/:tripId/add-items',
  ACTIVE_TRIP: '/shopping/:tripId/active',
  HOUSEHOLD: '/household',
  HOUSEHOLD_CREATE: '/household/create',
  HOUSEHOLD_JOIN: '/household/join',
  HOUSEHOLD_DETAIL: '/household/:id',
  SETTINGS: '/settings',
} as const

export const tripDetailPath = (tripId: string) => `/shopping/${tripId}`
export const tripAddItemsPath = (tripId: string) => `/shopping/${tripId}/add-items`
export const activeTripPath = (tripId: string) => `/shopping/${tripId}/active`
export const householdDetailPath = (id: string) => `/household/${id}`
```

- [ ] **Step 2: Update `frontend/src/app.tsx` route definitions**

Replace hardcoded path strings in `<Route path="...">` elements with `ROUTES.*` constants:

```tsx
import { ROUTES } from '@/routes'

// In AppRoutes:
<Route path={ROUTES.LOGIN} element={<LoginPage />} />
<Route path={ROUTES.REGISTER} element={<RegisterPage />} />
<Route path={ROUTES.PANTRY} element={...} />
<Route path={ROUTES.SHOPPING} element={...} />
<Route path={ROUTES.TRIP_DETAIL} element={...} />
<Route path={ROUTES.TRIP_ADD_ITEMS} element={...} />
<Route path={ROUTES.ACTIVE_TRIP} element={...} />
<Route path={ROUTES.HOUSEHOLD} element={...} />
<Route path={ROUTES.HOUSEHOLD_CREATE} element={...} />
<Route path={ROUTES.HOUSEHOLD_JOIN} element={...} />
<Route path={ROUTES.HOUSEHOLD_DETAIL} element={...} />
<Route path={ROUTES.SETTINGS} element={...} />
<Route path="/" element={<Navigate to={ROUTES.SHOPPING} replace />} />
```

- [ ] **Step 3: Update all `navigate()` calls and `<Link to="">` across the codebase**

Search for all hardcoded route strings and replace with constants/helpers. Key files:

| File | Current | Replacement |
|------|---------|-------------|
| `shopping-page.tsx:52` | `navigate(\`/shopping/${newTrip.id}\`)` | `navigate(tripDetailPath(newTrip.id))` |
| `trip-detail-page.tsx:87-88` | `navigate('/shopping')` | `navigate(ROUTES.SHOPPING)` |
| `trip-detail-page.tsx:53` | `navigate(\`/shopping/${tripId}/active\`)` | `navigate(activeTripPath(tripId!))` |
| `trip-detail-page.tsx:114` | `navigate(\`/shopping/${tripId}/add-items\`)` | `navigate(tripAddItemsPath(tripId!))` |
| `active-trip-page.tsx:120` | `navigate('/shopping')` | `navigate(ROUTES.SHOPPING)` |
| `active-trip-page.tsx:150` | `navigate(\`/shopping/${tripId}\`)` | `navigate(tripDetailPath(tripId!))` |
| `add-trip-items-page.tsx:131` | `navigate(\`/shopping/${tripId}\`)` | `navigate(tripDetailPath(tripId!))` |
| `add-trip-items-page.tsx:164` | `navigate(\`/shopping/${tripId}\`)` | `navigate(tripDetailPath(tripId!))` |
| `trip-card.tsx:188` | `to={\`/shopping/${trip.id}\`}` | `to={tripDetailPath(trip.id)}` |
| `household-page.tsx:53,69,76` | `to="/household/${household.id}"`, `to="/household/create"`, `to="/household/join"` | `to={householdDetailPath(household.id)}`, `to={ROUTES.HOUSEHOLD_CREATE}`, `to={ROUTES.HOUSEHOLD_JOIN}` |
| `household-detail-page.tsx:102,116,145` | `navigate('/household')` | `navigate(ROUTES.HOUSEHOLD)` |
| `create-household-page.tsx:24,66` | `navigate('/household')` | `navigate(ROUTES.HOUSEHOLD)` |
| `join-household-page.tsx:24,67` | `navigate('/household')` | `navigate(ROUTES.HOUSEHOLD)` |
| `bottom-nav.tsx` tabs array | `path: '/pantry'`, etc. | `path: ROUTES.PANTRY`, etc. |
| `login-page.tsx` | `navigate('/shopping')`, `to="/register"` | `navigate(ROUTES.SHOPPING)`, `to={ROUTES.REGISTER}` |
| `register-page.tsx` | `navigate('/shopping')`, `to="/login"` | `navigate(ROUTES.SHOPPING)`, `to={ROUTES.LOGIN}` |

- [ ] **Step 4: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes.ts frontend/src/
git commit -m "refactor: centralize route paths into routes.ts"
```

---

### Task 2: PageHeader Component + Reduced Spacing (Tasks #13, #14)

**Files:**
- Create: `frontend/src/pages/components/page-header.tsx`
- Modify: `frontend/src/pages/pantry-page.tsx` (lines 22-27)
- Modify: `frontend/src/pages/shopping-page.tsx` (lines 86-91)
- Modify: `frontend/src/pages/household-page.tsx` (lines 41-46)
- Modify: `frontend/src/pages/settings-page.tsx` (lines 12-17)
- Modify: `frontend/src/pages/trip-detail-page.tsx` (lines 84, 93)
- Modify: `frontend/src/pages/active-trip-page.tsx` (lines 128, 136, 147, 156)
- Modify: `frontend/src/pages/add-trip-items-page.tsx` (lines 146, 154, 161)
- Modify: `frontend/src/pages/create-household-page.tsx` (line 31-32)
- Modify: `frontend/src/pages/join-household-page.tsx` (line 31-32)
- Modify: `frontend/src/pages/household-detail-page.tsx` (lines 134, 141)

- [ ] **Step 1: Create `frontend/src/pages/components/page-header.tsx`**

```tsx
// ABOUTME: Shared page header with title and user name display
// ABOUTME: Used on all standard authenticated pages for consistent layout

import { useAuth } from '@/auth/use-auth'

interface PageHeaderProps {
  children: React.ReactNode
}

export const PageHeader = ({ children }: PageHeaderProps) => {
  const { user } = useAuth()

  return (
    <div className="px-5 pt-7 pb-4 flex items-end justify-between">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
        {children}
      </h1>
      {user?.name && (
        <span className="text-lg text-text-secondary font-semibold pb-0.5">
          {user.name}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update standard pages to use PageHeader**

Replace inline headers on pages with standard title patterns:

**`pantry-page.tsx`** — Replace lines 22-27:
```tsx
// Before:
<div className="px-5 pt-14 pb-4">
  <div className="flex justify-between items-center mb-4">
    <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
      Your <span className="text-teal">Pantry</span>
    </h1>
  </div>

// After:
<div className="pb-4">
  <PageHeader>Your <span className="text-teal">Pantry</span></PageHeader>
```

Remove the outer `px-5 pt-14` from the root div (PageHeader provides px-5 pt-7). Add `px-5` to the content below the header that needs it.

**`shopping-page.tsx`** — Replace lines 86-91:
```tsx
// Before:
<div className="px-5 pt-14 pb-4">
  <div className="flex justify-between items-center mb-6">
    <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
      Your <span className="text-teal">Trips</span>
    </h1>
  </div>

// After:
<div className="pb-4">
  <PageHeader>Your <span className="text-teal">Trips</span></PageHeader>
  <div className="px-5">
```

**`household-page.tsx`** — Replace lines 41-46:
```tsx
// Before:
<div className="px-5 pt-14 pb-4">
  <div className="mb-6">
    <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
      Your <span className="text-teal">Household</span>
    </h1>
  </div>

// After:
<div className="pb-4">
  <PageHeader>Your <span className="text-teal">Household</span></PageHeader>
  <div className="px-5">
```

**`settings-page.tsx`** — Replace lines 12-17:
```tsx
// Before:
<div className="px-5 pt-14 pb-4">
  <div className="mb-6">
    <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
      Settings
    </h1>
  </div>

// After:
<div className="pb-4">
  <PageHeader>Settings</PageHeader>
  <div className="px-5">
```

**`trip-detail-page.tsx`** — Replace line 84 `pt-14` with `pt-7`. This page has a back button so it does NOT use PageHeader, just adjusted spacing.

**`create-household-page.tsx`** — Replace line 31 `pt-14` with `pt-7`.

**`join-household-page.tsx`** — Replace line 31 `pt-14` with `pt-7`.

**`household-detail-page.tsx`** — Replace line 141 `pt-14` with `pt-7`. Also replace loading state line 134 `pt-14` with `pt-7`.

- [ ] **Step 3: Update non-standard pages (spacing only, no PageHeader)**

These pages have back buttons or custom headers — just reduce `pt-14` → `pt-7`:

**`active-trip-page.tsx`** — lines 128, 136, 147: replace `pt-14` with `pt-7`

**`add-trip-items-page.tsx`** — lines 146, 154, 161: replace `pt-14` with `pt-7`

- [ ] **Step 4: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: add PageHeader component and reduce top spacing across all pages"
```

---

### Task 3: Standardize Button Layout (Tasks #8 + #3)

**Files:**
- Modify: `frontend/src/pages/components/confirm-dialog.tsx` (lines 69-96)
- Modify: `frontend/src/pages/components/trip-item-row.tsx` (lines 319-334)
- Modify: `frontend/src/pages/pantry-items-view.tsx` (lines 252-258 create form, lines 338-353 edit form)
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (lines 191-206 edit form, lines 256-262 create form)
- Modify: `frontend/src/pages/shopping-page.tsx` (lines 134-140 create form)
- Modify: `frontend/src/pages/create-household-page.tsx` (lines 56-71)
- Modify: `frontend/src/pages/join-household-page.tsx` (lines 56-71)
- Modify: `frontend/src/pages/household-detail-page.tsx` (lines 360-379)

- [ ] **Step 1: Update ConfirmDialog buttons**

In `confirm-dialog.tsx`, replace lines 69-96. Change `<div className="flex gap-2 justify-end">` to side-by-side flex-1:

```tsx
<div className="flex gap-3">
  <button
    onClick={onCancel}
    className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
  >
    {cancelLabel || 'Cancel'}
  </button>
  {holdDuration ? (
    <button
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      disabled={isPending}
      className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
    >
      {confirmLabel}
    </button>
  ) : (
    <button
      onClick={onConfirm}
      disabled={isPending}
      className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
    >
      {confirmLabel}
    </button>
  )}
</div>
```

- [ ] **Step 2: Update TripItemRow EditForm buttons**

In `trip-item-row.tsx`, replace lines 319-334. Change from save-left/cancel-right to cancel-left/save-right with flex-1:

```tsx
<div className="flex gap-3 pt-1">
  <button
    onClick={onCancel}
    disabled={isUpdating}
    className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    onClick={onSave}
    disabled={isUpdating}
    className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-teal hover:bg-teal-light disabled:opacity-50 transition-colors"
  >
    {isUpdating ? 'Saving...' : 'Save'}
  </button>
</div>
```

- [ ] **Step 3: Update PantryItemsView create form buttons**

In `pantry-items-view.tsx`, replace lines 252-258. Change from single full-width submit to side-by-side:

```tsx
<div className="flex gap-3">
  <button
    type="button"
    onClick={onCloseCreateForm}
    className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={createMutation.isPending || !itemName.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {createMutation.isPending ? 'Creating...' : 'Create'}
  </button>
</div>
```

- [ ] **Step 4: Update PantryItemsView edit form buttons**

The edit form at lines 338-353 already has `flex gap-3` with `flex-1` buttons. Just verify order is cancel-left, save-right. Currently it's cancel-left, save-right — already correct. No change needed.

- [ ] **Step 5: Update PantryStoresView edit form buttons**

In `pantry-stores-view.tsx`, lines 191-206 currently has Save-left, Cancel-right. Swap the order to Cancel-left, Save-right:

```tsx
<div className="flex gap-3">
  <button
    onClick={handleCancelEdit}
    disabled={updateMutation.isPending}
    className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-display font-bold hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    onClick={handleSaveEdit}
    disabled={updateMutation.isPending || !editingName.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {updateMutation.isPending ? 'Saving...' : 'Save'}
  </button>
</div>
```

- [ ] **Step 6: Update PantryStoresView create form buttons**

In `pantry-stores-view.tsx`, lines 256-262. Change from single full-width submit to side-by-side:

```tsx
<div className="flex gap-3">
  <button
    type="button"
    onClick={() => setShowCreateForm(false)}
    className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-display font-bold hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={createMutation.isPending || !storeName.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {createMutation.isPending ? 'Creating...' : 'Create'}
  </button>
</div>
```

- [ ] **Step 7: Update ShoppingPage create trip form buttons**

In `shopping-page.tsx`, lines 134-140. Change from single full-width submit to side-by-side:

```tsx
<div className="flex gap-3">
  <button
    type="button"
    onClick={() => setShowCreateForm(false)}
    className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={createMutation.isPending || !tripName.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {createMutation.isPending ? 'Creating...' : 'Create Trip'}
  </button>
</div>
```

- [ ] **Step 8: Update CreateHouseholdPage buttons**

In `create-household-page.tsx`, replace lines 56-71. Change from stacked `space-y-2` to side-by-side:

```tsx
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
    disabled={createMutation.isPending || !name.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {createMutation.isPending ? 'Creating...' : 'Create Household'}
  </button>
</div>
```

- [ ] **Step 9: Update JoinHouseholdPage buttons**

In `join-household-page.tsx`, replace lines 56-71. Same pattern as CreateHouseholdPage:

```tsx
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
    disabled={joinMutation.isPending || !inviteCode.trim()}
    className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
  >
    {joinMutation.isPending ? 'Joining...' : 'Join Household'}
  </button>
</div>
```

- [ ] **Step 10: Update HouseholdDetailPage inline confirmation dialog buttons**

In `household-detail-page.tsx`, lines 360-379 (the custom inline confirmation modal for member actions). Change from `flex gap-2 justify-end` to `flex gap-3` with `flex-1`:

```tsx
<div className="flex gap-3">
  <button
    onClick={() => setConfirmAction(null)}
    className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
  >
    Cancel
  </button>
  <button
    onClick={handleConfirmAction}
    disabled={removeMemberMutation.isPending || transferOwnershipMutation.isPending}
    className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
      confirmAction.type === 'transfer'
        ? 'bg-teal hover:bg-teal-light'
        : 'bg-coral hover:bg-coral/90'
    }`}
  >
    {(removeMemberMutation.isPending || transferOwnershipMutation.isPending)
      ? 'Processing...'
      : 'Confirm'}
  </button>
</div>
```

- [ ] **Step 11: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 12: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: standardize all button pairs to side-by-side cancel-left action-right"
```

---

## Chunk 2: Trip Shopping List Notes & Styling (Tasks #5, #6, #7)

### Task 4: Label & Normalize Notes in TripItemRow

**Files:**
- Modify: `frontend/src/pages/components/trip-item-row.tsx`

All changes are in `trip-item-row.tsx`. We need to:
1. Add "Pantry Notes:" and "Shopping Notes:" labels
2. Normalize all detail text to `text-sm` (13px)
3. Italicize labels
4. Hide notes when editing
5. Rename the edit form "Notes" label to "Shopping Notes"

- [ ] **Step 1: Update planning variant notes display (lines 103-111)**

Replace lines 103-111 in the planning variant with labeled, normalized notes:

```tsx
{/* Item details — hidden during edit */}
{!editing && (
  <>
    <p className="text-sm text-text-secondary mt-1">
      <span className="italic text-text-tertiary">Qty:</span> {tripItem.quantity}
    </p>
    {tripItem.inventoryItem?.notes && (
      <p className="text-sm text-text-secondary mt-0.5">
        <span className="italic text-text-tertiary">Pantry Notes:</span> {tripItem.inventoryItem.notes}
      </p>
    )}
    {tripItem.notes && (
      <p className="text-sm text-text-secondary mt-0.5">
        <span className="italic text-text-tertiary">Shopping Notes:</span> {tripItem.notes}
      </p>
    )}
  </>
)}
```

- [ ] **Step 2: Update shopping variant notes display (lines 183-191)**

Replace lines 183-191 in the shopping variant with the same labeled, normalized pattern:

```tsx
{/* Item details — hidden during edit */}
{!editing && (
  <>
    <p className="text-sm text-text-secondary mt-0.5">
      <span className="italic text-text-tertiary">Qty:</span> {tripItem.quantity}
    </p>
    {tripItem.inventoryItem?.notes && (
      <p className="text-sm text-text-secondary mt-0.5">
        <span className="italic text-text-tertiary">Pantry Notes:</span> {tripItem.inventoryItem.notes}
      </p>
    )}
    {tripItem.notes && (
      <p className="text-sm text-text-secondary mt-0.5">
        <span className="italic text-text-tertiary">Shopping Notes:</span> {tripItem.notes}
      </p>
    )}
  </>
)}
```

- [ ] **Step 3: Rename edit form "Notes" label to "Shopping Notes"**

In the `EditForm` component, line 293, change the label:

```tsx
// Before:
<label htmlFor="edit-notes" className="block text-xs font-semibold text-text-secondary mb-1">Notes</label>

// After:
<label htmlFor="edit-notes" className="block text-xs font-semibold text-text-secondary mb-1">Shopping Notes</label>
```

- [ ] **Step 4: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/components/trip-item-row.tsx
git commit -m "feat: label notes as Pantry/Shopping Notes, normalize text sizes, hide notes in edit mode"
```

---

## Chunk 3: Trip Accordions (Tasks #4, #9)

### Task 5: Accordion Default State by View Context + Bug Fix

**Files:**
- Modify: `frontend/src/hooks/use-store-accordion-state.ts`
- Modify: `frontend/src/pages/trip-detail-page.tsx` (line 29)
- Modify: `frontend/src/pages/active-trip-page.tsx` (lines 35, 56-61)

- [ ] **Step 1: Rewrite `use-store-accordion-state.ts`**

Replace the entire file with view-context-aware version:

```ts
// ABOUTME: Hook managing accordion expand/collapse state for store-grouped trip items
// ABOUTME: Persists state to localStorage per-trip per-view-context, supports auto-collapse with user override

import { useState, useEffect, useCallback, useRef } from 'react';

type AccordionState = Record<string, boolean>; // storeName -> isExpanded
type ViewContext = 'planning' | 'shopping';

const STORAGE_KEY_PREFIX = 'accordion-';

export function useStoreAccordionState(tripId: string, viewContext: ViewContext, isCompleted: boolean) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tripId}-${viewContext}`;
  const defaultExpanded = viewContext === 'planning'; // planning=expanded, shopping=collapsed

  const [expandedStores, setExpandedStores] = useState<AccordionState>(() => {
    if (isCompleted) return {}; // Completed trips: use defaults
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Track which stores the user has manually toggled (ephemeral, not persisted)
  // Use a ref to avoid destabilizing callback identities
  const userOverridesRef = useRef<Set<string>>(new Set());

  // Keep a ref to expandedStores for use in stable callbacks
  const expandedStoresRef = useRef(expandedStores);
  expandedStoresRef.current = expandedStores;

  // Persist to localStorage (only for non-completed trips)
  useEffect(() => {
    if (!isCompleted) {
      localStorage.setItem(storageKey, JSON.stringify(expandedStores));
    }
  }, [expandedStores, storageKey, isCompleted]);

  const toggleStore = useCallback((storeName: string) => {
    userOverridesRef.current.add(storeName);
    setExpandedStores(prev => ({
      ...prev,
      [storeName]: !(prev[storeName] ?? defaultExpanded),
    }));
  }, [defaultExpanded]);

  const isExpanded = useCallback((storeName: string) => {
    return expandedStores[storeName] ?? defaultExpanded;
  }, [expandedStores, defaultExpanded]);

  // Auto-collapse when all items in a group are checked (only if user hasn't overridden)
  // Uses refs for expandedStores and userOverrides to keep callback identity stable
  // and avoid re-triggering the calling useEffect
  const autoCollapseIfAllChecked = useCallback((storeName: string, allChecked: boolean) => {
    if (allChecked && !userOverridesRef.current.has(storeName) && (expandedStoresRef.current[storeName] ?? defaultExpanded)) {
      setExpandedStores(prev => ({ ...prev, [storeName]: false }));
    }
  }, [defaultExpanded]);

  // Cleanup: remove localStorage entries for both view contexts (call on trip completion)
  const cleanup = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}-planning`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}-shopping`);
  }, [tripId]);

  return { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup };
}
```

- [ ] **Step 2: Update TripDetailPage to pass 'planning' context**

In `trip-detail-page.tsx`, line 29:

```tsx
// Before:
const { isExpanded, toggleStore } = useStoreAccordionState(tripId!, trip?.isCompleted ?? false)

// After:
const { isExpanded, toggleStore } = useStoreAccordionState(tripId!, 'planning', trip?.isCompleted ?? false)
```

- [ ] **Step 3: Update ActiveTripPage to pass 'shopping' context**

In `active-trip-page.tsx`, line 35:

```tsx
// Before:
const { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup } = useStoreAccordionState(tripId!, trip?.isCompleted ?? false)

// After:
const { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup } = useStoreAccordionState(tripId!, 'shopping', trip?.isCompleted ?? false)
```

- [ ] **Step 4: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-store-accordion-state.ts frontend/src/pages/trip-detail-page.tsx frontend/src/pages/active-trip-page.tsx
git commit -m "feat: accordion defaults by view context (planning=expanded, shopping=collapsed) with user override fix"
```

---

## Chunk 4: Trip Features (Tasks #10, #11, #15)

### Task 6: Read-Only View for Completed Trips

**Files:**
- Modify: `frontend/src/pages/components/trip-card.tsx` (lines 168-174)
- Modify: `frontend/src/pages/trip-detail-page.tsx`

- [ ] **Step 1: Make completed trip cards clickable in TripCard**

In `trip-card.tsx`, replace lines 168-174. Change from static `<div>` to a `<Link>`:

```tsx
// Before:
if (trip.isCompleted) {
  return (
    <div className="p-5 bg-surface rounded-2xl shadow-sm opacity-60">
      {cardContent}
    </div>
  )
}

// After:
if (trip.isCompleted) {
  return (
    <Link
      to={tripDetailPath(trip.id)}
      className="block p-5 bg-surface rounded-2xl shadow-sm opacity-60 hover:shadow-md transition-all"
    >
      {cardContent}
    </Link>
  )
}
```

Add imports at top:
```tsx
import { tripDetailPath } from '@/routes'
```

- [ ] **Step 2: Add read-only mode to TripDetailPage**

In `trip-detail-page.tsx`, add a `readOnly` flag based on `trip.isCompleted`:

After the `if (!trip)` check (after line 81), add:
```tsx
const readOnly = trip.isCompleted ?? false
```

Then conditionally render interactive elements:

- Wrap the "Start Shopping" button (lines 96-105) in `{!readOnly && ( ... )}`
- Wrap the "Add Items" button (lines 113-119) in `{!readOnly && ( ... )}`
- Pass `readOnly` to TripItemRow to hide kebab menus. Add optional `readOnly` prop to TripItemRowProps. When `readOnly` is true, don't render the kebab menu `<div className="relative" ref={menuRef}>...` block. Pass `readOnly` at lines 133-141.

- [ ] **Step 3: Add `readOnly` prop to TripItemRow**

In `trip-item-row.tsx`, add to the interface:
```tsx
readOnly?: boolean
```

Add to destructuring:
```tsx
readOnly = false,
```

In the planning variant (lines 113-139), wrap the kebab menu div with `{!readOnly && ( ... )}`.

In the shopping variant (lines 196-228), wrap the kebab menu div with `{!readOnly && ( ... )}`.

When `readOnly` is true, `handleRowClick` should be a no-op (already handled since `onToggleCheck` won't be passed).

- [ ] **Step 4: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/components/trip-card.tsx frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/trip-detail-page.tsx
git commit -m "feat: add read-only view for completed trips"
```

---

### Task 7: Trip Edit Form (Task #11)

**Files:**
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs` (line 13)
- Modify: `backend/AGDevX.Cart.Services/TripService.cs` (lines 49-63)
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs` (lines 80-94)
- Modify: `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts`
- Modify: `frontend/src/pages/components/trip-card.tsx`
- Modify: `frontend/src/pages/shopping-page.tsx`

- [ ] **Step 1: Update backend UpdateTripRequest DTO**

In `UpdateTripRequest.cs`, add HouseholdId:

```csharp
// ABOUTME: DTO for updating trip properties
// ABOUTME: Supports renaming trips and changing scope (personal/household)

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 2: Update ITripService interface**

In `ITripService.cs`, line 13:

```csharp
// Before:
Task<Trip> UpdateTrip(Guid tripId, string name, Guid userId);

// After:
Task<Trip> UpdateTrip(Guid tripId, string name, Guid? householdId, Guid userId);
```

- [ ] **Step 3: Update TripService.UpdateTrip**

In `TripService.cs`, replace lines 49-63:

```csharp
public async Task<Trip> UpdateTrip(Guid tripId, string name, Guid? householdId, Guid userId)
{
    //== Verify user is collaborator before updating trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    //== Verify household membership if changing to household scope
    if (householdId.HasValue)
    {
        var isMember = await householdRepository.IsUserMember(householdId.Value, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }
    }

    var trip = await tripRepository.GetById(tripId)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.Name = name;
    trip.HouseholdId = householdId;
    return await tripRepository.Update(trip);
}
```

- [ ] **Step 4: Update TripController.Update**

In `TripController.cs`, line 85:

```csharp
// Before:
await tripService.UpdateTrip(id, request.Name, userId);

// After:
await tripService.UpdateTrip(id, request.Name, request.HouseholdId, userId);
```

- [ ] **Step 5: Update frontend mutation**

In `update-trip.mutation.ts`:

```ts
// ABOUTME: Mutation hook for updating trip details
// ABOUTME: Sends PUT request to update trip name and scope, invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripRequest {
  tripId: string
  name: string
  householdId?: string | null
}

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tripId, name, householdId }: UpdateTripRequest): Promise<void> => {
      const response = await apiFetch(`/api/trip/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, householdId: householdId ?? null }),
      })
      if (!response.ok) {
        throw new Error('Failed to update trip')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

- [ ] **Step 6: Update TripCard with edit form replacing rename**

In `trip-card.tsx`, this is a significant change. The component needs:
- Replace `onRename` prop with `onUpdate` that takes `(tripId, name, householdId)`
- Add `households` prop for the ScopeSelect
- Replace inline rename input with a full edit form (Name + ScopeSelect + Cancel/Save buttons)
- Change kebab menu "Rename" to "Edit"

Update the interface:
```tsx
interface TripCardProps {
  trip: Trip
  onUpdate: (tripId: string, name: string, householdId: string | null) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
  households?: Array<{ id: string; name: string | null }>
}
```

Replace `editValue` state with `editName` and `editHouseholdId` states.

Replace the inline rename input (`nameElement`) with a full form that shows below the card content when editing:

```tsx
{editing && (
  <div className="mt-3 pt-3 border-t border-navy/10">
    <div className="mb-3">
      <label className="block text-sm font-semibold text-navy-soft mb-1">Trip Name</label>
      <input
        ref={inputRef}
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
      />
    </div>
    <div className="mb-3">
      <label className="block text-sm font-semibold text-navy-soft mb-1">Type</label>
      <ScopeSelect
        value={editHouseholdId}
        onChange={setEditHouseholdId}
        personalLabel="Personal Trip"
        households={households}
        householdDescription="Household"
      />
    </div>
    <div className="flex gap-3">
      <button onClick={cancelEdit} className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors">
        Cancel
      </button>
      <button onClick={commitEdit} disabled={!editName.trim()} className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors">
        Save
      </button>
    </div>
  </div>
)}
```

Change kebab menu text from "Rename" to "Edit" (line 143).

Add required imports at top of file:
```tsx
import { ScopeSelect } from './scope-select'
import { tripDetailPath } from '@/routes'
```

- [ ] **Step 7: Update ShoppingPage to pass new props**

In `shopping-page.tsx`:
- Replace `handleRename` with `handleUpdate`:
```tsx
const handleUpdate = (tripId: string, name: string, householdId: string | null) => {
  updateMutation.mutate({ tripId, name, householdId })
}
```
- Update all `<TripCard>` instances to pass `onUpdate={handleUpdate}` instead of `onRename={handleRename}`, and add `households={households}`.

- [ ] **Step 8: Verify the app still compiles (frontend + backend)**

Run: `cd frontend && npx tsc -b --noEmit`
Run: `cd backend && dotnet build`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add backend/ frontend/
git commit -m "feat: replace trip Rename with full Edit form (name + scope)"
```

---

### Task 8: Redesign Add Items Page Store Selection (Task #15)

**Files:**
- Modify: `frontend/src/pages/add-trip-items-page.tsx` (lines 280-339)

- [ ] **Step 1: Redesign the selected item row layout**

In `add-trip-items-page.tsx`, replace the item row rendering (lines 274-340). The checkbox + name stay on the first line. When selected, the store dropdown + quantity move to a second line below, indented past the checkbox:

```tsx
<div
  key={item.id}
  onClick={() => toggleItem(item.id)}
  className={`p-4 bg-surface rounded-2xl shadow-sm cursor-pointer transition-colors ${
    isSelected ? 'ring-2 ring-teal' : ''
  }`}
>
  <div className="flex items-center gap-3">
    {/* Custom checkbox */}
    <div
      data-testid="item-checkbox"
      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        isSelected
          ? 'bg-teal border-teal text-white'
          : 'border-navy/20 bg-transparent'
      }`}
    >
      {isSelected && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>

    {/* Item info */}
    <div className="flex-1 min-w-0">
      <span className="font-display font-bold text-navy">{item.name}</span>
      <span className="ml-2 text-xs text-text-tertiary">{getSourceLabel(item.householdId)}</span>
    </div>
  </div>

  {/* Store dropdown + quantity (second line, when selected) */}
  {isSelected && (
    <div className="flex items-center gap-2 mt-3 pl-9" onClick={(e) => e.stopPropagation()}>
      <select
        id={`store-${item.id}`}
        value={selectedItems[item.id].storeId ?? ''}
        onChange={(e) => updateStore(item.id, e.target.value || null)}
        className="flex-1 min-w-0 px-3 py-2 min-h-[38px] border border-navy/10 rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
      >
        <option value="">Any Store</option>
        {(stores ?? []).map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      <input
        id={`qty-${item.id}`}
        type="number"
        min={1}
        value={selectedItems[item.id].quantity}
        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
        className="w-14 px-2 py-2 text-center border border-navy/10 rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
      />
    </div>
  )}
</div>
```

Note: Change "No store" to "Any Store" in the dropdown to match the spec.

- [ ] **Step 2: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx
git commit -m "feat: redesign add items page with store dropdown + quantity on second line"
```

---

## Chunk 5: UI Polish (Task #12)

### Task 9: Smooth Hold-to-Confirm Progress Bar

**Files:**
- Modify: `frontend/src/pages/components/confirm-dialog.tsx`

- [ ] **Step 1: Replace JS interval with CSS transition**

Rewrite the hold-to-confirm logic in `confirm-dialog.tsx`. Remove `progress` state, `intervalRef`, `startTimeRef`, `startHold`, `stopHold`, and the cleanup effect. Replace with CSS-transition-based approach:

```tsx
// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling
// ABOUTME: Optional holdDuration prop requires long-press to confirm, with smooth CSS transition progress bar

import { useCallback, useRef, useState } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  holdDuration?: number
}

export const ConfirmDialog = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, isPending, holdDuration }: ConfirmDialogProps) => {
  const [holding, setHolding] = useState(false)
  const holdingRef = useRef(false)

  const startHold = useCallback(() => {
    if (!holdDuration) return
    holdingRef.current = true
    setHolding(true)
  }, [holdDuration])

  const stopHold = useCallback(() => {
    if (!holdDuration) return
    holdingRef.current = false
    setHolding(false)
  }, [holdDuration])

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName === 'width' && holdingRef.current) {
      onConfirm()
    }
  }, [onConfirm])

  const confirmButtonClass = "flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl mx-4 max-w-sm w-full shadow-lg overflow-hidden">
        {holdDuration && (
          <div className="w-full h-1 bg-navy/10">
            <div
              data-testid="hold-progress-bar"
              className="h-full bg-coral"
              style={{
                width: holding ? '100%' : '0%',
                transition: holding ? `width ${holdDuration}ms linear` : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            />
          </div>
        )}
        <div className="p-6">
          <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
          <p className="text-text-secondary mb-5">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
            {holdDuration ? (
              <button
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                disabled={isPending}
                className={confirmButtonClass}
              >
                {confirmLabel}
              </button>
            ) : (
              <button
                onClick={onConfirm}
                disabled={isPending}
                className={confirmButtonClass}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Key changes:
- Replaced `setInterval` with CSS `transition: width Xms linear`
- Use `pointerdown`/`pointerup`/`pointerleave`/`pointercancel` (unified pointer events) instead of separate mouse/touch
- `onTransitionEnd` filtered by `propertyName === 'width'` fires the confirm callback
- `holdingRef` prevents stale closure issues in the transitionEnd handler
- Button layout already updated to flex-1 side-by-side from Task 3

- [ ] **Step 2: Verify the app still compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/components/confirm-dialog.tsx
git commit -m "fix: replace jittery JS-interval hold-to-confirm with smooth CSS transition"
```

---

## Summary

| Task | Chunk | Description | Files Modified |
|------|-------|-------------|----------------|
| 1 | 1 | Centralized routes.ts | ~15 files |
| 2 | 1 | PageHeader + reduced spacing | ~12 files |
| 3 | 1 | Standardize button layout | ~8 files |
| 4 | 2 | Notes labels + styling | 1 file |
| 5 | 3 | Accordion view context + bug fix | 3 files |
| 6 | 4 | Read-only completed trips | 3 files |
| 7 | 4 | Trip edit form (backend + frontend) | 7 files |
| 8 | 4 | Add items store selection redesign | 1 file |
| 9 | 5 | Smooth hold-to-confirm | 1 file |
