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

**Error responses:**
- `401 Unauthorized` — user doesn't have access to the source trip (or it doesn't exist), or isn't a member of the target household (`UnauthorizedAccessException`). Follows the existing pattern where `VerifyTripAccess` does not distinguish "not found" from "unauthorized" to avoid leaking trip existence.

### What Gets Copied

Each item from the source trip is cloned into the new trip.

**Copied fields:**
- `InventoryItemId` — FK to pantry item (may be null if the pantry item was deleted)
- `ItemName` — denormalized name snapshot
- `StoreName` — denormalized store name snapshot
- `StoreId` — FK to store (may be null if the store was deleted)
- `Quantity`
- `Notes` — shopping-specific notes

**Re-derived fields:**
- `IsHouseholdItem` — set based on the *destination* trip's scope, not copied from the source. If the new trip has a `HouseholdId`, all cloned items get `IsHouseholdItem = true`. If the new trip is personal, all get `IsHouseholdItem = false`. This ensures the field accurately describes the item's visibility context on the new trip.

**Reset fields:**
- `Id` — new GUID
- `TripId` — points to the new trip
- `IsChecked` = false
- `CheckedAt` = null
- `CreatedBy`, `CreatedDate`, `ModifiedBy`, `ModifiedDate` — set fresh by `CartDbContext.SaveChangesAsync` (the existing EF override that populates audit fields on all `BaseEntity` entries)

### Item Visibility Filtering

On household trips, the source trip may contain personal items added by other household members. The duplication respects the same visibility rules as `GetTripItems`:

- **Household items** — always copied
- **Personal items created by the current user** — copied
- **Personal items created by other users** — not copied (the duplicating user can't see them)

On personal trips, all items are copied (they're all the creator's).

### Backend Logic

New method on `TripService`: `Task<Trip> DuplicateTrip(Guid sourceTripId, string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default)`

`TripService` gets a new dependency on `ITripItemRepository` to fetch source trip items directly (bypassing `TripItemService` since this is a bulk clone, not individual adds).

Steps in a single transaction:
1. Verify user has access to the source trip via `VerifyTripAccess` (throws `UnauthorizedAccessException` for both not-found and unauthorized)
2. If `householdId` is set, verify user is a household member (throws `UnauthorizedAccessException`)
3. Create the new `Trip` entity — add to DbContext via `dbContext.Trips.Add()` (do NOT call `tripRepository.Create()`, which calls `SaveChangesAsync` per entity)
4. Fetch items from the source trip via `ITripItemRepository`
5. Apply visibility filtering: on household source trips, keep only household items + items where `CreatedBy == userId`
6. Clone each item with reset checked state, new IDs, and re-derived `IsHouseholdItem`
7. Add all cloned items via `dbContext.TripItems.AddRange()`
8. Single `SaveChangesAsync` — atomic commit of new trip + all cloned items

**No SSE events** are published for cloned items. This is deliberate — the new trip has no active subscribers yet. The duplicating user navigates to the trip detail page and fetches items fresh via the query cache.

### Frontend: Duplicate Dialog

A modal dialog triggered from two places:
- **Trip card kebab menu** on the shopping page — new "Duplicate" option added to the existing "Trip actions" menu
- **Trip detail page** — a new trip-level action needs to be added (currently the page only has item-level kebab menus, not a trip-level one). Add a "Duplicate" action to the page header area, using the same pattern as other trip-level actions.

**Dialog contents:**
- Trip Name (text input, required, blank)
- Trip Date (date input, blank)
- Scope (ScopeRadio, shown only if user has a household — defaults to the source trip's scope)
- Create / Cancel buttons

Name and date are intentionally blank (not pre-filled from the source trip). The user fills them in fresh.

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

### Key Test Cases

**Backend:**
- Duplicate a personal trip as personal — all items copied
- Duplicate a household trip as personal (cross-scope) — items copied, `IsHouseholdItem` re-derived to false
- Duplicate a personal trip as household (cross-scope) — items copied, `IsHouseholdItem` re-derived to true
- Household trip with mixed visibility — only household items + current user's personal items copied
- Empty trip — new empty trip created
- Source trip not found or unauthorized — 401 (same behavior, no existence leak)
- User not a member of target household — 401
- Over-limit (if applicable) or general validation

**Frontend:**
- Dialog renders with blank name, blank date, scope defaulting to source trip scope
- Submit disabled when name is empty
- Successful duplicate navigates to new trip detail page
- Error handling for failed API call

## Implementation Plan

_To be written after spec approval._
