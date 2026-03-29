# UI Fixes & Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bugs and implement UI enhancements across the Cart app — covers EF Core tracking bugs, layout fixes, sorting, nav changes, button improvements, trip snapshot behavior, and login page redesign.

**Architecture:** Backend fixes target EF Core entity tracking in repository update methods and trip lifecycle semantics. Frontend changes are scattered across pages and shared components. Most tasks are independent and can be parallelized.

**Tech Stack:** .NET 10 / EF Core (backend), React 19 / Tailwind CSS 4 / TanStack Query (frontend), Vitest + RTL (tests)

---

## Design Decisions (from discussion with August)

### Items, Stores, and Households
- **Stores** are scoped to a household or personal — no changes needed.
- **Items** are scoped to a household or personal — no changes needed.
- **Items have a default store** but aren't locked to it. A trip item can use any store.
- **Trip items** carry their own `StoreId` and denormalized `ItemName`/`StoreName`, so each trip records which store was used independently.

### Completed Trips Are Historical Records
- Renaming a pantry item or store should only propagate to items on **non-completed** trips.
- Once a trip is completed, the denormalized names are frozen — they represent what was actually purchased.
- Reopening a trip is for fixing details (quantities, check states), not for syncing with current pantry names. If a rename happens during the reopened window, that's acceptable.

### Trip Timestamps Are Set-Once
- `StartedAt` records when the trip was **first** started. Never cleared or overwritten.
- `CompletedAt` records when the trip was **first** completed. Never cleared or overwritten.
- `ModifiedDate` (managed by EF Core) tracks the latest change to the trip, covering reopens and re-completions.

### Trip/Household Association
- Removal is still planned (Task 2) — trips can contain items from any scope, so the association is misleading.

---

## File Structure

### Backend files to modify:
- `backend/AGDevX.Cart.Data/Repositories/InventoryRepository.cs` — fix entity tracking on Update
- `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs` — fix entity tracking on Update, filter rename propagation
- `backend/AGDevX.Cart.Services/InventoryService.cs` — update tracked entity instead of passing new one
- `backend/AGDevX.Cart.Services/TripService.cs` — remove HouseholdId from create/update, set-once timestamps
- `backend/AGDevX.Cart.Api/Controllers/TripController.cs` — remove HouseholdId from create/update
- `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs` — remove HouseholdId
- `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs` — remove HouseholdId
- `backend/AGDevX.Cart.Data/Models/Trip.cs` — remove HouseholdId property

### Frontend files to modify:
- `frontend/src/pages/login-page.tsx` — redesign
- `frontend/src/pages/components/page-header.tsx` — remove name display
- `frontend/src/pages/shopping-page.tsx` — greeting alignment, header text, create form changes, nav rename, button text, empty state logic
- `frontend/src/features/bottom-nav/bottom-nav.tsx` — reorder tabs, rename "Trips" to "Shopping"
- `frontend/src/pages/pantry-page.tsx` — move Add button below segmented control, scope default
- `frontend/src/pages/pantry-items-view.tsx` — empty state logic, sorting, scope default
- `frontend/src/pages/pantry-stores-view.tsx` — empty state logic, sorting
- `frontend/src/pages/add-trip-items-page.tsx` — split segmented controls to two lines
- `frontend/src/pages/household-detail-page.tsx` — delete button active state
- `frontend/src/pages/household-page.tsx` — sorting
- `frontend/src/pages/create-household-page.tsx` — button text
- `frontend/src/pages/settings-page.tsx` — header text
- `frontend/src/pages/components/trip-card.tsx` — remove scope edit, kebab menu overflow fix
- `frontend/src/pages/components/trip-item-row.tsx` — kebab menu overflow fix, spinner in button
- `frontend/src/pages/active-trip-page.tsx` — spinner in button
- `frontend/src/pages/trip-detail-page.tsx` — empty state logic
- `frontend/src/styles/globals.css` — spinner animation, cursor fix
- `frontend/src/pages/register-page.tsx` — investigate password criteria
- `frontend/src/apis/agdevx-cart-api/models/trip.ts` — remove householdId
- `frontend/src/apis/agdevx-cart-api/trip/create-trip.mutation.ts` — remove householdId
- `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts` — remove householdId

### Frontend files to create:
- `frontend/src/pages/components/spinner.tsx` — shared spinner component for buttons
- `frontend/src/pages/components/dropdown-menu.tsx` — portal-based dropdown for kebab menus

---

## Task 1: Fix EF Core Entity Tracking Conflict on Updates

This is the root cause of items 7, 11, and the default store change error. The pattern is: a service fetches an entity (which EF Core begins tracking), then the repository's `Update()` calls `context.Set.Update()` which tries to re-attach the same (or a different instance with the same key).

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/InventoryRepository.cs:50-57`
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs:32-37`
- Modify: `backend/AGDevX.Cart.Services/InventoryService.cs:112-146`
- Test: `backend/AGDevX.Cart.Data.Tests/` (existing tests)

### Why two different fixes

**InventoryRepository:** The controller creates a **new** `InventoryItem` object (not the tracked one) and passes it through the service to the repository. The service also calls `GetById()` to authorize, which tracks the original entity. When `Update()` tries to attach the new instance, EF Core throws because the original is already tracked. **Fix:** Have the service update the already-tracked entity's properties instead of passing through the controller's new object.

