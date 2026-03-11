# Store Uniqueness and Scope Indicators

## Problem

Two small gaps in the current store experience:

1. Users can create duplicate stores with the same name within the same scope (e.g., two "Costco" entries in their personal store list).
2. When a user has "Costco" as a personal store and their household also has "Costco," there's no visual indication of which is which.

## Solution

1. Enforce unique store names within a scope (case-insensitive).
2. Add scope indicators — "(Personal)" or "(Household Name)" — to store names in the UI when a name collision exists across scopes.

## Design

### Backend: Unique Store Names Per Scope

**Validation rule:** No two stores in the same scope can share a name (case-insensitive comparison).

- Personal scope: No duplicate names among a user's personal stores.
- Household scope: No duplicate names among a single household's stores.
- Cross-scope duplicates are allowed. "Costco" can exist as both a personal store and a household store.

**Enforcement location:** `StoreService.CreateStore()` and `StoreService.UpdateStore()`. Before creating or renaming, query for an existing store with the same name (case-insensitive) in the same scope. Return `409 Conflict` if a match is found.

**Update considerations:**
- The duplicate query must **exclude the store being updated** (by ID) to avoid self-matching. Changing "costco" to "Costco" (case-only change) should not 409.
- When a store's scope changes (personal → household or vice versa), the duplicate check must validate against the **destination** scope. Moving "Costco" from personal to a household that already has "Costco" → 409, even if the name didn't change.

**No data model changes.** No unique index needed — the service layer enforces this rule. A unique index would be complex to express (conditional on `UserId` vs `HouseholdId` nullability) and the service layer already handles all store writes.

### Frontend: Scope Indicators

**When to show:** When the combined store list (personal + all household stores) contains duplicate names across scopes (case-insensitive comparison), append a scope label to disambiguate:

- Personal store: `"Costco (Personal)"`
- Household store: `"Costco (Smith Family)"` using the household's actual name

Non-duplicate names display without any suffix.

**Where to show:** Everywhere store names appear in the UI **except**:
- **Trip accordions** — group by denormalized `StoreName` on `TripItem`, so items from a personal "Costco" and a household "Costco" merge into one "Costco" group. This is desirable behavior for shopping convenience.
- **Pantry management view** — stores are already grouped under section headers ("Personal Stores", "Smith Family"), so scope indicators would be redundant.

Affected locations include:
- Store pickers / dropdowns (trip items, inventory items)
- Store filter tabs (e.g., add-trip-items page)
- Any other place a store name is displayed outside of the exceptions above

**Implementation:** A shared utility function that takes the full store list and returns display names. Consumers call this instead of using `store.name` directly.

### Frontend: Duplicate Name Validation

When creating or editing a store, the frontend should validate the name against existing stores in the same scope before submitting. Display an inline error if a duplicate is detected (case-insensitive). This provides immediate feedback without waiting for the backend 409.

When editing, the validation must check against the **selected** scope (which may differ from the store's current scope if the user is changing it) and must exclude the store being edited.

## Edge Cases

**Renaming a store to match another in the same scope:** Blocked by the same validation — both backend (409) and frontend (inline error).

**Two households with stores that share a name:** Both get their household name appended. E.g., "Costco (Smith Family)" and "Costco (Jones Family)". If both households also share a name, the labels would appear identical — this is unlikely enough to not warrant special handling.

## Non-Changes

- Store data model (`Store` entity, `UserId`, `HouseholdId`)
- Store ownership and CRUD authorization
- Denormalized `StoreName` on `TripItem`
- Trip accordion grouping behavior
- Store scoping rules (stores are still personal or household)
- Existing store endpoints
- `useStoresQuery` hook
