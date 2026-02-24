# Store Management UI Design

## Overview

Add store management to the inventory page via a segmented control (Items / Stores). The Stores view provides full CRUD for stores scoped to households or personal use. No new routes or bottom nav changes.

## Navigation & Routing

- No new bottom nav tab or route
- `/inventory` gains a segmented control: **Items** | **Stores**
- Local state toggle (React `useState`), always opens to Items view
- Items view = existing inventory content, unchanged

## Stores View UX

### Layout

Segmented control sits below the page title. When "Stores" is active, the entire content area below swaps to the store management UI.

### Sections

Stores are grouped the same way inventory items are:
- **Household stores** — grouped by household name (one section per household the user belongs to)
- **Personal stores** — user's private stores

Each section uses the existing section header pattern: uppercase label with a horizontal rule.

### Create Flow

- Toggle button reveals an inline form (same pattern as trip creation on the shopping page)
- Fields: store name (text input), scope (dropdown: "Personal" + each household name)
- Household list populated from `useHouseholdsQuery`
- Submit creates the store, collapses the form, invalidates `['stores']`

### Edit Flow

- Tapping the edit icon on a store row turns the name into an in-place text input
- Enter or checkmark icon saves the change
- Escape cancels and reverts to the display state
- Only the name is editable (changing scope = delete + recreate)

### Delete Flow

- Tapping the delete icon shows a confirmation modal
- Modal uses the existing inline pattern: `fixed inset-0 bg-black/50` overlay with a centered card
- Confirming deletes the store and invalidates `['stores']`

### Empty States

Per-section "No stores yet" message when a section has no stores.

## API Hooks

New files in `src/apis/agdevx-cart-api/store/`:

| File | Method | Endpoint | Query Key |
|------|--------|----------|-----------|
| `use-stores.query.ts` | GET | `/api/store/personal` + `/api/store/household/{id}` per household | `['stores']` |
| `create-store.mutation.ts` | POST | `/api/store` | invalidates `['stores']` |
| `update-store.mutation.ts` | PUT | `/api/store/{id}` | invalidates `['stores']` |
| `delete-store.mutation.ts` | DELETE | `/api/store/{id}` | invalidates `['stores']` |

The stores query fetches personal stores and all household stores (one request per household), combining them into a single result.

## Backend Endpoints (existing)

| Method | Route | Notes |
|--------|-------|-------|
| GET | `api/store/personal` | Returns user's personal stores |
| GET | `api/store/household/{householdId}` | Returns stores for a household (requires membership) |
| GET | `api/store/{id}` | Single store by ID |
| POST | `api/store` | Create store (body: `{ name, householdId?, userId? }`) |
| PUT | `api/store/{id}` | Update store |
| DELETE | `api/store/{id}` | Delete store |

## Styling

All existing design tokens apply:
- `navy` / `teal` / `coral` color scheme
- `font-display` for headings, `font-body` for content
- Section headers: `font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary`
- Inline Tailwind utilities, no new shared components

## Testing

- API hook unit tests for the query and all 3 mutations
- Component tests for the stores view: list rendering, create form, inline edit, delete with confirmation
- Verify the items view continues to work unchanged after adding the segmented control
