# Filtered Inventory Views — Design

## Overview

Add a filter dropdown to the Inventory page's Items tab so users can scope the view to personal items, a specific household's items, or a merged view (household + personal). Also improve the default "All" view to group items by household instead of lumping all household items together.

## Filter UI

A `<select>` dropdown between the Items/Stores segmented control and the item list. Options:

- **All Items** — default; shows everything grouped into per-household sections + a personal section
- **Personal** — only the user's personal items
- **\<Household Name\>** — one option per household the user belongs to
- **\<Household Name\> + Personal** — the merged view for each household

Styled to match existing `<select>` elements in the app (AddInventoryItemPage, TripItemRow). Only visible on the Items tab — the Stores tab already has its own grouping.

The "All Items" view renders per-household sections with household name headers, matching the pattern `InventoryStoresView` already uses. Single-scope filters render a flat list without section headers.

## Data Flow

Each filter maps to a backend endpoint:

| Filter | Endpoint |
|---|---|
| All Items | `GET /api/inventory` (existing) |
| Personal | `GET /api/inventory/personal` |
| \<Household\> | `GET /api/inventory/household/{id}` |
| \<Household\> + Personal | `GET /api/inventory/merged/{id}` |

### New Query Hooks

| Hook | Query Key |
|---|---|
| `usePersonalInventoryQuery()` | `['inventory', 'personal']` |
| `useHouseholdInventoryQuery(householdId)` | `['inventory', 'household', householdId]` |
| `useMergedInventoryQuery(householdId)` | `['inventory', 'merged', householdId]` |

Existing mutations already invalidate `['inventory']`, which matches all keys starting with that prefix — so all scoped queries refresh automatically on create/update/delete.

Household names for the dropdown and section headers come from the existing `useHouseholdsQuery()`.

## Component Structure

No new pages or routes.

**InventoryPage** changes:
- Adds `filter` state holding the selected filter value (`'all'`, `'personal'`, `'household:<id>'`, `'merged:<id>'`)
- Renders the `<select>` dropdown between the tab bar and content
- Extracts a new `<InventoryItemsView>` component for the Items tab (mirroring `<InventoryStoresView>` for the Stores tab)

**InventoryItemsView** receives the filter value as a prop:
- Calls the appropriate query hook based on the filter
- For "All Items": groups into per-household + personal sections using household names from `useHouseholdsQuery()`
- For single-scope filters: renders a flat list

Existing item rendering (name, notes, default store) stays the same.

## Testing

### New hook tests (3 files)
- `use-personal-inventory.query.test.tsx` — fetch, unauth, error
- `use-household-inventory.query.test.tsx` — fetch by household ID, unauth, error
- `use-merged-inventory.query.test.tsx` — fetch merged, unauth, error

### InventoryItemsView tests (new file)
- Renders items grouped by household in "All" filter
- Renders only personal items with personal filter
- Renders only household items with household filter
- Renders merged items with merged filter
- Shows empty state when no items match

### InventoryPage test updates
- Filter dropdown renders with correct options
- Changing filter passes the right value to InventoryItemsView