**TripItemRepository:** The service calls `GetById()` (which tracks the entity), modifies the tracked entity directly, then passes it to `Update()` which calls `context.TripItems.Update()`. Calling `Update()` on an already-tracked entity is redundant and can cause conflicts when navigation properties are involved. **Fix:** Remove the `Update()` call and just call `SaveChangesAsync()`, since the entity is already tracked and modified.

- [ ] **Step 1: Fix InventoryService.UpdateInventoryItem to update the tracked entity**

In `backend/AGDevX.Cart.Services/InventoryService.cs`, change `UpdateInventoryItem` to update the entity returned by `GetById` (which is already tracked) instead of passing the controller's new entity to the repository:

```csharp
public async Task<InventoryItem> UpdateInventoryItem(InventoryItem inventoryItem, Guid userId, CancellationToken cancellationToken = default)
{
    //== Authorization: verify access before update
    var existing = await GetById(inventoryItem.Id, userId, cancellationToken)
                        ?? throw new UnauthorizedAccessException("Inventory item not found or user not authorized");

    //== Handle scope change
    if (inventoryItem.HouseholdId.HasValue)
    {
        //== Moving to household: verify membership
        var household = await householdRepository.GetById(inventoryItem.HouseholdId.Value, cancellationToken)
                            ?? throw new UnauthorizedAccessException("Household not found");

        if (!household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }

        //== Clear personal owner when moving to household
        existing.OwnerUserId = null;
        existing.HouseholdId = inventoryItem.HouseholdId;
    }
    else
    {
        //== Moving to personal: set owner, clear household
        existing.OwnerUserId = userId;
        existing.HouseholdId = null;
    }

    //== Update properties on the tracked entity
    existing.Name = inventoryItem.Name;
    existing.Notes = inventoryItem.Notes;
    existing.DefaultStoreId = inventoryItem.DefaultStoreId;

    var result = await inventoryRepository.Update(existing, cancellationToken);

    //== Live mirror: update denormalized ItemName on all TripItems
    await tripItemRepository.UpdateItemNameByInventoryItemId(inventoryItem.Id, inventoryItem.Name, cancellationToken);

    return result;
}
```

- [ ] **Step 2: Fix TripItemRepository.Update to not re-attach tracked entities**

In `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`, change `Update` to use `Entry().State` instead of `context.TripItems.Update()`:

```csharp
public async Task<TripItem> Update(TripItem tripItem, CancellationToken cancellationToken = default)
{
    context.Entry(tripItem).State = EntityState.Modified;
    await context.SaveChangesAsync(cancellationToken);
    return tripItem;
}
```

- [ ] **Step 3: Apply the same fix to InventoryRepository.Update**

In `backend/AGDevX.Cart.Data/Repositories/InventoryRepository.cs`:

```csharp
public async Task<InventoryItem> Update(InventoryItem inventoryItem, CancellationToken cancellationToken = default)
{
    context.Entry(inventoryItem).State = EntityState.Modified;
    await context.SaveChangesAsync(cancellationToken);

    //== Reload to include navigation properties
    return (await GetById(inventoryItem.Id, cancellationToken))!;
}
```

- [ ] **Step 4: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass

- [ ] **Step 5: Manually verify the fix**

Test these three scenarios:
1. Edit a pantry item's name
2. Change the default store of a pantry item
3. Edit the quantity of an item in an active shopping trip

All should succeed without the entity tracking error.

- [ ] **Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/InventoryRepository.cs backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs backend/AGDevX.Cart.Services/InventoryService.cs
git commit -m "fix: resolve EF Core entity tracking conflict on inventory and trip item updates"
```

---

## Task 2: Freeze Denormalized Names on Completed Trips

Renaming a pantry item or store currently propagates to ALL trip items, including completed trips. Completed trips are historical records — their names should be frozen at completion time.

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs:49-63`
- Test: `backend/AGDevX.Cart.Data.Tests/` (existing tests)

- [ ] **Step 1: Filter UpdateItemNameByInventoryItemId to non-completed trips**

In `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`, change `UpdateItemNameByInventoryItemId`:

```csharp
public async Task UpdateItemNameByInventoryItemId(Guid inventoryItemId, string itemName, CancellationToken cancellationToken = default)
{
    await context.TripItems
        .Where(ti => ti.InventoryItemId == inventoryItemId)
        .Where(ti => !ti.Trip.IsCompleted)
        .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.ItemName, itemName), cancellationToken);
}
```

- [ ] **Step 2: Filter UpdateStoreNameByStoreId to non-completed trips**

In the same file, change `UpdateStoreNameByStoreId`:

```csharp
public async Task UpdateStoreNameByStoreId(Guid storeId, string storeName, CancellationToken cancellationToken = default)
{
    await context.TripItems
        .Where(ti => ti.StoreId == storeId)
        .Where(ti => !ti.Trip.IsCompleted)
        .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.StoreName, storeName), cancellationToken);
}
```

