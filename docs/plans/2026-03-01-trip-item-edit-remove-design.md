# Trip Item Editing and Removal — Design

## Scope

Add edit and remove actions to trip items on both the trip detail page (planning) and the active trip page (shopping).

## Backend

Already complete — no changes needed:
- `PUT /api/tripitem/{id}?quantity=N&notes=X&storeId=Y` — updates item, broadcasts SSE event
- `DELETE /api/tripitem/{id}` — removes item, broadcasts SSE event

## UI Pattern

### Kebab Menu Per Item Row

A three-dot (`MoreVertical`) icon on each trip item row. Tapping opens a dropdown with:
- **Edit** — expands the row inline to show editable fields
- **Remove** — immediately removes the item (no confirmation needed)

Consistent with the trip card kebab menus on the shopping page.

### Edit (Inline Expand)

When "Edit" is selected from the kebab:

1. The item row expands below the name to show editable fields:
   - **Quantity** — number input, pre-filled with current value
   - **Notes** — text input, pre-filled (or empty placeholder)
   - **Store** — dropdown of available stores (optional, can be cleared)
2. Two buttons: **Save** and **Cancel**
3. Save calls `PUT /api/tripitem/{id}` with updated values
4. Cancel collapses back to normal row
5. While saving, fields are disabled with a loading state

### Remove (No Confirmation)

When "Remove" is selected:

1. Immediately calls `DELETE /api/tripitem/{id}`
2. Item disappears from the list via query invalidation
3. No confirmation — items are easily re-added

## Components

| Component | Purpose |
|---|---|
| `TripItemRow` | Shared component for both pages — displays item with kebab menu, inline edit expand |

The `TripItemRow` component is used on both the trip detail page and active trip page. On the active trip page, it additionally shows the checkbox for check/uncheck.

## New Frontend Hooks

| Hook | Endpoint | Purpose |
|---|---|---|
| `useUpdateTripItemMutation` | `PUT /api/tripitem/{id}` | Edit quantity/notes/store |
| `useDeleteTripItemMutation` | `DELETE /api/tripitem/{id}` | Remove item from trip |

## Pages Affected

- `trip-detail-page.tsx` — replace inline item rendering with TripItemRow
- `active-trip-page.tsx` — replace inline item rendering with TripItemRow (with checkbox)
