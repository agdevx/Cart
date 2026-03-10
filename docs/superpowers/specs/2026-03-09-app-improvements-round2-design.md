# App Improvements Round 2 — Design Spec

## Overview

13 tasks across 8 sections: backend data integrity, pantry inline forms, trip lifecycle labels, kebab menu fixes, store-grouped shopping lists, store override/filter on add items, household danger zone UX, and dual notes display.

## Branch

`feat/app-improvements-round2`

---

## Section 1: Backend Schema & Data Integrity (Task 12)

### TripItem Denormalization

Add denormalized columns to TripItem:
- `ItemName` (string, required) — copied from InventoryItem.Name on creation
- `StoreName` (string, nullable) — copied from Store.Name on creation (when StoreId is set)

Change `InventoryItemId` from required to nullable.

### FK Behavior Changes

- `TripItem.InventoryItemId` → ON DELETE SET NULL (was CASCADE)
- `TripItem.StoreId` → ON DELETE SET NULL (already nullable, needs delete behavior configured)
- `InventoryItem.DefaultStoreId` → ON DELETE SET NULL (already nullable, needs delete behavior configured)

### Live Mirror

When source entities are renamed, update the denormalized names on TripItems:
- `InventoryService.UpdateInventoryItem`: after updating, update `ItemName` on all TripItems where `InventoryItemId` matches
- `StoreService.UpdateStore`: after updating, update `StoreName` on all TripItems where `StoreId` matches

On deletion:
- Pantry item deleted → `InventoryItemId` set to null, `ItemName` preserved
- Store deleted → `StoreId` set to null, `StoreName` preserved

Single EF migration covering all schema changes.

---

## Section 2: Pantry Inline Add & Edit (Tasks 1, 2, 3)

### Shared Principle

Edit forms are identical to Add forms, just pre-populated and wired to update mutations instead of create. This applies site-wide.

### Task 1 — Add Item Inline

- Replace "Add Item" navigation button with inline toggle form (same pattern as Add Store)
- Form fields: Name, Scope (ScopeSelect), Notes (optional), Default Store (optional dropdown)
- Submit creates the item and clears the form
- Remove `/pantry/add` route and `add-pantry-item-page.tsx`

### Task 2 — Edit Pantry Item

- Add "Edit" to kebab menu alongside Delete
- Expands the same form as Add, pre-populated with current values
- All fields editable including Scope
- Save/Cancel footer
- One item editable at a time

### Task 3 — Edit Store (Inline Expandable Form)

- Replace current inline name-only edit with expandable form pattern
- Same form as Add Store, pre-populated with current values
- All fields editable (Name, Scope)
- Save/Cancel footer

---

## Section 3: Trip Lifecycle & Labels (Task 4)

Backend already has `IsStarted`, `StartedAt`, and `POST /api/trip/{id}/start`. Frontend changes only.

- **Trip detail page:** If `isStarted` is false → "Start Shopping" button. If true → "Continue Shopping" button. Both navigate to `/shopping/:tripId/active`.
- **"Start Shopping" click:** Call the start endpoint first, then navigate. "Continue Shopping" just navigates.
- **Active trip page:** Rename "Back to Planning" link to "Update Shopping List". Same navigation target.

---

## Section 4: Kebab Menu Fixes (Tasks 5, 6)

### Task 5 — Kebab Click Shouldn't Toggle Checkbox

- Add `e.stopPropagation()` on the kebab menu button and dropdown menu items in TripItemRow
- Prevents checkbox toggle when interacting with the kebab menu on the active trip page

### Task 6 — Larger Tap Targets