- [ ] **Step 3: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs
git commit -m "fix: only propagate item/store renames to non-completed trips"
```

---

## Task 3: Make Trip Timestamps Set-Once

`StartedAt` and `CompletedAt` should record when the trip was **first** started/completed and never be overwritten. `ModifiedDate` (managed by EF Core) tracks the latest change.

**Files:**
- Modify: `backend/AGDevX.Cart.Services/TripService.cs:91-148`
- Test: `backend/AGDevX.Cart.Services.Tests/` (existing tests)

- [ ] **Step 1: Update StartTrip to only set StartedAt on first start**

In `backend/AGDevX.Cart.Services/TripService.cs`, change `StartTrip`:

```csharp
public async Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
{
    //== Verify user is collaborator before starting trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId, cancellationToken)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.IsStarted = true;

    //== Only set StartedAt on first start — historical timestamp
    if (!trip.StartedAt.HasValue)
    {
        trip.StartedAt = DateTime.UtcNow;
    }

    return await tripRepository.Update(trip, cancellationToken);
}
```

- [ ] **Step 2: Update CompleteTrip to only set CompletedAt on first completion**

In the same file, change `CompleteTrip`:

```csharp
public async Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
{
    //== Verify user is collaborator before completing trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId, cancellationToken)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.IsCompleted = true;

    //== Only set CompletedAt on first completion — historical timestamp
    if (!trip.CompletedAt.HasValue)
    {
        trip.CompletedAt = DateTime.UtcNow;
    }

    return await tripRepository.Update(trip, cancellationToken);
}
```

- [ ] **Step 3: Update ReopenTrip to preserve timestamps**

In the same file, change `ReopenTrip`:

```csharp
public async Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
{
    //== Verify user is collaborator before reopening trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId, cancellationToken)
                    ?? throw new KeyNotFoundException("Trip not found");

    //== Reset status flags but preserve StartedAt and CompletedAt — historical records
    trip.IsCompleted = false;
    trip.IsStarted = false;

    return await tripRepository.Update(trip, cancellationToken);
}
```

- [ ] **Step 4: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass (fix any that assert on StartedAt/CompletedAt being cleared on reopen)

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Services/TripService.cs
git commit -m "fix: make StartedAt and CompletedAt set-once timestamps"
```

---

## Task 4: Remove Personal/Household Association from Trips

Trips can contain items from any scope, so the personal/household association is misleading.

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/Trip.cs:10-12`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs:12-13`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs:10-13`
- Modify: `backend/AGDevX.Cart.Services/TripService.cs:10-33,50-75`
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs:71-84,87-104`
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip.ts:7`
- Modify: `frontend/src/apis/agdevx-cart-api/trip/create-trip.mutation.ts:9-12`
- Modify: `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts:8-11`
- Modify: `frontend/src/pages/shopping-page.tsx:24,40,58-68,78-80,154-167,182`
- Modify: `frontend/src/pages/components/trip-card.tsx:12,17,19,22,26,73-74,91-103,159-190`
- Test: existing tests in `frontend/src/pages/tests/shopping-page.test.tsx`, `frontend/src/pages/components/tests/trip-card.test.tsx`

**Note:** This requires a database migration to drop the HouseholdId column from the Trips table. The `TripService.AddCollaborator` method references `trip.HouseholdId` for membership checks — once the column is removed, collaborator addition won't require household membership. The migration should be created but NOT applied to production in this task.

- [ ] **Step 1: Remove HouseholdId from Trip model**

In `backend/AGDevX.Cart.Data/Models/Trip.cs`, remove:
```csharp
//== Optional household this trip belongs to
public Guid? HouseholdId { get; set; }
public Household? Household { get; set; }
```

- [ ] **Step 2: Remove HouseholdId from CreateTripRequest**

In `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs`, remove:
```csharp
// Intentionally optional — null means personal trip
public Guid? HouseholdId { get; set; }
```

- [ ] **Step 3: Remove HouseholdId from UpdateTripRequest**

In `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`, remove:
```csharp
// Intentionally optional — null means personal trip
public Guid? HouseholdId { get; set; }
```

- [ ] **Step 4: Update TripService**

In `backend/AGDevX.Cart.Services/TripService.cs`:

Update `CreateTrip` — remove `householdId` parameter and household membership check:
```csharp
public async Task<Trip> CreateTrip(string name, Guid userId, CancellationToken cancellationToken = default)
{
    var trip = new Trip
    {
        Name = name,
        IsCompleted = false,
        CompletedAt = null,
        IsStarted = false,
        StartedAt = null
    };

    return await tripRepository.Create(trip, cancellationToken);
}
```

Update `UpdateTrip` — remove `householdId` parameter and household membership check:
```csharp
public async Task<Trip> UpdateTrip(Guid tripId, string name, Guid userId, CancellationToken cancellationToken = default)
{
    //== Verify user is collaborator before updating trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId, cancellationToken)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.Name = name;
    return await tripRepository.Update(trip, cancellationToken);
}
```

Update `AddCollaborator` — remove household membership check (lines 162-170):
```csharp
public async Task AddCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId, CancellationToken cancellationToken = default)
{
    //== Verify user is trip collaborator before adding new collaborators
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    await tripRepository.AddCollaborator(tripId, collaboratorUserId, cancellationToken);
}
```

- [ ] **Step 5: Update ITripService interface**

Update the interface to match the new signatures (remove `householdId` from `CreateTrip` and `UpdateTrip`).

- [ ] **Step 6: Update TripController**

In `backend/AGDevX.Cart.Api/Controllers/TripController.cs`:

Update `Create` (line 77):
```csharp
var trip = await tripService.CreateTrip(request.Name, userId, cancellationToken);
```

Update `Update` (line 93):
```csharp
await tripService.UpdateTrip(id, request.Name, userId, cancellationToken);
```

- [ ] **Step 7: Create EF Core migration**

```bash
cd backend
dotnet ef migrations add RemoveHouseholdIdFromTrip --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 8: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass (fix any that reference HouseholdId on Trip)

