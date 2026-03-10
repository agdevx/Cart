# AGDevX.Cart — Round 3 App Improvements Design Spec

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
