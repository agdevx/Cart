# Single Household Architecture

## Design Spec

### Overview

Drop support for multiple household memberships. A user can belong to at most one household at a time. This simplifies the data model (eliminates the `HouseholdMember` join table and `TripCollaborator` join table), the API surface, and the frontend UX (removes multi-household scope filters and selectors).

### Decisions

| # | Decision | Detail |
|---|----------|--------|
| 1 | One household per user | Hard limit. `User.HouseholdId` nullable FK replaces the `HouseholdMember` join table. |
| 2 | Personal/household distinction stays | Items, stores, and trips can be personal (user-only) or household-scoped (shared). |
| 3 | Auto-swap on join/create | Joining or creating a household auto-removes the user from the old one, with a long-press (5 sec) confirmation modal. |
| 4 | Equal co-ownership | `Household.Owner1UserId` (required) and `Household.Owner2UserId` (optional). Both have identical permissions. |
| 5 | Trips become scope-aware | Trips gain a nullable `HouseholdId`. Household trips are visible to all household members. |
| 6 | Personal items on household trips are private | On a household trip, personal items are only visible to the user who added them. Counts reflect only visible items. |
| 7 | Fresh DB schema | Delete all existing migrations and the SQLite DB file. Generate a single clean initial migration. |
| 8 | TripCollaborator removed | No more explicit trip invites. Trips are either personal (creator only) or household-scoped (all members). |
| 9 | Audit FKs are proper Guid references | `BaseEntity.CreatedBy` and `ModifiedBy` become `Guid` FKs to `User` with `Restrict` delete behavior. On user registration, `CreatedBy` and `ModifiedBy` self-reference the new user's own ID. |
| 10 | User deletion blocked | `Restrict` cascade on all User FKs. Users cannot be deleted; future account deletion would be a deliberate feature with its own design. |
| 11 | Trip authorization by scope | Personal trips: only creator. Household trips: any household member can update, delete, start, complete, reopen. |

---

### Data Model

#### BaseEntity (modified)

```
BaseEntity
  Id              Guid        PK
  CreatedBy       Guid        FK → User (Restrict)
  CreatedDate     DateTime
  ModifiedBy      Guid        FK → User (Restrict)
  ModifiedDate    DateTime?
```

`CreatedBy` and `ModifiedBy` are now proper `Guid` FKs to `User` with `Restrict` delete behavior. On user registration, these self-reference the new user's own ID (EF Core handles self-referential inserts within a single `SaveChanges`).

#### User (modified)

```
User
  Id              Guid        PK
  Email           string      required, unique, max 254
  PasswordHash    string      max 256, JSON-ignored
  Name            string      max 64
  HouseholdId     Guid?       FK → Household (SetNull on household delete)
```

#### Household (modified)

```
Household
  Id                    Guid        PK
  Name                  string      required, max 100
  InviteCode            string      unique, max 8 (generated as 6 characters)
  Owner1UserId          Guid        FK → User (Restrict)
  Owner2UserId          Guid?       FK → User (Restrict)
```

`Name` is required (non-nullable). `Owner1UserId` and `Owner2UserId` have `Restrict` delete behavior — a user who is a household owner cannot be deleted.

**Circular FK note:** `User.HouseholdId` → `Household` and `Household.Owner1UserId` → `User` create a circular reference. On household creation: create the Household first (with `Owner1UserId` set to the existing user), then update `User.HouseholdId` in the same `SaveChanges` call.

#### HouseholdMember (deleted)

Removed entirely. Membership is implicit: `User.HouseholdId IS NOT NULL`.

#### TripCollaborator (deleted)

Removed entirely. Trip visibility is now determined by scope: personal trips are visible only to the creator, household trips are visible to all household members.

#### Trip (modified)

```
Trip
  Id              Guid        PK
  Name            string      required
  IsCompleted     bool
  CompletedAt     DateTime?
  IsStarted       bool
  StartedAt       DateTime?
  TripDate        DateOnly?
  HouseholdId     Guid?       FK → Household (Cascade delete)
```

**DbContext note:** The current `OnModelCreating` has no existing configuration block for `Trip`. A new `modelBuilder.Entity<Trip>()` block is required to configure the `HouseholdId` FK with `Cascade` delete behavior.

**Authorization model:** Personal trips (HouseholdId is null) — only the creator can view, update, delete, start, complete, or reopen. Household trips (HouseholdId is set) — any member of the household can perform all operations.