- [ ] **Step 9: Update frontend Trip model**

In `frontend/src/apis/agdevx-cart-api/models/trip.ts`, remove:
```typescript
householdId: string | null;
```

- [ ] **Step 10: Update create-trip.mutation.ts**

In `frontend/src/apis/agdevx-cart-api/trip/create-trip.mutation.ts`, remove `householdId` from the request interface:
```typescript
interface CreateTripRequest {
  name: string
}
```

- [ ] **Step 11: Update update-trip.mutation.ts**

In `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts`, remove `householdId` from the interface and body:
```typescript
interface UpdateTripRequest {
  tripId: string
  name: string
}
```

And update `mutationFn`:
```typescript
mutationFn: async ({ tripId, name }: UpdateTripRequest): Promise<void> => {
  await apiFetch(`/api/v1/trip/${tripId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
},
```

- [ ] **Step 12: Update shopping-page.tsx — remove scope from create form**

In `frontend/src/pages/shopping-page.tsx`:
- Remove `ScopeSelect` import
- Remove `householdId` state (line 40)
- Remove scope from `handleCreateTrip` (line 68): just `{ name: tripName.trim() }`
- Remove the "Type" label and `ScopeSelect` from the form (lines 154-167)
- Remove `householdId` from `handleUpdate` call (line 79): just `(tripId, name)`

- [ ] **Step 13: Update TripCard — remove scope edit**

In `frontend/src/pages/components/trip-card.tsx`:
- Remove `ScopeSelect` import
- Remove `households` prop from interface and component
- Remove `editHouseholdId` state
- Remove scope from `commitEdit`: just `onUpdate(trip.id, trimmed)`
- Remove scope from `cancelEdit`
- Remove the "Type" label and ScopeSelect from the edit form (lines 171-179)
- Update `onUpdate` prop type: `(tripId: string, name: string) => void`

- [ ] **Step 14: Update shopping-page.tsx — remove households from TripCard**

Remove `households` prop from all `<TripCard>` usages.
Remove `useHouseholdsQuery` import if no longer needed (check if still used for create form — it's not after removing scope).

- [ ] **Step 15: Run frontend tests and fix failures**

Run: `cd frontend && npx vitest run`
Fix any test failures related to the removed `householdId` prop.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "feat: remove personal/household association from trips"
```

---

## Task 5: Rename Nav Item and Update Page Headers

**Files:**
- Modify: `frontend/src/features/bottom-nav/bottom-nav.tsx:15-19`
- Modify: `frontend/src/pages/shopping-page.tsx:116-123`
- Modify: `frontend/src/pages/settings-page.tsx:37`
- Modify: `frontend/src/pages/components/page-header.tsx:14-23`
- Test: existing tests

- [ ] **Step 1: Reorder bottom nav and rename Trips to Shopping**

In `frontend/src/features/bottom-nav/bottom-nav.tsx`, update the `tabs` array (lines 15-20):
```typescript
const tabs = [
  { path: ROUTES.SHOPPING, label: 'Shopping', icon: ShoppingCart },
  { path: ROUTES.PANTRY, label: 'Pantry', icon: Package },
  { path: ROUTES.HOUSEHOLD, label: 'Household', icon: Users },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]
```

- [ ] **Step 2: Remove name from PageHeader**

In `frontend/src/pages/components/page-header.tsx`, remove the user name display:
```typescript
export const PageHeader = ({ children }: PageHeaderProps) => {
  return (
    <div className="px-5 pt-7 pb-4">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
        {children}
      </h1>
    </div>
  )
}
```

Remove the `useAuth` import since it's no longer needed.

- [ ] **Step 3: Update Shopping page header**

In `frontend/src/pages/shopping-page.tsx`, change line 123:
```tsx
<PageHeader>Your <span className="text-teal">Shopping Trips</span></PageHeader>
```

- [ ] **Step 4: Right-align the greeting**

In `frontend/src/pages/shopping-page.tsx`, change lines 117-121:
```tsx
<div className="px-5 pt-5 text-right">
  <p className="text-sm font-semibold text-teal">
    {greeting}, {user.name} 👋
  </p>
</div>
```

- [ ] **Step 5: Update Settings page header**

In `frontend/src/pages/settings-page.tsx`, change line 37:
```tsx
<PageHeader>Your <span className="text-teal">Settings</span></PageHeader>
```

- [ ] **Step 6: Run frontend tests and fix failures**