- Increase clickable area on `MoreVertical` icon buttons across all components (TripItemRow, PantryItemsView, PantryStoresView, TripCard, etc.)
- Minimum 44x44px tap target (Apple's recommended minimum for mobile)
- Icon stays the same size — only padding/hit area grows

---

## Section 5: Group Items by Store (Task 7)

### Grouping

- Group TripItems by store (`StoreName` from denormalized field)
- Named store groups sorted alphabetically
- "Any Store" group at the bottom for items with no store assigned

### Accordion Behavior

- Each store group is a collapsible accordion section
- **Persist expand/collapse state per trip** in `localStorage` keyed by tripId (survives navigation and refreshes)
- **Auto-collapse when all items checked** — if every item in a store group is checked, collapse that group
- **Default state for active/planning trips:** all collapsed (user opens the store they're at)
- **Default state for completed trips:** all collapsed
- **Cleanup:** remove `localStorage` entry on trip completion (completed trips always default to collapsed)

### Applies To

- Trip detail page (shopping list / planning view)
- Active trip page (shopping view)

---

## Section 6: Store Override & Store Filter on Add Items (Tasks 8, 9)

### Task 8 — Store Override When Adding Items

- On the add-trip-items page, when an item is selected, a store dropdown appears alongside the quantity input
- Pre-populated with the item's `DefaultStoreId`/`DefaultStoreName` (if any)
- User can override the store per item before adding to the trip
- Overridden store sent as `storeId` in the `AddTripItem` call

### Task 9 — Store Filter Segmented Control

- Second segmented control next to the existing source filter (side by side)
- Options: "All" + one tab per store (based on current source filter scope)
- Filters the item list to show only items whose `DefaultStoreId` matches the selected store
- "All" shows everything
- When source filter changes, store filter resets to "All" and repopulates with relevant stores

---

## Section 7: Household Danger Zone (Tasks 10, 11)

### Task 10 — Danger Zone Improvements

- Show warning verbiage ("This will permanently delete the household and all its items and stores. This can't be undone.") above the Delete Household button in the danger zone section
- Keep the same verbiage in the modal
- Update modal title to "Delete Household - Are you sure?"

### Task 11 — Hold-to-Confirm (Reusable)

- Add optional `holdDuration` prop to existing `ConfirmDialog` component
- No `holdDuration` = current single-click behavior (no breaking changes)
- With `holdDuration` (e.g., `holdDuration={5000}`):
  - Thin progress bar at the very top of the modal, above the title, no text label
  - Progress bar fills left-to-right over the specified duration while the confirm button is held
  - Releasing early resets progress to zero
  - After full duration held, confirm fires automatically
  - Supports both mouse (mousedown/mouseup) and touch (touchstart/touchend)

---

## Section 8: Dual Notes Display (Task 13)

### Shopping List Item Row

TripItemRow displays both note types below the item name:
1. **Pantry notes** (from linked InventoryItem) — displayed in italics with "Pantry:" prefix label, muted color
2. **Trip notes** (TripItem.Notes) — displayed as-is, current style

Pantry notes shown first, trip notes second. If either is null/empty, that line is omitted.

### Edge Case

When `InventoryItemId` is null (pantry item was deleted), pantry notes line is not rendered. No error, no empty label — graceful skip.

### Data Flow

Backend `GetTripItems` query must include `InventoryItem.Notes` in the response. Verify the existing Include/ThenInclude chain covers this.

---

## Implementation Order (Recommended)

| Priority | Section | Tasks | Rationale |
|----------|---------|-------|-----------|
| 1 | Backend Schema & Data Integrity | 12 | Foundation — other tasks depend on denormalized fields |
| 2 | Kebab Menu Fixes | 5, 6 | Small, surgical, no dependencies |
| 3 | Trip Lifecycle & Labels | 4 | Small, independent frontend change |
| 4 | Pantry Inline Add & Edit | 1, 2, 3 | Medium scope, independent of other UI tasks |
| 5 | Group Items by Store | 7 | Depends on task 12 (StoreName field) |
| 6 | Store Override & Filter | 8, 9 | Depends on task 12 (store data on items) |
| 7 | Household Danger Zone | 10, 11 | Independent, can be parallelized |
| 8 | Dual Notes Display | 13 | Depends on task 12 (InventoryItemId nullable) |