#### TripItem (modified)

```
TripItem
  Id                Guid        PK
  TripId            Guid        FK → Trip (Cascade delete)
  InventoryItemId   Guid?       FK → InventoryItem (SetNull)
  ItemName          string      denormalized from InventoryItem.Name
  StoreName         string?     denormalized from Store.Name
  Quantity          int
  StoreId           Guid?       FK → Store (SetNull)
  Notes             string?
  IsChecked         bool
  CheckedAt         DateTime?
  IsHouseholdItem   bool        NEW — scope snapshot at time of addition
```

`IsHouseholdItem` is set when the item is added to the trip, based on whether the source InventoryItem is household-scoped (`InventoryItem.HouseholdId IS NOT NULL`). This denormalization ensures visibility rules remain correct even if the source InventoryItem is later deleted (which SetNulls `InventoryItemId`).

#### InventoryItem (unchanged)

```
InventoryItem
  Id              Guid        PK
  Name            string      required
  DefaultStoreId  Guid?       FK → Store (SetNull)
  Notes           string?
  OwnerUserId     Guid?       FK → User (Restrict)
  HouseholdId     Guid?       FK → Household (Cascade delete)
```

**Side effect notes:**
- When a sole member swaps households and the old household is cascade-deleted, personal items whose `DefaultStoreId` pointed to a household store will have that FK SetNulled. The items survive but lose their default store association.
- Similarly, `TripItem.StoreId` values pointing to cascade-deleted household stores will be SetNulled. Trip items survive but lose their store reference.

#### Store (unchanged)

```
Store
  Id              Guid        PK
  Name            string      required
  HouseholdId     Guid?       FK → Household (Cascade delete)
  UserId          Guid?       FK → User (Restrict)
```

#### UserPreferences (modified)

```
UserPreferences
  Id                    Guid        PK
  UserId                Guid        unique, FK → User (Cascade delete)
  DefaultPage           string?
  ShowHouseholdPage     bool        default true
  LocationLatitude      double?
  LocationLongitude     double?
  LocationDisplayName   string?
  ShowWeatherIcons      bool        default true
  ShowWeatherTemps      bool        default true
```

`ShowHouseholdPage` is new. DTOs that must also gain this field:
- `UpdateUserPreferencesRequest` — add `ShowHouseholdPage` (bool?)
- `UserPreferencesResponse` (or equivalent) — add `ShowHouseholdPage` (bool)

#### Indexes

| Table | Columns | Type | Rationale |
|-------|---------|------|-----------|
| User | Email | Unique | Login lookup |
| User | HouseholdId | Non-unique | "Get all members of household" query |
| Household | InviteCode | Unique | Join-by-code lookup |
| Household | Owner1UserId | Non-unique | Ownership validation |
| Household | Owner2UserId | Non-unique | Ownership validation |
| InventoryItem | HouseholdId | Non-unique | Household items query |
| InventoryItem | OwnerUserId | Non-unique | Personal items query |
| Store | HouseholdId | Non-unique | Household stores query |
| Store | UserId | Non-unique | Personal stores query |
| Store | (Name, HouseholdId) | Non-unique | Duplicate name check query (uniqueness enforced at service layer; SQLite lacks filtered unique indexes) |
| Store | (Name, UserId) | Non-unique | Duplicate name check query (uniqueness enforced at service layer; SQLite lacks filtered unique indexes) |
| Trip | HouseholdId | Non-unique | Household trips query |
| Trip | CreatedBy | Non-unique | Personal trips query / user's trips lookup |
| TripItem | TripId | Non-unique | Items-for-trip query |
| TripItem | InventoryItemId | Non-unique | Denormalized name sync on item rename |
| TripItem | StoreId | Non-unique | Denormalized name sync on store rename |
| UserPreferences | UserId | Unique | One-to-one lookup |

#### Cascade Behaviors

| Parent Delete | Child | Behavior |
|---------------|-------|----------|
| Household | User.HouseholdId | SetNull (members become solo) |
| Household | InventoryItem | Cascade delete |
| Household | Store | Cascade delete |
| Household | Trip | Cascade delete |
| User | Household.Owner1UserId | Restrict (block user deletion) |
| User | Household.Owner2UserId | Restrict (block user deletion) |
| User | InventoryItem.OwnerUserId | Restrict (block user deletion) |
| User | Store.UserId | Restrict (block user deletion) |
| User | All BaseEntity.CreatedBy/ModifiedBy | Restrict (block user deletion) |
| Store | InventoryItem.DefaultStoreId | SetNull |
| Store | TripItem.StoreId | SetNull |
| InventoryItem | TripItem.InventoryItemId | SetNull |
| Trip | TripItem | Cascade delete |
| User | UserPreferences | Cascade delete |