Run: `cd frontend && npx vitest run`
Expected: Fix any snapshot or assertion failures from the header/nav changes.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/bottom-nav/bottom-nav.tsx frontend/src/pages/components/page-header.tsx frontend/src/pages/shopping-page.tsx frontend/src/pages/settings-page.tsx
git commit -m "feat: reorder nav, rename to Shopping, update page headers, right-align greeting"
```

---

## Task 6: Rename Redundant Action Buttons

**Files:**
- Modify: `frontend/src/pages/create-household-page.tsx:82`
- Modify: `frontend/src/pages/shopping-page.tsx:182`

- [ ] **Step 1: Rename "Create Household" to "Create"**

In `frontend/src/pages/create-household-page.tsx`, change line 82:
```tsx
{createMutation.isPending ? 'Creating...' : 'Create'}
```

- [ ] **Step 2: Rename "Create Trip" to "Create"**

In `frontend/src/pages/shopping-page.tsx`, change line 182:
```tsx
{createMutation.isPending ? 'Creating...' : 'Create'}
```

- [ ] **Step 3: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/create-household-page.tsx frontend/src/pages/shopping-page.tsx
git commit -m "fix: rename redundant action buttons to just the verb"
```

---

## Task 7: Sort Households, Stores, and Items Alphabetically

**Files:**
- Modify: `frontend/src/pages/household-page.tsx:58-72`
- Modify: `frontend/src/pages/pantry-items-view.tsx:461-515,517-535`
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (wherever stores are rendered)
- Modify: `frontend/src/pages/add-trip-items-page.tsx:72-97`
- Modify: `frontend/src/pages/components/scope-select.tsx` (if households are listed there)

The sort should happen client-side in the component (or via `useMemo`) to avoid touching the API layer. Sort by `name` ascending using `localeCompare` for proper i18n support.

- [ ] **Step 1: Sort households on household page**

In `frontend/src/pages/household-page.tsx`, add a sorted memo before the render. After line 37:
```typescript
const sortedHouseholds = useMemo(
  () => [...(households || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
  [households]
)
```

Add `useMemo` to the imports. Replace `households.map` (line 60) with `sortedHouseholds.map`.

- [ ] **Step 2: Sort items in pantry-items-view**

In `frontend/src/pages/pantry-items-view.tsx`, add sorting to the items before rendering. After line 197 (`const items = activeQuery.data`), add:
```typescript
const sortedItems = useMemo(
  () => [...(items || [])].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
)
```

Replace all uses of `items` in rendering with `sortedItems` (the grouped "all" view at line 467 and the flat list at line 522). For the grouped "all" view, also sort within each group.

- [ ] **Step 3: Sort stores in pantry-stores-view**

In `frontend/src/pages/pantry-stores-view.tsx`, sort stores alphabetically within each group section before rendering.

- [ ] **Step 4: Sort items in add-trip-items-page**

In `frontend/src/pages/add-trip-items-page.tsx`, sort `filteredItems` alphabetically at the end of the `useMemo` (line 96):
```typescript
return items.sort((a, b) => a.name.localeCompare(b.name))
```

- [ ] **Step 5: Sort households in scope-select dropdowns**

Anywhere `households` is mapped to options, sort alphabetically first.

- [ ] **Step 6: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/household-page.tsx frontend/src/pages/pantry-items-view.tsx frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/components/scope-select.tsx
git commit -m "feat: sort households, stores, and items alphabetically everywhere"
```

---

## Task 8: Create Shared Spinner Component and Replace Loading Text in Buttons

**Files:**
- Create: `frontend/src/pages/components/spinner.tsx`
- Modify: `frontend/src/styles/globals.css`
- Modify: multiple page files (every button that shows "Verb...")

- [ ] **Step 1: Add spinner keyframe animation to globals.css**

In `frontend/src/styles/globals.css`, add after the existing `@keyframes checkBounce` block:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 600ms linear infinite;
}
```

- [ ] **Step 2: Create the Spinner component**

Create `frontend/src/pages/components/spinner.tsx`:
```tsx
// ABOUTME: Inline spinner for loading states in buttons
// ABOUTME: Renders a small spinning circle that replaces loading text

interface SpinnerProps {
  className?: string
}

export const Spinner = ({ className = 'w-5 h-5' }: SpinnerProps) => (
  <svg
    className={`animate-spin ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)
