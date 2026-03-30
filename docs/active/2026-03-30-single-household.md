# Single Household Architecture

## Design Spec

### Overview

Drop support for multiple household memberships. A user can belong to at most one household at a time. This simplifies the data model (eliminates the `HouseholdMember` join table), the API surface, and the frontend UX (removes multi-household scope filters and selectors).

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

---

### Data Model

#### User (modified)

```
User
  Id              Guid        PK
  Email           string      unique, max 254
  PasswordHash    string      max 256, JSON-ignored
  Name            string      max 64
  HouseholdId     Guid?       FK → Household (SetNull on household delete)
```

#### Household (modified)

```
Household
  Id                    Guid        PK
  Name                  string?
  InviteCode            string      unique, max 8
  Owner1UserId          Guid        FK → User
  Owner2UserId          Guid?       FK → User
```

#### HouseholdMember (deleted)

Removed entirely. Membership is implicit: `User.HouseholdId IS NOT NULL`.

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

#### TripItem (unchanged structurally)

Personal items added to a household trip: the `CreatedBy` audit field determines visibility. On a household trip, a TripItem referencing a personal InventoryItem is only returned to the user whose `CreatedBy` matches.

#### InventoryItem (unchanged)

```
InventoryItem
  Id              Guid        PK
  Name            string      required
  DefaultStoreId  Guid?       FK → Store (SetNull)
  Notes           string?
  OwnerUserId     Guid?       FK → User
  HouseholdId     Guid?       FK → Household (Cascade delete)
```

#### Store (unchanged)

```
Store
  Id              Guid        PK
  Name            string      required
  HouseholdId     Guid?       FK → Household (Cascade delete)
  UserId          Guid?       FK → User
```

#### UserPreferences (modified)

```
UserPreferences
  Id                Guid        PK
  UserId            Guid        unique, FK → User (Cascade delete)
  DefaultPage       string?
  ShowHouseholdPage bool        default true
  ...existing location fields...
```

#### Indexes

| Table | Columns | Type | Rationale |
|-------|---------|------|-----------|
| User | Email | Unique | Login lookup (exists today) |
| User | HouseholdId | Non-unique | "Get all members of household" query |
| Household | InviteCode | Unique | Join-by-code lookup (exists today) |
| Household | Owner1UserId | Non-unique | Ownership validation |
| Household | Owner2UserId | Non-unique | Ownership validation |
| InventoryItem | HouseholdId | Non-unique | Household items query |
| InventoryItem | OwnerUserId | Non-unique | Personal items query |
| Store | HouseholdId | Non-unique | Household stores query |
| Store | UserId | Non-unique | Personal stores query |
| Store | (Name, HouseholdId) | Unique (filtered, where HouseholdId IS NOT NULL) | Duplicate name prevention within household scope |
| Store | (Name, UserId) | Unique (filtered, where UserId IS NOT NULL) | Duplicate name prevention within personal scope |
| Trip | HouseholdId | Non-unique | Household trips query |
| Trip | CreatedBy | Non-unique | Personal trips query / user's trips lookup |
| TripItem | TripId | Non-unique | Items-for-trip query |
| TripItem | InventoryItemId | Non-unique | Denormalized name sync on item rename |
| TripItem | StoreId | Non-unique | Denormalized name sync on store rename |
| UserPreferences | UserId | Unique | One-to-one lookup (exists today) |

Note: SQLite does not support filtered/partial unique indexes. The store name uniqueness within scope will continue to be enforced at the service layer, as it is today. The composite indexes on `(Name, HouseholdId)` and `(Name, UserId)` are regular non-unique indexes to speed up the duplicate-check query.

#### Cascade Behaviors

| Parent Delete | Child | Behavior |
|---------------|-------|----------|
| Household | User.HouseholdId | SetNull (members become solo) |
| Household | InventoryItem | Cascade delete |
| Household | Store | Cascade delete |
| Household | Trip | Cascade delete |
| Store | InventoryItem.DefaultStoreId | SetNull |
| Store | TripItem.StoreId | SetNull |
| InventoryItem | TripItem.InventoryItemId | SetNull |
| Trip | TripItem | Cascade delete |
| User | UserPreferences | Cascade delete |

---

### Backend Service Changes

#### HouseholdService

**CreateHousehold(userId, name):**
1. If user has a household, run auto-swap logic (see below).
2. Create household with `Owner1UserId = userId`.
3. Set `User.HouseholdId` to new household.

**JoinHousehold(userId, inviteCode):**
1. Find household by invite code.
2. If user has a household, run auto-swap logic (see below).
3. Set `User.HouseholdId` to new household.

**Auto-swap logic (called by create and join):**
- Determine the user's current household and role.
- Return a swap scenario to the frontend (see modal states below). The frontend must confirm before the swap executes.
- On confirmed swap:
  - If user is an owner and other owner exists: set `User.HouseholdId = null`. If user was `Owner1UserId`, move `Owner2UserId` into `Owner1UserId` slot (keep one populated). If user was `Owner2UserId`, just clear it.
  - If user is the sole member: delete the household entirely (cascades items, stores, trips).
  - If user is an owner with no co-owner but other members exist: **block the swap** — return error.
  - If user is a non-owner member: set `User.HouseholdId = null`.