No orphaned records are possible: every FK either cascades (child deleted with parent), SetNulls (child survives, loses reference), or Restricts (deletion blocked).

---

### Backend Service Changes

#### HouseholdService

**CreateHousehold(userId, name):**
1. If user has a household, run auto-swap logic (see below).
2. Create household with `Owner1UserId = userId`.
3. Set `User.HouseholdId` to new household.
4. Set `UserPreferences.ShowHouseholdPage = true`.

Transaction order: create Household (with Owner1UserId pointing to existing user), then update User.HouseholdId, in a single SaveChanges call.

**JoinHousehold(userId, inviteCode):**
1. Find household by invite code.
2. If user has a household, run auto-swap logic (see below).
3. Set `User.HouseholdId` to new household.
4. Set `UserPreferences.ShowHouseholdPage = true`.

**Auto-swap logic (called by create and join):**
- Determine the user's current household and role.
- Return a swap scenario to the frontend (see modal states below). The frontend must confirm before the swap executes.
- The `swap-status` endpoint is purely advisory for the UI. The backend **always re-evaluates** the scenario at execution time. If the scenario changed between the status check and the actual join/create request, the backend rejects with the updated scenario and the frontend shows the corrected modal.
- Swap scenarios on confirmed swap:
  - **`none`** — user has no household. No swap needed, proceed directly.
  - **`regular-member`** — user is a non-owner member. Set `User.HouseholdId = null`. Delete user's personal TripItems from old household trips.
  - **`has-co-owner`** — user is an owner and the other owner exists: set `User.HouseholdId = null`. If user was `Owner1UserId`, move `Owner2UserId` into `Owner1UserId` slot. If user was `Owner2UserId`, clear it. Delete user's personal TripItems from old household trips.
  - **`sole-member`** — user is the only member: delete the household entirely (cascades items, stores, trips).
  - **`ownership-transfer-required`** — user is an owner with no co-owner but other members exist: **block the swap**. Return error message.

**LeaveHousehold(userId):**
1. **Non-owner member:** Set `User.HouseholdId = null`. Delete user's personal TripItems from household trips.
2. **Owner, co-owner exists:** Set `User.HouseholdId = null`. If user was `Owner1UserId`, move `Owner2UserId` into `Owner1UserId` slot. If `Owner2UserId`, clear it. Delete user's personal TripItems from household trips.
3. **Owner, no co-owner, other members exist:** Blocked — "You cannot leave this household until you transfer ownership to one of the other members."
4. **Sole member (no one else):** Set `User.HouseholdId = null`. Delete the household (cascades items, stores, trips).

On leave, delete the departing user's personal TripItems from any active household trips (items where `IsHouseholdItem == false` and `CreatedBy == userId` on trips belonging to the old household). This prevents ghost data that no one can see.

**DeleteHousehold(userId, householdId):**
- Verify `userId == Owner1UserId || userId == Owner2UserId`.
- Delete household (cascades everything).

**GetMembers(householdId):**
- Query `Users.Where(u => u.HouseholdId == householdId)`.
- Return shape: list of `{ userId, name, isOwner }` — where `isOwner` is true if the user is `Owner1UserId` or `Owner2UserId` on the household.

**RemoveMember(requestingUserId, householdId, targetUserId):**
- If `requestingUserId == targetUserId`, return error: "Use the leave action to remove yourself."
- Verify requesting user is an owner (`Owner1UserId || Owner2UserId`).
- If target user is `Owner1UserId` or `Owner2UserId`, return error: "Owners must be demoted before they can be removed, or they can leave voluntarily."
- Set target `User.HouseholdId = null`.
- Delete target user's personal TripItems from household trips.

**PromoteToOwner(requestingUserId, householdId, targetUserId):**
- Verify requesting user is an owner.
- Set target as `Owner2UserId` (or `Owner1UserId` if slot is open).
- Error if both owner slots are filled.

**DemoteOwner(requestingUserId, householdId, targetUserId):**
- Verify requesting user is an owner.
- Cannot demote if it would leave the household with zero owners.
- Clear the target's owner slot. Target remains a member (their `HouseholdId` is unchanged).