```

- [ ] **Step 3: Replace loading text in login-page.tsx**

In `frontend/src/pages/login-page.tsx`, import `Spinner` and change line 111:
```tsx
{loginMutation.isPending ? <Spinner /> : 'Login'}
```

- [ ] **Step 4: Replace loading text in register-page.tsx**

In `frontend/src/pages/register-page.tsx`, import `Spinner` and change line 198:
```tsx
{registerMutation.isPending ? <Spinner /> : 'Sign up'}
```

- [ ] **Step 5: Replace loading text in create-household-page.tsx**

In `frontend/src/pages/create-household-page.tsx`, import `Spinner` and change line 82:
```tsx
{createMutation.isPending ? <Spinner /> : 'Create'}
```

- [ ] **Step 6: Replace loading text in shopping-page.tsx**

In `frontend/src/pages/shopping-page.tsx`, import `Spinner` and change line 182:
```tsx
{createMutation.isPending ? <Spinner /> : 'Create'}
```

- [ ] **Step 7: Replace loading text in pantry-items-view.tsx**

Import `Spinner` and change:
- Line 295 (create button): `{createMutation.isPending ? <Spinner /> : 'Create'}`
- Line 414 (save button): `{updateMutation.isPending ? <Spinner /> : 'Save'}`

- [ ] **Step 8: Replace loading text in trip-detail-page.tsx**

Import `Spinner` and change line 125:
```tsx
{startMutation.isPending ? <Spinner /> : trip.isStarted ? 'Continue Shopping' : 'Start Shopping'}
```

Keep the ShoppingCart icon — only replace the text portion when loading.

- [ ] **Step 9: Replace loading text in active-trip-page.tsx**

Import `Spinner` and change line 219:
```tsx
{completeMutation.isPending ? <Spinner /> : 'Complete Trip'}
```

- [ ] **Step 10: Replace loading text in trip-item-row.tsx EditForm**

Import `Spinner` and change line 382:
```tsx
{isUpdating ? <Spinner className="w-4 h-4" /> : 'Save'}
```

- [ ] **Step 11: Replace loading text in security-section.tsx**

Import `Spinner` and change line 179:
```tsx
{changePasswordMutation.isPending ? <Spinner /> : 'Save'}
```

- [ ] **Step 12: Replace loading text in add-trip-items-page.tsx**

Import `Spinner` and change line 365:
```tsx
{isAdding ? <Spinner /> : `Add Items (${selectedCount} ${selectedCount === 1 ? 'item' : 'items'})`}
```

- [ ] **Step 13: Run frontend tests and fix failures**

Run: `cd frontend && npx vitest run`
Tests that assert on loading text ("Logging in...", "Creating...", etc.) will need updating to check for the Spinner component instead.

- [ ] **Step 14: Commit**

```bash
git add frontend/src/pages/components/spinner.tsx frontend/src/styles/globals.css frontend/src/pages/login-page.tsx frontend/src/pages/register-page.tsx frontend/src/pages/create-household-page.tsx frontend/src/pages/shopping-page.tsx frontend/src/pages/pantry-items-view.tsx frontend/src/pages/trip-detail-page.tsx frontend/src/pages/active-trip-page.tsx frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/components/security-section.tsx frontend/src/pages/add-trip-items-page.tsx
git commit -m "feat: replace loading text in buttons with spinner"
```

---

## Task 9: Hide Top Add Button When Empty State Is Showing

When there are no items/stores, only show the empty state add button. When items/stores exist, show the top add button and hide the empty state.

**Files:**
- Modify: `frontend/src/pages/pantry-page.tsx:56-65`
- Modify: `frontend/src/pages/pantry-items-view.tsx:317-329`
- Modify: `frontend/src/pages/pantry-stores-view.tsx`
- Modify: `frontend/src/pages/trip-detail-page.tsx:136-144,174-182`
- Modify: `frontend/src/pages/shopping-page.tsx:126-132,243-251`

- [ ] **Step 1: Pantry items — conditionally show Add button**

In `frontend/src/pages/pantry-page.tsx`, the Add button needs to be hidden when there are no items. Pass item count info up from `PantryItemsView`, or check the query data directly.

In `frontend/src/pages/pantry-page.tsx`, add the inventory query and conditionally render:
```typescript
const { data: allItems } = useInventoryQuery()
const hasItems = (allItems?.length ?? 0) > 0
```

Then wrap the Add Item button:
```tsx
{hasItems && activeTab === 'items' && (
  <button ...>
    <Plus className="w-5 h-5" />
    {showItemCreateForm ? 'Cancel' : 'Add Item'}
  </button>
)}
```

Import `useInventoryQuery`.

- [ ] **Step 2: Pantry stores — conditionally show Add button**

Same pattern in `pantry-stores-view.tsx` — the Add Store button at the top should only show when there are stores.

- [ ] **Step 3: Trip detail — conditionally show Add Items button**

In `frontend/src/pages/trip-detail-page.tsx`, the "Add Items" button (line 137-144) should only show when `tripItems && tripItems.length > 0`. When empty, only the `EmptyState` with "Add Items" action shows (already exists at line 175-181).

```tsx
{!readOnly && tripItems && tripItems.length > 0 && (
  <button onClick={() => navigate(tripAddItemsPath(tripId!))} ...>
    <Plus className="w-5 h-5" />
    Add Items
  </button>
)}
```

- [ ] **Step 4: Shopping page — conditionally show Plan Trip button**

In `frontend/src/pages/shopping-page.tsx`, the "Plan a new trip" button (line 126-132) should only show when there are trips. When empty, only the `EmptyState` "Create Trip" shows.

```tsx
{trips && trips.length > 0 && (
  <button onClick={() => { ... }} ...>
    <Plus className="w-5 h-5" />
    {showCreateForm ? 'Cancel' : 'Plan a new trip'}
  </button>
)}
```

- [ ] **Step 5: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/pantry-page.tsx frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/trip-detail-page.tsx frontend/src/pages/shopping-page.tsx
git commit -m "feat: hide top add button when empty state is showing"
```

---

## Task 10: Move Add Button Below Segmented Control on Pantry

**Files:**
- Modify: `frontend/src/pages/pantry-page.tsx:28-65`

Currently the order is: segmented control → add button → filter tabs. The add button should be below the filter tabs (between filter tabs and items).

- [ ] **Step 1: Reorder elements in pantry-page.tsx**

