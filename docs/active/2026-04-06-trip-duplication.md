# Trip Duplication

## Design Spec

### Overview

Duplicate an existing trip to create a new trip pre-populated with the same items. Available from both the shopping page trip card kebab menu and the trip detail page. Works on trips in any state (Planning, In Progress, Completed).

### API

**`POST /api/v1/trip/{id}/duplicate`** — Returns `201 Created` with the new trip. Items are not included in the response — the frontend fetches them separately when navigating to the trip detail page.

Request body (reuses `CreateTripRequest` DTO):
```json
{
  "name": "Weekly Groceries",
  "tripDate": "2026-04-12",
  "householdId": null
}
```

The `{id}` path param is the source trip to copy items from. The request body defines the new trip's identity. The new trip's scope is independent of the source trip — a household trip can be duplicated as personal or vice versa.

**Authorization:**
- User must have access to the source trip (same `VerifyTripAccess` check used by all trip operations)
- If `householdId` is set, user must be a member of that household (same check as `CreateTrip`)

### What Gets Copied

Each item from the source trip is cloned into the new trip.

**Copied fields:**
- `InventoryItemId` — FK to pantry item (may be null if the pantry item was deleted)
- `ItemName` — denormalized name snapshot
- `StoreName` — denormalized store name snapshot
- `StoreId` — FK to store (may be null if the store was deleted)
- `Quantity`
- `Notes` — shopping-specific notes
- `IsHouseholdItem` — scope snapshot from the source item

**Reset fields:**
- `Id` — new GUID
- `TripId` — points to the new trip
- `IsChecked` = false
- `CheckedAt` = null
- `CreatedBy`, `CreatedDate`, `ModifiedBy`, `ModifiedDate` — set fresh by `SaveChangesAsync`

### Item Visibility Filtering

On household trips, the source trip may contain personal items added by other household members. The duplication respects the same visibility rules as `GetTripItems`:

- **Household items** — always copied
- **Personal items created by the current user** — copied
- **Personal items created by other users** — not copied (the duplicating user can't see them)

On personal trips, all items are copied (they're all the creator's).

### Backend Logic

New method on `TripService`: `DuplicateTrip(Guid sourceTripId, string name, DateOnly? tripDate, Guid? householdId, Guid userId)`

Steps in a single transaction:
1. Verify user has access to the source trip
2. If `householdId` is set, verify user is a household member
3. Create the new trip in Planning state (`IsStarted = false`, `IsCompleted = false`)
4. Fetch items from the source trip with visibility filtering (household items + current user's personal items)
5. Clone each item with reset checked state and new IDs
6. `SaveChangesAsync` — atomic commit of new trip + all cloned items

### Frontend: Duplicate Dialog

A modal dialog triggered from two places:
- Trip card kebab menu on the shopping page (new "Duplicate" option)
- Trip detail page (kebab menu)

**Dialog contents:**
- Trip Name (text input, required, blank)
- Trip Date (date input, blank)
- Scope (ScopeRadio, shown only if user has a household)
- Create / Cancel buttons

**After success:**
- Success toast: "Trip created"
- Close dialog
- Invalidate trips query cache
- Navigate to the new trip's detail page

### Edge Cases

- **Empty trip** — creates a new empty trip. No special handling.
- **Deleted inventory items** — trip items with `InventoryItemId = null` are copied. They retain their denormalized `ItemName` and `StoreName`.
- **Deleted stores** — trip items with `StoreId = null` are copied with their denormalized `StoreName`.
- **Source trip in any state** — duplication always works. The new trip starts in Planning.

## Implementation Plan

_To be written after spec approval._