**RegenerateInviteCode / GetInviteCode:**
- Owner check: `Owner1UserId || Owner2UserId`.

#### InventoryService

- `GetAllUserInventory` simplifies: personal items + single household items (no loop over multiple households).
- `GetHouseholdInventory` membership check becomes `user.HouseholdId == householdId`.
- `CreateInventoryItem` membership check becomes `user.HouseholdId == householdId`.
- Same pattern for all household-scoped operations.

#### StoreService

- Same simplification as InventoryService — membership is a single field check.

#### TripService

- `CreateTrip` accepts optional `HouseholdId`. If provided, verify `user.HouseholdId == householdId`.
- `GetUserTrips` returns:
  - Personal trips: `CreatedBy == userId && HouseholdId == null`
  - Household trips: `HouseholdId == user.HouseholdId`
- `GetTripItems` applies visibility filtering:
  - On a household trip: return items where `CreatedBy == userId` OR `IsHouseholdItem == true` (household items visible to all, personal items only to creator).
  - On a personal trip: return all items (no filtering needed).
- **Authorization for all trip operations** (update, delete, start, complete, reopen):
  - Personal trip (`HouseholdId == null`): only the creator (`CreatedBy == userId`).
  - Household trip (`HouseholdId != null`): any member (`user.HouseholdId == trip.HouseholdId`).
  - Replaces all existing `IsUserCollaborator` checks.

#### TripItemService

- When adding a TripItem, set `IsHouseholdItem` based on the source InventoryItem's scope (`InventoryItem.HouseholdId IS NOT NULL`).
- SSE event publishing remains, but the controller-side filtering handles visibility (see TripEventsController below).

---

### API Changes

#### HouseholdController

| Endpoint | Change |
|----------|--------|
| `GET /api/v1/household` | Returns single household or 200 with null (no household is not an error) |
| `GET /api/v1/household/{id}` | Membership check: `user.HouseholdId == id` |
| `POST /api/v1/household` | Create with auto-swap (re-evaluates scenario at execution time) |
| `PUT /api/v1/household/{id}` | Unchanged (member access) |
| `DELETE /api/v1/household/{id}` | Owner check: `Owner1UserId \|\| Owner2UserId` |
| `POST /api/v1/household/join` | Join with auto-swap (re-evaluates scenario at execution time) |
| `GET /api/v1/household/{id}/members` | Returns list of `{ userId, name, isOwner }` |
| `DELETE /api/v1/household/{id}/members/{targetUserId}` | Owner removes member (self-removal blocked; owner removal blocked) |
| `PUT /api/v1/household/{id}/owner/promote` | Promote a member to owner. Body: `{ userId }` |
| `PUT /api/v1/household/{id}/owner/demote` | Demote an owner to member. Body: `{ userId }`. Blocked if zero owners would remain. |
| `POST /api/v1/household/{id}/leave` | Leave household (with ownership/sole-member guards) |
| `GET /api/v1/household/{id}/invite-code` | Unchanged |
| `POST /api/v1/household/{id}/invite-code` | Unchanged |

New endpoint: `GET /api/v1/household/swap-status` — returns the user's current household swap scenario so the frontend knows which modal to show before attempting join/create. This endpoint is advisory; the backend re-evaluates at execution time. Response shape:

```json
{
  "scenario": "none | regular-member | has-co-owner | sole-member | ownership-transfer-required",
  "currentHouseholdId": "guid | null",
  "currentHouseholdName": "string | null",
  "coOwnerName": "string | null"
}
```

#### TripController

| Endpoint | Change |
|----------|--------|
| `POST /api/v1/trip` | Accepts optional `householdId` |
| `GET /api/v1/trip/user` | Returns personal + household trips |
| `GET /api/v1/tripitem/trip/{tripId}` | Filters personal items by visibility rules using `IsHouseholdItem` |
| All trip mutation endpoints | Authorization: creator-only for personal trips, any household member for household trips. Replaces `IsUserCollaborator`. |

#### TripEventsController

| Endpoint | Change |
|----------|--------|
| `GET /api/v1/trips/{tripId}/events` | Authorization: replace `IsUserCollaborator` with creator check (personal trip) or household membership check (household trip). SSE stream filters events: skip personal TripItem events (`IsHouseholdItem == false`) where `CreatedBy != subscriberUserId`. |

#### UserPreferencesController