In `frontend/src/pages/pantry-page.tsx`, move the Add Item button block (lines 56-65) to AFTER the filter tabs block (lines 67-110). New order:
1. Segmented Control (Items/Stores)
2. Filter Tabs (Items tab only)
3. Add Item Button (Items tab only, when hasItems)
4. Items/Stores View

- [ ] **Step 2: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/pantry-page.tsx
git commit -m "fix: move add button below segmented control on pantry screen"
```

---

## Task 11: Default Scope When Adding Pantry Item Based on Current Filter

**Files:**
- Modify: `frontend/src/pages/pantry-items-view.tsx:66-68,86-99`

- [ ] **Step 1: Set default scope based on filter**

In `frontend/src/pages/pantry-items-view.tsx`, when the create form is shown, initialize `itemScope` based on the current filter:
- If `filter === 'personal'` → `itemScope = 'personal'`
- If `filter === 'household:<id>'` → `itemScope = '<id>'`
- If `filter === 'all'` → no default scope selected

Add an effect that resets scope when the create form opens:
```typescript
useEffect(() => {
  if (showCreateForm) {
    if (filter === 'personal') {
      setItemScope('personal')
    } else if (filter.startsWith('household:')) {
      setItemScope(filter.split(':')[1])
    } else {
      setItemScope('')
    }
  }
}, [showCreateForm, filter])
```

When `itemScope` is `''` (empty), add a placeholder option to the ScopeSelect or disable the submit button until a scope is selected:
```tsx
disabled={createMutation.isPending || !isCreateValid || itemScope === ''}
```

- [ ] **Step 2: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/pantry-items-view.tsx
git commit -m "feat: default pantry item scope based on current filter"
```

---

## Task 12: Split Segmented Controls on Add Items Page

**Files:**
- Modify: `frontend/src/pages/add-trip-items-page.tsx:200-278`

Currently the source filter and store filter are in a `flex gap-2` container side by side, causing horizontal overflow.

- [ ] **Step 1: Stack segmented controls vertically**

In `frontend/src/pages/add-trip-items-page.tsx`, change the container at line 200 from `flex gap-2` to `space-y-3`:

```tsx
<div className="space-y-3 mb-4">
  {/* Source filter */}
  <div className="overflow-x-auto">
    <div role="tablist" className="flex bg-bg-warm rounded-xl p-1">
      {/* ... existing source filter buttons ... */}
    </div>
  </div>

  {/* Store filter */}
  <div className="overflow-x-auto">
    <div role="tablist" className="flex bg-bg-warm rounded-xl p-1">
      {/* ... existing store filter buttons ... */}
    </div>
  </div>
</div>
```

Remove the `flex-1` class from each inner wrapper since they no longer need to split width.

- [ ] **Step 2: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx
git commit -m "fix: stack source and store filters vertically on add items page"
```

---

## Task 13: Fix Kebab Menu Clipping Inside Cards

The kebab menu dropdown is positioned `absolute` within a `relative` parent, but overflow-hidden on accordion/completed section containers clips the dropdown.

**Files:**
- Create: `frontend/src/pages/components/dropdown-menu.tsx`
- Modify: `frontend/src/pages/components/trip-card.tsx:130-155`
- Modify: `frontend/src/pages/components/trip-item-row.tsx:149-166,254-271`
- Modify: `frontend/src/pages/pantry-items-view.tsx:437-454`

- [ ] **Step 1: Create a DropdownMenu component using portal**

Create `frontend/src/pages/components/dropdown-menu.tsx`:
```tsx
// ABOUTME: Portal-based dropdown menu that escapes overflow-hidden containers
// ABOUTME: Used by kebab menus on trip cards and trip item rows

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  onClose: () => void
}

export const DropdownMenu = ({ anchorRef, children, onClose }: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
  }, [anchorRef])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleScroll = () => {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        })
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="fixed bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-50 min-w-[140px]"
      style={{ top: position.top, right: position.right }}
    >
      {children}
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Update TripCard to use DropdownMenu**

In `frontend/src/pages/components/trip-card.tsx`, replace the inline dropdown with `DropdownMenu` using a portal. Store a ref on the kebab button and pass it to `DropdownMenu`.

- [ ] **Step 3: Update TripItemRow to use DropdownMenu**

In `frontend/src/pages/components/trip-item-row.tsx`, replace both dropdown instances (planning at line 150, shopping at line 255) with `DropdownMenu`.

- [ ] **Step 4: Update pantry-items-view.tsx to use DropdownMenu**

In `frontend/src/pages/pantry-items-view.tsx`, replace the inline dropdown (line 438) with `DropdownMenu`.

- [ ] **Step 5: Run frontend tests**

Run: `cd frontend && npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/components/dropdown-menu.tsx frontend/src/pages/components/trip-card.tsx frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/pantry-items-view.tsx
git commit -m "fix: use portal-based dropdown to prevent kebab menu clipping"
```

---

## Task 14: Add Press/Active State to Delete Button on Delete Household Page

**Files:**
- Modify: `frontend/src/pages/household-detail-page.tsx:320-325`

- [ ] **Step 1: Add active state to the Delete Household button**

In `frontend/src/pages/household-detail-page.tsx`, change the Delete button class (line 322):

From:
```
w-full py-3 bg-coral text-white rounded-xl font-display font-bold hover:bg-coral/90 transition-colors
```