**LeaveHousehold(userId):**
- Same ownership/membership checks as auto-swap.
- Sets `User.HouseholdId = null`.

**DeleteHousehold(userId, householdId):**
- Verify `userId == Owner1UserId || userId == Owner2UserId`.
- Delete household (cascades everything).

**GetMembers(householdId):**
- Query `Users.Where(u => u.HouseholdId == householdId)`.

**RemoveMember(requestingUserId, householdId, targetUserId):**
- Verify requesting user is an owner.
- Cannot remove the other owner (equal permissions — must demote first or they leave voluntarily).
- Set target `User.HouseholdId = null`.

**PromoteToOwner(requestingUserId, householdId, targetUserId):**
- Verify requesting user is an owner.
- Set target as `Owner2UserId` (or `Owner1UserId` if slot is open).
- Error if both owner slots are filled.

**DemoteOwner(requestingUserId, householdId, targetUserId):**
- Verify requesting user is an owner.
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
  - On a household trip: return items where `CreatedBy == userId` OR the referenced `InventoryItem.HouseholdId IS NOT NULL` (household items visible to all, personal items only to creator).
  - On a personal trip: return all items (no filtering needed).

---

### API Changes

#### HouseholdController

| Endpoint | Change |
|----------|--------|
| `GET /api/v1/household` | Returns single household or empty/404 |
| `GET /api/v1/household/{id}` | Membership check: `user.HouseholdId == id` |
| `POST /api/v1/household` | Create with auto-swap |
| `PUT /api/v1/household/{id}` | Unchanged (member access) |
| `DELETE /api/v1/household/{id}` | Owner check: `Owner1UserId \|\| Owner2UserId` |
| `POST /api/v1/households/join` | Join with auto-swap |
| `GET /api/v1/household/{id}/members` | Query users by `HouseholdId` |
| `DELETE /api/v1/household/{id}/members/{targetUserId}` | Owner removes member |
| `PUT /api/v1/household/{id}/owner` | Promote/demote owner |
| `GET /api/v1/household/{id}/invite-code` | Unchanged |
| `POST /api/v1/household/{id}/invite-code` | Unchanged |

New endpoint: `GET /api/v1/household/swap-status` — returns the user's current household swap scenario so the frontend knows which modal to show before attempting join/create. Response includes: scenario type (`none`, `has-co-owner`, `sole-member`, `owner-blocked`), current household name, and co-owner name if applicable.

#### TripController

| Endpoint | Change |
|----------|--------|
| `POST /api/v1/trip` | Accepts optional `householdId` |
| `GET /api/v1/trip/user` | Returns personal + household trips |
| `GET /api/v1/tripitem/trip/{tripId}` | Filters personal items by visibility rules |

#### UserPreferencesController

| Endpoint | Change |
|----------|--------|
| `PUT /api/v1/userpreferences` | Includes `showHouseholdPage` |

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

- New toggle: "Show Household page" — controls navbar link visibility.
- Default: `true`.
- Hiding only removes the nav link; the page remains accessible by direct URL.

#### Trip Creation

- Radio buttons: Personal or {Name} Household (same pattern as items/stores).
- Solo users: hidden, implicitly personal.

#### Trip List & Detail Views

- Household trips visible to all members.
- Personal items on a household trip only visible to the person who added them.
- Item counts and progress reflect only what the viewer can see.

#### Auto-Swap Confirmation Modal

Three states, all with "No" to dismiss:

1. **Co-owner exists:**
   - Message: "You're an owner of {Current Household}. Joining {New Household} will remove you from {Current Household}. {Other Owner} will remain as owner."
   - Action: Long-press "Yes" for 5 seconds.

2. **Sole member (no other members):**
   - Message: "You're the only member of {Current Household}. By joining {New Household}, your current household will be deleted with all of its data."
   - Action: Long-press "Yes" for 5 seconds.

3. **Owner without co-owner, but other members exist:**
   - Message: "You cannot join this household until you transfer ownership of your current household to one of the other members."
   - Action: Dismiss button only. No join action.

Same three states apply to creating a new household, with "Creating a new household" substituted for "Joining {New Household}".

#### Components to Delete or Simplify

- `ScopeSelect` → replaced by a shared radio button group component.
- `ScopeFilter` → simplified: conditional 3-tab or hidden.
- `useStoresQuery` → no more N+1 fan-out. At most 2 calls (personal + one household).
- `household-atoms.ts` → deleted.
- `household-page.tsx` (list view) → redesigned as singular household view.
- `create-household-page.tsx` and `join-household-page.tsx` → consolidated into the household page or modals.

#### Utility Functions Affected

- `sortHouseholds` → likely removable (only one household).
- `getStoreDisplayNames` → simplify (no multi-household disambiguation needed).

---

### Migration Plan

1. Delete all existing EF Core migrations.
2. Delete the SQLite database file.
3. Update `CartDbContext.OnModelCreating` with the new schema.
4. Generate a single fresh initial migration.
5. Run `dotnet ef database update` to create the clean database.

---

### Out of Scope

- Trip collaborator UX changes (deferred to contributor/SSE epic).
- Server-sent events for real-time household trip updates (deferred to contributor/SSE epic).