| Endpoint | Change |
|----------|--------|
| `PUT /api/v1/userpreferences` | Includes `showHouseholdPage` (bool?) |
| `GET /api/v1/userpreferences` | Response includes `showHouseholdPage` (bool) |

DTO changes:
- `UpdateUserPreferencesRequest`: add `ShowHouseholdPage` (bool?)
- Response DTO: add `ShowHouseholdPage` (bool)

---

### Frontend Changes

#### State Management

- **Delete** `household-atoms.ts` (`selectedHouseholdIdAtom`). No longer needed.
- Household context comes from user data or a single `useHouseholdQuery()`.

#### ScopeFilter (pantry + add-trip-items)

- **In a household:** Three tabs — All | Personal | {Name} Household
- **Solo:** No filter rendered. Everything is implicitly personal.

#### ScopeSelect → Radio Buttons

- **In a household:** Radio group — "Personal" and "{Name} Household"
- **Solo:** Hidden entirely. Scope is implicitly personal.
- Used in create/edit forms for items, stores, and trips.

#### Household Page (redesigned)

- **No household:** Prompt to create or join (invite code input).
- **In a household:**
  - Household name displayed prominently at top.
  - Member display: grid of circles with user initial(s) inside, full name below each circle. Aligned columns, wraps naturally.
  - Invite code section (view + copy, regenerate for owners).
  - Management actions: leave, delete (owners), promote/demote owners.

#### Settings Page

- New toggle: "Show Household page" — controls bottom nav tab visibility.
- Default: `true`.
- Joining or creating a household auto-resets this to `true`.
- Hiding removes the bottom nav tab; the page remains accessible by direct URL.
- When hidden, remaining 4 bottom nav tabs space evenly (flex handles this naturally).

#### Trip Creation

- Radio buttons: Personal or {Name} Household (same pattern as items/stores).
- Solo users: hidden, implicitly personal.

#### Trip List & Detail Views

- Household trips visible to all members.
- Personal items on a household trip only visible to the person who added them (using `IsHouseholdItem` flag on TripItem).
- Item counts and progress reflect only what the viewer can see.

#### Auto-Swap Confirmation Modal

Five scenarios:

1. **`none`:** No modal needed. Proceed directly.

2. **`regular-member`:**
   - Message: "Joining {New Household} will remove you from {Current Household}."
   - Action: Long-press "Yes" for 5 seconds.

3. **`has-co-owner`:**
   - Message: "You're an owner of {Current Household}. Joining {New Household} will remove you from {Current Household}. {Other Owner} will remain as owner."
   - Action: Long-press "Yes" for 5 seconds.

4. **`sole-member`:**
   - Message: "You're the only member of {Current Household}. By joining {New Household}, your current household will be deleted with all of its data."
   - Action: Long-press "Yes" for 5 seconds.

5. **`ownership-transfer-required`:**
   - Message: "You cannot join this household until you transfer ownership of your current household to one of the other members."
   - Action: Dismiss button only. No join action.

Same five states apply to creating a new household, with "Creating a new household" substituted for "Joining {New Household}".

#### Components to Delete or Simplify

- `ScopeSelect` → replaced by a shared radio button group component.
- `ScopeFilter` → simplified: conditional 3-tab or hidden.
- `useStoresQuery` → no more N+1 fan-out. At most 2 calls (personal + one household).
- `household-atoms.ts` → deleted.
- `sort-households.ts` → deleted (only one household).
- `use-households.query.ts` → deleted (replaced by singular `useHouseholdQuery`).
- `household-page.tsx` (list view) → redesigned as singular household view.
- `create-household-page.tsx` and `join-household-page.tsx` → consolidated into the household page or modals.

#### Utility Functions Affected

- `getStoreDisplayNames` → simplify (no multi-household disambiguation needed).

---

### Migration Plan

1. Delete all existing EF Core migrations.
2. Delete the SQLite database file.
3. Update `CartDbContext.OnModelCreating` with the new schema (including new `Trip` entity configuration block).
4. Generate a single fresh initial migration.
5. Run `dotnet ef database update` to create the clean database.

---

### Out of Scope

- Server-sent events for real-time household trip updates (deferred to contributor/SSE epic). Note: SSE event visibility filtering IS included in this migration (TripEventsController changes). The deferred work is the broader SSE architecture for household-level notifications.
- Future trip collaboration features beyond household membership (deferred to contributor/SSE epic).