To:
```
w-full py-3 bg-coral text-white rounded-xl font-display font-bold hover:bg-coral/90 active:bg-coral/80 active:scale-[0.98] transition-all
```

The `active:scale-[0.98]` gives a visible press-down effect. `active:bg-coral/80` darkens the button slightly on press.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/household-detail-page.tsx
git commit -m "fix: add visible press state to delete household button"
```

---

## Task 15: Investigate and Fix Disappearing Cursor in Text Fields

This needs investigation. The user reports: cursor vanishes when clicking into a text input, reappears after clicking elsewhere in the form area, then disappears again on next click into a text input.

**Files:**
- Modify: `frontend/src/styles/globals.css` (likely)

- [ ] **Step 1: Investigate CSS cursor behavior**

Look for any CSS that could cause cursor-related issues:
1. Check if Tailwind CSS 4's reset affects cursor on inputs
2. Check if `select-none` or `cursor-pointer` on parent elements affects nested inputs
3. Check if `focus:outline-none` combined with other focus styles causes visual cursor issues
4. Check if the `caret-color` is accidentally set to transparent or matches the background

The most likely culprit: the `focus:ring-2 focus:ring-teal focus:border-transparent` combined with Tailwind's reset may be hiding the text cursor (caret). The `focus:border-transparent` might be interfering.

Another possibility: On some browsers, `user-select: none` on a parent can suppress the caret in child inputs.

- [ ] **Step 2: Add explicit caret-color to inputs**

In `frontend/src/styles/globals.css`, add a rule to ensure text inputs always show a visible caret:
```css
input, textarea, select {
  caret-color: var(--color-navy);
}
```

- [ ] **Step 3: Test in browser**

Manually test clicking into text fields to verify the cursor is visible.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "fix: ensure text input cursor is always visible"
```

---

## Task 16: Investigate Password Criteria Validation

The user reports the password criteria only updates when entering the 2nd password on the register page. Looking at the code, the criteria reads from `password` state and is rendered after the first password field — so the code appears correct.

**Files:**
- Modify: `frontend/src/pages/register-page.tsx` (if issue found)
- Modify: `frontend/src/pages/components/security-section.tsx` (if issue found)

- [ ] **Step 1: Investigate the register page**

Open the register page in a browser and type in the password field. Observe whether the criteria updates in real-time. If it does, the issue may have been a one-time browser glitch. If not, investigate:
1. Is the `password` state actually updating on keystroke?
2. Is `React.StrictMode` causing a double-render issue?
3. Add a `console.log` of `password` and `hasMinLength` to verify state changes

- [ ] **Step 2: Fix if needed**

If the issue is reproducible, the most likely cause is a React rendering optimization that prevents re-render. The `useMemo` on `values` at line 31 depends on `password`, so changes should propagate. But the criteria checks (lines 36-38) read directly from state, not from memo'd values.

If the issue is that criteria IS updating correctly, close this as "works as designed" and note it.

- [ ] **Step 3: Commit if changes made**

```bash
git add frontend/src/pages/register-page.tsx
git commit -m "fix: ensure password criteria updates on first password field"
```

---

## Task 17: Redesign Login and Register Pages

**Design:** Split Hero layout — approved by August. Full spec in `docs/active/2026-03-27-login-page-redesign.md`.

**Files:**
- Modify: `frontend/src/pages/login-page.tsx`
- Modify: `frontend/src/pages/register-page.tsx`

- [ ] **Step 1: Implement login page Split Hero layout**

In `frontend/src/pages/login-page.tsx`, replace the current centered card layout with the Split Hero design:

**Brand panel (top):**
- Full-width navy gradient (`#1B2138` → `#2E344F`)
- Cart icon: 64px teal glass container with Lucide `ShoppingCart` icon
- Logo: "AGDevX Cart" with "Cart" in teal
- Tagline: "Grocery runs, sorted" at 45% white opacity
- Feature pills: "Shared Lists" (sky blue `#38BDF8`), "Pantry" (mint `#34D399`), "Trip History" (soft purple `#A78BFA`)
- Geometric accent circles at low opacity using pill colors

**Form panel (bottom):**
- White background, `rounded-t-3xl`, negative top margin to overlap brand panel
- Heading: "Sign in"
- Email + Password fields with existing validation/focus styling
- Login button (teal)
- "Don't have an account? Sign up" link

- [ ] **Step 2: Implement register page to match**

In `frontend/src/pages/register-page.tsx`, apply the same Split Hero layout:
- Same brand panel (icon, logo, tagline, pills, accents)
- Heading: "Create your account"
- Fields: Email, Password (with criteria checklist), Confirm Password, Name
- "Sign up" button
- "Already have an account? Log in" link

- [ ] **Step 3: Run frontend tests and fix failures**

Run: `cd frontend && npx vitest run`
Fix any test assertions that reference the old layout structure.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/login-page.tsx frontend/src/pages/register-page.tsx
git commit -m "feat: redesign login and register pages with Split Hero layout"
```

---

## Task 18: Review Relationship Between Items, Stores, and Households/Personal

**Status: RESOLVED** — discussed with August on 2026-03-27. Decisions are captured in the "Design Decisions" section at the top of this plan. Implementation is covered by Tasks 2 and 3. No further action needed.
