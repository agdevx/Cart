# App Improvements Round 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12 improvements across backend data integrity, pantry inline forms, trip lifecycle, kebab menus, store grouping, store filtering, household UX, and dual notes display.

**Architecture:** Backend-first for schema changes (denormalization, FK behaviors, scope editing support), then frontend tasks grouped by dependency. TripItem gets denormalized `ItemName`/`StoreName` fields with live mirror updates. Frontend gets inline forms, accordion grouping, and UX polish.

**Tech Stack:** .NET 9 / EF Core (backend), React / TypeScript / TanStack Query / Tailwind (frontend), Vitest + React Testing Library (frontend tests), xUnit + Moq (backend tests)

**Spec:** `docs/superpowers/specs/2026-03-09-app-improvements-round2-design.md`

**Note:** Original task 5 (stopPropagation on kebab menus) was dropped — already implemented in the codebase. Task numbering from the spec is preserved; task 5 is skipped.

---

## Chunk 1: Backend Schema & Data Integrity (Task 12)

### Task 12: TripItem Denormalization, FK Behaviors, Live Mirror, and Scope Editing Support

#### File Map

- Modify: `backend/AGDevX.Cart.Data/Models/TripItem.cs`
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs` (OnModelCreating, lines 23-84)
- Modify: `backend/AGDevX.Cart.Data/Repositories/ITripItemRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`
- Modify: `backend/AGDevX.Cart.Services/TripItemService.cs` (AddTripItem lines 22-56)
- Modify: `backend/AGDevX.Cart.Services/InventoryService.cs` (UpdateInventoryItem lines 112-119)
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs` (UpdateStore lines 76-85)
- Modify: `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs` (Update endpoint)
- Modify: `backend/AGDevX.Cart.Api/Controllers/StoreController.cs` (Update endpoint)
- Create: new EF migration
- Modify: `backend/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs`
- Modify: `backend/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs`
- Modify: `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip-item.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/update-inventory-item.mutation.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/store/update-store.mutation.ts` (or equivalent)

#### Steps

- [ ] **Step 1: Add denormalized fields to TripItem model**

In `backend/AGDevX.Cart.Data/Models/TripItem.cs`:

- Change `InventoryItemId` from `public Guid InventoryItemId` to `public Guid? InventoryItemId`
- Remove the `required` keyword from `InventoryItemId` if present
- Add `public required string ItemName { get; set; }`
- Add `public string? StoreName { get; set; }`

- [ ] **Step 2: Configure FK behaviors in CartDbContext**

In `backend/AGDevX.Cart.Data/CartDbContext.cs`, add/update entity configurations in `OnModelCreating`:

```csharp
// TripItem FK behaviors
modelBuilder.Entity<TripItem>(entity =>
{
    entity.HasOne(ti => ti.InventoryItem)
          .WithMany()
          .HasForeignKey(ti => ti.InventoryItemId)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasOne(ti => ti.Store)
          .WithMany()
          .HasForeignKey(ti => ti.StoreId)
          .OnDelete(DeleteBehavior.SetNull);
});

// InventoryItem FK behaviors (merge with existing HouseholdId cascade config at lines 68-74)
modelBuilder.Entity<InventoryItem>(entity =>
{
    entity.HasOne(i => i.Household)
          .WithMany()
          .HasForeignKey(i => i.HouseholdId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(i => i.DefaultStore)
          .WithMany()
          .HasForeignKey(i => i.DefaultStoreId)
          .OnDelete(DeleteBehavior.SetNull);
});
```

**Important:** The existing InventoryItem cascade config (lines 68-74) must be merged into the new entity block, not duplicated.

**Note on deletion behavior:** The SET NULL behavior is handled entirely by the database FK constraints. No application code is needed for the deletion case — when a pantry item or store is deleted, the database automatically nulls out the FK on TripItems while preserving the denormalized `ItemName`/`StoreName`.

- [ ] **Step 3: Create EF migration**

```bash
cd backend && dotnet ef migrations add DenormalizeTripItemAndSetNullFKs --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

Review the generated migration. For existing TripItem rows, add SQL to populate `ItemName` and `StoreName` before the `ItemName` column is made non-nullable:

```csharp
// In the Up method, BEFORE altering ItemName to NOT NULL:
migrationBuilder.Sql(
    @"UPDATE ti SET ti.ItemName = ii.Name
      FROM TripItems ti
      INNER JOIN InventoryItems ii ON ti.InventoryItemId = ii.Id");

migrationBuilder.Sql(
    @"UPDATE ti SET ti.StoreName = s.Name
      FROM TripItems ti
      INNER JOIN Stores s ON ti.StoreId = s.Id");

// Handle any TripItems with orphaned InventoryItemId (shouldn't exist, but safety):
migrationBuilder.Sql(
    @"UPDATE TripItems SET ItemName = 'Unknown Item'
      WHERE ItemName IS NULL");
```

Note: This SQL syntax is SQL Server-specific (matching the project's database provider).

- [ ] **Step 4: Add repository methods for live mirror bulk updates**

In `backend/AGDevX.Cart.Data/Repositories/ITripItemRepository.cs`, add:

```csharp
Task UpdateItemNameByInventoryItemId(Guid inventoryItemId, string itemName);
Task UpdateStoreNameByStoreId(Guid storeId, string storeName);
```

In `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`, implement:

```csharp
public async Task UpdateItemNameByInventoryItemId(Guid inventoryItemId, string itemName)
{
    await context.TripItems
        .Where(ti => ti.InventoryItemId == inventoryItemId)
        .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.ItemName, itemName));
}

public async Task UpdateStoreNameByStoreId(Guid storeId, string storeName)
{
    await context.TripItems
        .Where(ti => ti.StoreId == storeId)
        .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.StoreName, storeName));
}
```

- [ ] **Step 5: Update TripItemService constructor and AddTripItem**

`TripItemService` currently takes `(ITripItemRepository, ITripRepository, ITripEventService)`. Add `IInventoryRepository` and `IStoreRepository` to the constructor:

```csharp
public class TripItemService(
    ITripItemRepository tripItemRepository,
    ITripRepository tripRepository,
    ITripEventService tripEventService,
    IInventoryRepository inventoryRepository,
    IStoreRepository storeRepository) : ITripItemService
```

Update DI registration in `Program.cs` if not using auto-registration.

In `AddTripItem`, populate the denormalized fields:

```csharp
var inventoryItem = await inventoryRepository.GetById(inventoryItemId)
    ?? throw new ArgumentException("Inventory item not found");

string? storeName = null;
if (storeId.HasValue)
{
    var store = await storeRepository.GetById(storeId.Value);
    storeName = store?.Name;
}

var tripItem = new TripItem
{
    TripId = tripId,
    InventoryItemId = inventoryItemId,
    ItemName = inventoryItem.Name,
    StoreName = storeName,
    Quantity = quantity,
    Notes = notes,
    StoreId = storeId
};
```

- [ ] **Step 6: Update InventoryService for live mirror**

Add `ITripItemRepository` to `InventoryService` constructor (currently takes `IInventoryRepository, IHouseholdRepository`):

```csharp
public class InventoryService(
    IInventoryRepository inventoryRepository,
    IHouseholdRepository householdRepository,
    ITripItemRepository tripItemRepository) : IInventoryService
```

In `UpdateInventoryItem`, add live mirror call after the update:

```csharp
public async Task UpdateInventoryItem(InventoryItem item, Guid userId)
{
    var existingItem = await GetById(item.Id, userId)
                        ?? throw new UnauthorizedAccessException("Item not found or access denied");

    await inventoryRepository.Update(item);

    // Live mirror: update denormalized ItemName on all TripItems
    await tripItemRepository.UpdateItemNameByInventoryItemId(item.Id, item.Name);
}
```

- [ ] **Step 7: Update StoreService for live mirror**

Add `ITripItemRepository` to `StoreService` constructor:

```csharp
public class StoreService(
    IStoreRepository storeRepository,
    IHouseholdRepository householdRepository,
    ITripItemRepository tripItemRepository) : IStoreService
```

In `UpdateStore`, add live mirror call after the update:

```csharp
public async Task UpdateStore(Guid storeId, string name, Guid userId)
{
    var store = await GetById(storeId, userId)
                    ?? throw new UnauthorizedAccessException("Store not found or access denied");

    store.Name = name;
    await storeRepository.Update(store);

    // Live mirror: update denormalized StoreName on all TripItems
    await tripItemRepository.UpdateStoreNameByStoreId(storeId, name);
}
```

- [ ] **Step 8: Add scope editing support to InventoryService.UpdateInventoryItem**

The spec requires editing scope (moving items between personal and household). The current `UpdateInventoryItem` replaces the whole entity. Verify the update endpoint accepts `householdId` and `ownerUserId` in the request body. If not:

In the update request model, add `HouseholdId` and `OwnerUserId` fields.

In `InventoryService.UpdateInventoryItem`, validate the new scope:
- If moving to a household: verify user is a member of that household
- If moving to personal: set `OwnerUserId = userId`, clear `HouseholdId`
- If moving from personal to household: clear `OwnerUserId`, set `HouseholdId`

Check the controller's `UpdateInventoryItemRequest` model and update it to include `householdId` if missing.

- [ ] **Step 9: Add scope editing support to StoreService.UpdateStore**

Current `UpdateStore(storeId, name, userId)` only updates the name. Extend the signature:

```csharp
public async Task UpdateStore(Guid storeId, string name, Guid? householdId, Guid userId)
{
    var store = await GetById(storeId, userId)
                    ?? throw new UnauthorizedAccessException("Store not found or access denied");

    store.Name = name;

    // Handle scope change
    if (householdId.HasValue)
    {
        // Moving to household — verify membership
        var isMember = await householdRepository.IsUserMember(householdId.Value, userId);
        if (!isMember) throw new UnauthorizedAccessException("Not a member of this household");
        store.HouseholdId = householdId;
        store.UserId = null;
    }
    else
    {
        // Personal store
        store.UserId = userId;
        store.HouseholdId = null;
    }

    await storeRepository.Update(store);
    await tripItemRepository.UpdateStoreNameByStoreId(storeId, name);
}
```

Update the controller's update endpoint to accept `householdId` in the request body. Update `UpdateStoreRequest` model.

- [ ] **Step 10: Fix existing backend tests**

Making `InventoryItemId` nullable and adding `ItemName` as required will break existing tests.

In `backend/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs`:
- Every `new TripItem { ... }` construction must add `ItemName = "Test Item"` (or appropriate name)
- `InventoryItemId` is no longer required — update test assertions that check for non-null
- Add mock setup for `IInventoryRepository` and `IStoreRepository` in the test class constructor

In `backend/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs`:
- Add mock setup for `ITripItemRepository` in the test class constructor

In `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`:
- Add mock setup for `ITripItemRepository` in the test class constructor

- [ ] **Step 11: Write new backend tests for denormalization and live mirror**

In `TripItemServiceTests.cs`:

```csharp
[Fact]
public async Task AddTripItem_PopulatesItemNameFromInventoryItem()
{
    // Arrange: mock inventoryRepository.GetById to return item with Name = "Milk"
    // Act: call AddTripItem
    // Assert: saved TripItem has ItemName = "Milk"
}

[Fact]
public async Task AddTripItem_PopulatesStoreNameWhenStoreProvided()
{
    // Arrange: mock storeRepository.GetById to return store with Name = "Costco"
    // Act: call AddTripItem with storeId
    // Assert: saved TripItem has StoreName = "Costco"
}

[Fact]
public async Task AddTripItem_StoreNameIsNullWhenNoStoreProvided()
{
    // Act: call AddTripItem without storeId
    // Assert: saved TripItem has StoreName = null
}
```

In `InventoryServiceTests.cs`:

```csharp
[Fact]
public async Task UpdateInventoryItem_UpdatesItemNameOnRelatedTripItems()
{
    // Arrange: set up mock
    // Act: update inventory item name
    // Assert: tripItemRepository.UpdateItemNameByInventoryItemId was called with correct args
}
```

In `StoreServiceTests.cs`:

```csharp
[Fact]
public async Task UpdateStore_UpdatesStoreNameOnRelatedTripItems()
{
    // Assert: tripItemRepository.UpdateStoreNameByStoreId was called with correct args
}

[Fact]
public async Task UpdateStore_CanChangeScopeToHousehold()
{
    // Arrange: personal store, mock household membership
    // Act: update with householdId
    // Assert: store.HouseholdId set, store.UserId cleared
}
```

- [ ] **Step 12: Run all backend tests**

```bash
cd backend && dotnet test AGDevX.Cart.Services.Tests/AGDevX.Cart.Services.Tests.csproj -v n
```

Expected: all tests pass.

- [ ] **Step 13: Update frontend TripItem model**

In `frontend/src/apis/agdevx-cart-api/models/trip-item.ts`, update the interface (keep existing audit fields):

```typescript
export interface TripItem {
  id: string;
  tripId: string;
  inventoryItemId: string | null; // Changed: was required string, now nullable
  itemName: string;               // New: denormalized from InventoryItem
  storeName: string | null;       // New: denormalized from Store
  quantity: number;
  storeId: string | null;
  notes: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  inventoryItem?: {               // New: nested object from Include, null if pantry item deleted
    id: string;
    name: string;
    notes: string | null;
    defaultStoreId: string | null;
  } | null;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
}
```

- [ ] **Step 14: Update frontend components to use denormalized fields**

Anywhere the frontend currently reads item name via inventory lookup or props, switch to `tripItem.itemName`. Anywhere it reads store name via Store relationship, switch to `tripItem.storeName`. Key files:
- `frontend/src/pages/components/trip-item-row.tsx` — update `itemName` display
- `frontend/src/pages/trip-detail-page.tsx` — update item name rendering
- `frontend/src/pages/active-trip-page.tsx` — update item name rendering

Check the current data flow: the pages may pass `itemName` as a prop to TripItemRow derived from an inventory items lookup. Switch to reading `item.itemName` directly from the TripItem object.

- [ ] **Step 15: Update frontend update mutations for scope editing**

In `frontend/src/apis/agdevx-cart-api/inventory/update-inventory-item.mutation.ts`:
- Add `householdId: string | null` and `ownerUserId: string | null` to the request type

In the store update mutation (find the equivalent file):
- Add `householdId: string | null` to the request type

- [ ] **Step 16: Update frontend tests for TripItem model changes**

Update all test mocks that create TripItem objects to include `itemName` and `storeName`. Update `inventoryItemId` to allow null in deletion test scenarios. Files:
- `frontend/src/pages/tests/trip-detail-page.test.tsx`
- `frontend/src/pages/tests/active-trip-page.test.tsx`
- `frontend/src/pages/tests/add-trip-items-page.test.tsx`

- [ ] **Step 17: Run frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 18: TypeScript compilation check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 19: Commit**

```bash
git add -A && git commit -m "feat: denormalize TripItem, add live mirror, SET NULL FK behaviors, scope editing support"
```

---

## Chunk 2: Kebab Menu Fixes & Trip Lifecycle (Tasks 4, 6)

### Task 6: Increase Kebab Menu Tap Target Size

#### File Map

- Modify: `frontend/src/pages/components/trip-item-row.tsx` (kebab button)
- Modify: `frontend/src/pages/pantry-items-view.tsx` (kebab button)
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (kebab button)
- Modify: `frontend/src/pages/components/trip-card.tsx` (kebab button)

#### Steps

- [ ] **Step 1: Increase tap target on all kebab menu buttons**

Find every `<button>` wrapping the `<MoreVertical>` icon in all four files. Ensure each has a minimum 44x44px tap area. The icon stays the same size (18px), but the button gets explicit sizing:

```tsx
<button
  onClick={...}
  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
>
  <MoreVertical size={18} />
</button>
```

Apply consistently to all four files.

- [ ] **Step 2: Visual check — run dev server and verify on mobile viewport**

```bash
cd frontend && npm run dev
```

Open in browser, use mobile viewport (375px). Verify kebab buttons are easy to tap.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/pantry-items-view.tsx frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/components/trip-card.tsx && git commit -m "fix: increase kebab menu tap target to 44x44px for mobile usability"
```

---

### Task 4: Trip Lifecycle Labels (Start/Continue Shopping, Update Shopping List)

#### File Map

- Modify: `frontend/src/pages/trip-detail-page.tsx` (Start Shopping button, lines 78-87)
- Modify: `frontend/src/pages/active-trip-page.tsx` (Back to Planning link, line 129)
- Modify: `frontend/src/pages/tests/trip-detail-page.test.tsx`
- Modify: `frontend/src/pages/tests/active-trip-page.test.tsx`

**Note:** The `start-trip.mutation.ts` already exists and is already imported in `trip-detail-page.tsx` (line 11). Do not recreate it.

#### Steps

- [ ] **Step 1: Write failing tests for trip detail page**

In `frontend/src/pages/tests/trip-detail-page.test.tsx`:

```typescript
it('should show "Start Shopping" when trip is not started', () => {
  // Render with trip where isStarted = false
  // Assert: button text is "Start Shopping"
});

it('should show "Continue Shopping" when trip is already started', () => {
  // Render with trip where isStarted = true
  // Assert: button text is "Continue Shopping"
});

it('should call start trip mutation when clicking "Start Shopping"', async () => {
  // Render with trip where isStarted = false
  // Click "Start Shopping"
  // Assert: start trip mutation was called
  // Assert: navigated to active page
});

it('should NOT call start trip mutation when clicking "Continue Shopping"', async () => {
  // Render with trip where isStarted = true
  // Click "Continue Shopping"
  // Assert: start trip mutation was NOT called
  // Assert: navigated to active page directly
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

- [ ] **Step 3: Implement conditional button label and behavior**

In `frontend/src/pages/trip-detail-page.tsx`, the `handleStartShopping` function (lines 32-39) currently calls `startMutation.mutateAsync()` unconditionally. Add a conditional:

```tsx
const handleStartShopping = async () => {
  if (!trip.isStarted) {
    await startMutation.mutateAsync(tripId!);
  }
  navigate(`/shopping/${tripId}/active`);
};

// In JSX, update the button label:
<button onClick={handleStartShopping}>
  {trip.isStarted ? 'Continue Shopping' : 'Start Shopping'}
</button>
```

- [ ] **Step 4: Run trip detail tests**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write failing test for active trip page label**

In `frontend/src/pages/tests/active-trip-page.test.tsx`:

```typescript
it('should show "Update Shopping List" link instead of "Back to Planning"', () => {
  // Render active trip page
  // Assert: link text is "Update Shopping List"
  // Assert: link navigates to /shopping/:tripId
});
```

- [ ] **Step 6: Update active trip page link text**

In `frontend/src/pages/active-trip-page.tsx` (line 129), change "Back to Planning" to "Update Shopping List":

```tsx
<Link to={`/shopping/${tripId}`}>
  Update Shopping List
</Link>
```

- [ ] **Step 7: Run active trip tests**

```bash
cd frontend && npx vitest run src/pages/tests/active-trip-page.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/trip-detail-page.tsx frontend/src/pages/active-trip-page.tsx frontend/src/pages/tests/trip-detail-page.test.tsx frontend/src/pages/tests/active-trip-page.test.tsx && git commit -m "feat: trip lifecycle labels - Start/Continue Shopping, Update Shopping List"
```

---

## Chunk 3: Pantry Inline Add & Edit (Tasks 1, 2, 3)

### Task 1: Inline Add Item on Pantry Page

#### File Map

- Modify: `frontend/src/pages/pantry-page.tsx` (Add Item button, lines 58-66)
- Modify: `frontend/src/pages/pantry-items-view.tsx` (add inline form, add props)
- Remove: `frontend/src/pages/add-pantry-item-page.tsx`
- Remove: `frontend/src/pages/tests/add-pantry-item-page.test.tsx`
- Modify: `frontend/src/app.tsx` (remove `/pantry/add` route at line 46 and import at line 15)
- Modify: `frontend/src/pages/tests/pantry-page.test.tsx`
- Modify: `frontend/src/pages/tests/pantry-items-view.test.tsx`

#### Steps

- [ ] **Step 1: Write failing test for inline add form toggle**

In `frontend/src/pages/tests/pantry-items-view.test.tsx`:

```typescript
it('should show inline add form when showCreateForm is true', () => {
  // Render PantryItemsView with showCreateForm=true, onCloseCreateForm callback
  // Assert: form with Name input, ScopeSelect, Notes input, Store dropdown visible
  // Assert: submit button visible
});

it('should create item and clear form on submit', async () => {
  // Render with showCreateForm=true
  // Fill in name, select scope
  // Click submit
  // Assert: create mutation called with correct data including householdId mapping
  // Assert: onCloseCreateForm callback called
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-items-view.test.tsx
```

- [ ] **Step 3: Add inline create form to PantryItemsView**

Update PantryItemsView props interface to accept new props:

```typescript
interface PantryItemsViewProps {
  filter: string;
  showCreateForm: boolean;
  onCloseCreateForm: () => void;
}
```

Add the inline form at the top of the component when `showCreateForm` is true. Form fields:
- Name (text input, required)
- Scope (ScopeSelect — Personal/Household)
- Notes (text input, optional)
- Default Store (select dropdown, optional)

**Data dependencies:** Import `useStoresQuery` and `useHouseholdsQuery` (or use existing household data) to populate the Store dropdown. Filter stores by the selected scope — personal stores when "Personal" is selected, household stores when a household is selected.

**Scope → mutation mapping:** Follow the existing pattern from `pantry-stores-view.tsx` line 70:
```tsx
const householdId = scope === 'personal' ? null : scope;
```

Wire submit to `useCreateInventoryItemMutation`. On success, clear form fields and call `onCloseCreateForm()`.

- [ ] **Step 4: Update pantry-page.tsx to toggle inline form**

In `frontend/src/pages/pantry-page.tsx`, replace the `<Link to="/pantry/add">` button (lines 58-66) with a state toggle:

```tsx
const [showItemCreateForm, setShowItemCreateForm] = useState(false);

// Replace Link with toggle button (same dashed-border style):
<button onClick={() => setShowItemCreateForm(!showItemCreateForm)}>
  + Add Item
</button>

// Pass to PantryItemsView:
<PantryItemsView
  filter={filter}
  showCreateForm={showItemCreateForm}
  onCloseCreateForm={() => setShowItemCreateForm(false)}
/>
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-items-view.test.tsx src/pages/tests/pantry-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Remove add-pantry-item-page and route**

- Delete `frontend/src/pages/add-pantry-item-page.tsx`
- Delete `frontend/src/pages/tests/add-pantry-item-page.test.tsx`
- In `frontend/src/app.tsx`: remove the `/pantry/add` route (line 46) and the `AddPantryItemPage` import (line 15)

- [ ] **Step 7: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass (no remaining references to removed page).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: inline add item form on pantry page, remove add-pantry-item-page"
```

---

### Task 2: Edit Pantry Item (Inline Expandable Form)

#### File Map

- Modify: `frontend/src/pages/pantry-items-view.tsx` (kebab menu, item card)
- Modify: `frontend/src/pages/tests/pantry-items-view.test.tsx`

#### Steps

- [ ] **Step 1: Write failing tests for edit functionality**

```typescript
it('should show Edit option in kebab menu', () => {
  // Render item with kebab menu open
  // Assert: "Edit" menu item visible alongside "Delete"
});

it('should expand inline edit form when Edit is clicked', async () => {
  // Click Edit in kebab menu
  // Assert: form appears below item with Name, Scope, Notes, Default Store fields
  // Assert: fields pre-populated with current values
});

it('should save changes and collapse form on submit', async () => {
  // Open edit form, change name
  // Click Save
  // Assert: update mutation called with new values (including householdId for scope)
  // Assert: form collapsed
});

it('should only allow one item to be edited at a time', async () => {
  // Open edit on item 1
  // Click edit on item 2
  // Assert: item 1 form closed, item 2 form open
});

it('should allow changing scope from Personal to Household', async () => {
  // Open edit on a personal item
  // Change scope to a household
  // Click Save
  // Assert: update mutation called with new householdId, ownerUserId cleared
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-items-view.test.tsx
```

- [ ] **Step 3: Add Edit option to kebab menu and implement inline edit form**

In `frontend/src/pages/pantry-items-view.tsx`:

1. Add "Edit" option to the kebab dropdown (before Delete)
2. Add `editingItemId` state to the component
3. When `editingItemId` matches the current item, render the edit form below the item card
4. The edit form is identical to the add form — same fields (Name, Scope/ScopeSelect, Notes, Default Store), same layout — but pre-populated with current values
5. Wire Save to `useUpdateInventoryItemMutation` (import it). Include `householdId`/`ownerUserId` in the mutation payload for scope changes.
6. Cancel and Save both set `editingItemId` to null
7. Opening edit on a different item closes the current one (set `editingItemId` to the new item)

**Data dependencies:** Same as Task 1 — needs `useStoresQuery` and household data for the form dropdowns. These should already be imported from Task 1.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-items-view.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/pantry-items-view.tsx frontend/src/pages/tests/pantry-items-view.test.tsx && git commit -m "feat: add inline edit form for pantry items via kebab menu"
```

---

### Task 3: Edit Store (Inline Expandable Form)

#### File Map

- Modify: `frontend/src/pages/pantry-stores-view.tsx` (inline edit, lines 128-189)
- Modify: `frontend/src/pages/tests/pantry-stores-view.test.tsx`

#### Steps

- [ ] **Step 1: Write failing tests**

```typescript
it('should expand full edit form when Edit is clicked in kebab menu', () => {
  // Click Edit in kebab menu for a store
  // Assert: expandable form appears below store row (NOT inline name replacement)
  // Assert: Name field pre-populated, Scope dropdown pre-populated
  // Assert: Save/Cancel buttons visible
});

it('should save name and scope changes on submit', async () => {
  // Open edit form, change name and scope
  // Click Save
  // Assert: update mutation called with new name and householdId
});

it('should allow changing scope from personal to household', async () => {
  // Open edit on a personal store
  // Change scope to household
  // Click Save
  // Assert: update mutation called with householdId set
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-stores-view.test.tsx
```

- [ ] **Step 3: Replace inline name-only edit with expandable form**

In `frontend/src/pages/pantry-stores-view.tsx`:

Current edit mode (lines 130-155) shows an input field + Check/X buttons that only edit the name. Replace with:

1. Remove the inline input/Check/X edit pattern
2. When `editingStoreId` matches, render an expandable form below the store row
3. Form fields: Name (text input), Scope (ScopeSelect pre-populated with current ownership)
4. Save/Cancel buttons in form footer
5. Track edit state with both name and scope values (currently only tracks `editValue` for name)
6. Wire Save to the update store mutation, passing both `name` and `householdId`

The existing `handleStartEdit` currently takes `(storeId, currentName)` — extend to also capture the current scope (householdId/personal).

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-stores-view.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/tests/pantry-stores-view.test.tsx && git commit -m "feat: replace inline name-only store edit with expandable form supporting scope changes"
```

---

## Chunk 4: Group Items by Store & Store Override/Filter (Tasks 7, 8, 9)

### Task 7: Group Shopping List & Active Trip Items by Store

#### File Map

- Create: `frontend/src/pages/components/store-accordion.tsx`
- Create: `frontend/src/hooks/use-store-accordion-state.ts`
- Modify: `frontend/src/pages/trip-detail-page.tsx` (shopping list section)
- Modify: `frontend/src/pages/active-trip-page.tsx` (item list)
- Modify: `frontend/src/pages/tests/trip-detail-page.test.tsx`
- Modify: `frontend/src/pages/tests/active-trip-page.test.tsx`

#### Steps

- [ ] **Step 1: Create the useStoreAccordionState hook**

Create `frontend/src/hooks/use-store-accordion-state.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

type AccordionState = Record<string, boolean>; // storeName -> isExpanded

const STORAGE_KEY_PREFIX = 'trip-accordion-';

export function useStoreAccordionState(tripId: string, isCompleted: boolean) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;

  const [expandedStores, setExpandedStores] = useState<AccordionState>(() => {
    if (isCompleted) return {}; // All collapsed for completed trips
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Persist to localStorage (only for non-completed trips)
  useEffect(() => {
    if (!isCompleted) {
      localStorage.setItem(storageKey, JSON.stringify(expandedStores));
    }
  }, [expandedStores, storageKey, isCompleted]);

  const toggleStore = useCallback((storeName: string) => {
    setExpandedStores(prev => ({
      ...prev,
      [storeName]: !prev[storeName],
    }));
  }, []);

  const isExpanded = useCallback((storeName: string) => {
    return expandedStores[storeName] ?? false; // Default: collapsed
  }, [expandedStores]);

  // Auto-collapse when all items in a group are checked
  const autoCollapseIfAllChecked = useCallback((storeName: string, allChecked: boolean) => {
    if (allChecked && expandedStores[storeName]) {
      setExpandedStores(prev => ({ ...prev, [storeName]: false }));
    }
  }, [expandedStores]);

  // Cleanup: remove localStorage entry (call on trip completion)
  const cleanup = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup };
}
```

- [ ] **Step 2: Create StoreAccordion component**

Create `frontend/src/pages/components/store-accordion.tsx`:

```tsx
import { ChevronDown } from 'lucide-react';

type StoreAccordionProps = {
  storeName: string;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount: number;
  checkedCount?: number;
  children: React.ReactNode;
};

export function StoreAccordion({
  storeName,
  isExpanded,
  onToggle,
  itemCount,
  checkedCount,
  children,
}: StoreAccordionProps) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-warm rounded-xl"
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-navy">
            {storeName}
          </span>
          <span className="text-sm text-text-secondary">
            {checkedCount !== undefined
              ? `${checkedCount}/${itemCount}`
              : `${itemCount}`}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write tests for store grouping**

In `frontend/src/pages/tests/trip-detail-page.test.tsx`:

```typescript
it('should group items by store name', () => {
  // Render with items: 2 with storeName "Costco", 1 with "Walmart", 1 with null
  // Assert: 3 accordion sections: "Costco", "Walmart", "Any Store"
});

it('should show "Any Store" group for items without a store', () => {
  // Render with items that have storeName = null
  // Assert: "Any Store" section exists
});

it('should sort named stores alphabetically with "Any Store" last', () => {
  // Render with items at "Walmart", "Costco", and null
  // Assert: order is "Costco", "Walmart", "Any Store"
});

it('should default all accordions to collapsed', () => {
  // Render with items grouped by store
  // Assert: no item rows visible (all accordions collapsed)
});

it('should persist accordion state in localStorage', () => {
  // Expand "Costco" section
  // Assert: localStorage has the expanded state for this tripId
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

- [ ] **Step 5: Implement grouping in trip-detail-page.tsx**

In `frontend/src/pages/trip-detail-page.tsx`:

1. Import `useStoreAccordionState` and `StoreAccordion`
2. Use `useStoreAccordionState(tripId, trip.isCompleted)` — the Trip model has `isCompleted` (verify via the trip query response; if not available, derive from `trip.completedAt !== null`)
3. Group trip items by `storeName`:

```tsx
const { isExpanded, toggleStore } = useStoreAccordionState(tripId!, trip.isCompleted);

const groupedItems = useMemo(() => {
  const groups: Record<string, TripItem[]> = {};
  items.forEach(item => {
    const key = item.storeName ?? 'Any Store';
    (groups[key] ??= []).push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === 'Any Store') return 1;
    if (b === 'Any Store') return -1;
    return a.localeCompare(b);
  });
}, [items]);
```

4. Render grouped items:

```tsx
{groupedItems.map(([storeName, storeItems]) => (
  <StoreAccordion
    key={storeName}
    storeName={storeName}
    isExpanded={isExpanded(storeName)}
    onToggle={() => toggleStore(storeName)}
    itemCount={storeItems.length}
  >
    {storeItems.map(item => (
      <TripItemRow key={item.id} item={item} ... />
    ))}
  </StoreAccordion>
))}
```

- [ ] **Step 6: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Write tests for active trip page grouping with auto-collapse**

In `frontend/src/pages/tests/active-trip-page.test.tsx`:

```typescript
it('should group items by store on active trip page', () => {
  // Same grouping assertions as trip detail page
});

it('should auto-collapse store group when all items are checked', async () => {
  // Render with 2 items at "Costco", expand the section
  // Check both items
  // Assert: "Costco" section auto-collapsed
});

it('should clean up localStorage when trip is completed', async () => {
  // Set localStorage with accordion state for tripId
  // Complete the trip
  // Assert: localStorage entry removed
});
```

- [ ] **Step 8: Implement grouping in active-trip-page.tsx**

Same grouping pattern as trip-detail-page. Additionally:
- Use `autoCollapseIfAllChecked` — after an item's checked state changes, check if all items in that group are checked and auto-collapse if so
- Call `cleanup()` when the trip is completed (in the complete trip handler, after successful mutation)

- [ ] **Step 9: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: group shopping list and active trip items by store with collapsible accordions"
```

---

### Task 8: Store Override When Adding Items to Trip

#### File Map

- Modify: `frontend/src/pages/add-trip-items-page.tsx` (item selection area, lines 198-249)
- Modify: `frontend/src/pages/tests/add-trip-items-page.test.tsx`

#### Steps

- [ ] **Step 1: Write failing test**

```typescript
it('should show store dropdown alongside quantity when item is selected', () => {
  // Select an item
  // Assert: quantity input visible
  // Assert: store dropdown visible
  // Assert: store dropdown pre-populated with item default store
});

it('should allow overriding the store for a selected item', async () => {
  // Select item with default store "Costco"
  // Change store dropdown to "Walmart"
  // Click "Add Items"
  // Assert: addTripItem mutation called with storeId for "Walmart"
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx
```

- [ ] **Step 3: Add store dropdown to selected item row**

In `frontend/src/pages/add-trip-items-page.tsx`:

1. Import `useStoresQuery` (NOT currently imported). Set up the query using household IDs from the existing `useHouseholdsQuery`:
```tsx
const { data: households } = useHouseholdsQuery();
const householdIds = households?.map(h => h.id) ?? [];
const { data: stores } = useStoresQuery(householdIds);
```

2. Extend `selectedItems` state type:
```tsx
const [selectedItems, setSelectedItems] = useState<
  Record<string, { quantity: number; storeId: string | null }>
>({});
```

3. When an item is selected, initialize: `{ quantity: 1, storeId: item.defaultStoreId ?? null }`

4. Add a `<select>` dropdown next to the quantity input for each selected item, populated with all available stores

5. Update `handleAddItems` to pass the overridden `storeId`:
```tsx
const handleAddItems = async () => {
  for (const [itemId, { quantity, storeId }] of Object.entries(selectedItems)) {
    await addTripItemMutation.mutateAsync({
      tripId,
      inventoryItemId: itemId,
      quantity,
      storeId,
    });
  }
};
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/tests/add-trip-items-page.test.tsx && git commit -m "feat: add store override dropdown when adding items to shopping trip"
```

---

### Task 9: Store Filter Segmented Control on Add-Items Page

#### File Map

- Modify: `frontend/src/pages/add-trip-items-page.tsx` (add second segmented control)
- Modify: `frontend/src/pages/tests/add-trip-items-page.test.tsx`

#### Steps

- [ ] **Step 1: Write failing tests**

```typescript
it('should show store filter segmented control next to source filter', () => {
  // Render add-trip-items page
  // Assert: two segmented controls side by side
  // Assert: store filter has "All" option
});

it('should populate store filter with stores matching current source scope', () => {
  // Set source filter to a specific household
  // Assert: store filter shows "All" + that household's stores
});

it('should filter items by selected store', async () => {
  // Select "Costco" in store filter
  // Assert: only items with defaultStoreId matching Costco are shown
});

it('should reset store filter to "All" when source filter changes', async () => {
  // Select "Costco" in store filter
  // Change source filter from Personal to Household
  // Assert: store filter reset to "All"
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx
```

- [ ] **Step 3: Implement store filter segmented control**

In `frontend/src/pages/add-trip-items-page.tsx`:

1. Add `storeFilter` state: `const [storeFilter, setStoreFilter] = useState<string>('all');`
2. Derive filtered stores based on current source filter scope:
   - "All" source → show all stores
   - "Personal" source → show personal stores
   - Specific household → show that household's stores
3. Render a second segmented control next to the existing one. Layout both in a flex row:
```tsx
<div className="flex gap-2">
  {/* Existing source filter */}
  <div className="flex-1 overflow-x-auto">...</div>
  {/* New store filter */}
  <div className="flex-1 overflow-x-auto">
    <div className="flex gap-1 bg-bg-warm rounded-xl p-1" role="tablist">
      <button role="tab" aria-selected={storeFilter === 'all'} onClick={() => setStoreFilter('all')}>
        All
      </button>
      {filteredStores.map(store => (
        <button key={store.id} role="tab" aria-selected={storeFilter === store.id}
          onClick={() => setStoreFilter(store.id)}>
          {store.name}
        </button>
      ))}
    </div>
  </div>
</div>
```

4. Filter items: when `storeFilter !== 'all'`, only show items where `defaultStoreId === storeFilter`

5. Reset store filter when source filter changes:
```tsx
useEffect(() => {
  setStoreFilter('all');
}, [sourceFilter]);
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/tests/add-trip-items-page.test.tsx && git commit -m "feat: add store filter segmented control on trip add-items page"
```

---

## Chunk 5: Household Danger Zone & Dual Notes (Tasks 10, 11, 13)

### Task 10: Danger Zone Warning Verbiage & Modal Title

#### File Map

- Modify: `frontend/src/pages/household-detail-page.tsx` (danger zone lines 302-337)
- Modify: `frontend/src/pages/tests/household-detail-page.test.tsx`

#### Steps

- [ ] **Step 1: Write failing tests**

```typescript
it('should show warning text above Delete Household button in danger zone', () => {
  // Render household detail page as owner
  // Expand danger zone
  // Assert: warning text visible above delete button
  // Assert: text contains "permanently delete" and "can't be undone"
});

it('should show updated modal title "Delete Household - Are you sure?"', async () => {
  // Click Delete Household button
  // Assert: modal title is "Delete Household - Are you sure?"
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx
```

- [ ] **Step 3: Add warning text and update modal title**

In `frontend/src/pages/household-detail-page.tsx`:

1. In the danger zone section (around line 310), add a `<p>` above the Delete button:
```tsx
<p className="text-sm text-text-secondary mb-3">
  This will permanently delete the household and all its items and stores. This can't be undone.
</p>
```

2. Update the ConfirmDialog `title` prop to `"Delete Household - Are you sure?"`

3. Keep the same warning verbiage in the modal's `message` prop.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/household-detail-page.tsx frontend/src/pages/tests/household-detail-page.test.tsx && git commit -m "feat: add warning verbiage to danger zone and update delete modal title"
```

---

### Task 11: Hold-to-Confirm on ConfirmDialog

#### File Map

- Modify: `frontend/src/pages/components/confirm-dialog.tsx`
- Modify: `frontend/src/pages/components/tests/confirm-dialog.test.tsx` (file already exists)
- Modify: `frontend/src/pages/household-detail-page.tsx` (add holdDuration prop)

#### Steps

- [ ] **Step 1: Write failing tests for hold-to-confirm behavior**

In `frontend/src/pages/components/tests/confirm-dialog.test.tsx` (add alongside existing tests):

```typescript
describe('hold-to-confirm', () => {
  it('should work normally without holdDuration (single click confirms)', async () => {
    const onConfirm = vi.fn();
    // Render ConfirmDialog without holdDuration
    // Click confirm button
    // Assert: onConfirm called
  });

  it('should not fire confirm on single click when holdDuration is set', async () => {
    const onConfirm = vi.fn();
    // Render ConfirmDialog with holdDuration={5000}
    // Click (mousedown + immediate mouseup) confirm button
    // Assert: onConfirm NOT called
  });

  it('should show progress bar when holdDuration is set', () => {
    // Render ConfirmDialog with holdDuration={5000}
    // Assert: progress bar element exists above the title
    // Assert: progress bar width is 0%
  });

  it('should fill progress bar during hold and fire confirm after duration', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    // Render with holdDuration={5000}
    // Simulate mousedown on confirm button
    // Advance timers by 5000ms
    // Assert: onConfirm called
    vi.useRealTimers();
  });

  it('should reset progress bar when released early', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    // Render with holdDuration={5000}
    // Simulate mousedown
    // Advance timers by 2000ms
    // Simulate mouseup
    // Assert: onConfirm NOT called
    // Assert: progress bar resets to 0%
    vi.useRealTimers();
  });

  it('should reset progress when mouse leaves the button', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    // Render with holdDuration={5000}
    // Simulate mousedown
    // Advance timers by 2000ms
    // Simulate mouseleave on the button
    // Assert: onConfirm NOT called
    // Assert: progress resets
    vi.useRealTimers();
  });

  it('should support touch events', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    // Render with holdDuration={5000}
    // Simulate touchstart on confirm button
    // Advance timers by 5000ms
    // Assert: onConfirm called
    vi.useRealTimers();
  });

  it('should reset on touchend before duration completes', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    // Render with holdDuration={5000}
    // Simulate touchstart
    // Advance timers by 2000ms
    // Simulate touchend
    // Assert: onConfirm NOT called
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/components/tests/confirm-dialog.test.tsx
```

- [ ] **Step 3: Implement hold-to-confirm in ConfirmDialog**

In `frontend/src/pages/components/confirm-dialog.tsx`:

1. Add optional `holdDuration?: number` prop to the interface

2. Add state and refs for hold behavior:
```tsx
const [progress, setProgress] = useState(0);
const intervalRef = useRef<number | null>(null);
const startTimeRef = useRef<number>(0);
```

3. Create start/stop handlers:
```tsx
const startHold = () => {
  if (!holdDuration) return;
  startTimeRef.current = Date.now();
  intervalRef.current = window.setInterval(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const pct = Math.min((elapsed / holdDuration) * 100, 100);
    setProgress(pct);
    if (pct >= 100) {
      stopHold();
      onConfirm();
    }
  }, 50);
};

const stopHold = () => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  setProgress(0);
};

// Cleanup on unmount
useEffect(() => {
  return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
}, []);
```

4. Render progress bar at very top of modal (above title):
```tsx
{holdDuration && (
  <div className="w-full h-1 bg-navy/10 rounded-t-2xl overflow-hidden">
    <div
      className="h-full bg-coral"
      style={{ width: `${progress}%`, transition: 'none' }}
    />
  </div>
)}
```

5. On the confirm button, conditionally use hold events or click:
```tsx
{holdDuration ? (
  <button
    onMouseDown={startHold}
    onMouseUp={stopHold}
    onMouseLeave={stopHold}
    onTouchStart={startHold}
    onTouchEnd={stopHold}
    className="..."
  >
    {confirmLabel}
  </button>
) : (
  <button onClick={onConfirm} className="...">
    {confirmLabel}
  </button>
)}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/components/tests/confirm-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire hold-to-confirm to household delete modal**

In `frontend/src/pages/household-detail-page.tsx`, add `holdDuration={5000}` to the delete ConfirmDialog:

```tsx
<ConfirmDialog
  title="Delete Household - Are you sure?"
  message="This will permanently delete the household and all its items and stores. This can't be undone."
  confirmLabel="Delete"
  holdDuration={5000}
  onConfirm={handleDeleteHousehold}
  onCancel={() => setDeleteConfirm(false)}
/>
```

- [ ] **Step 6: Run household detail tests**

```bash
cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add hold-to-confirm behavior to ConfirmDialog with progress bar"
```

---

### Task 13: Dual Notes Display on Trip Item Row

#### File Map

- Modify: `frontend/src/pages/components/trip-item-row.tsx` (item display area)
- Modify: `frontend/src/pages/tests/trip-detail-page.test.tsx`
- Modify: `frontend/src/pages/tests/active-trip-page.test.tsx`

**Backend note:** `TripItemService.GetTripItems` already does `.Include(ti => ti.InventoryItem)`, so `InventoryItem.Notes` is already available in the API response. The frontend TripItem model was updated in Task 12 (Chunk 1) to include the nested `inventoryItem` object.

#### Steps

- [ ] **Step 1: Write failing tests**

In `frontend/src/pages/tests/trip-detail-page.test.tsx`:

```typescript
it('should display pantry notes in italics with "Pantry:" label', () => {
  // Render with trip item where inventoryItem.notes = "Buy organic"
  // Assert: text "Pantry: Buy organic" visible
  // Assert: rendered in italics
});

it('should display trip notes below pantry notes', () => {
  // Render with trip item where notes = "Get 2 if on sale"
  // and inventoryItem.notes = "Buy organic"
  // Assert: both notes visible, pantry notes first
});

it('should not show pantry notes when inventoryItem is null (deleted item)', () => {
  // Render with trip item where inventoryItemId = null, inventoryItem = null
  // Assert: no "Pantry:" label rendered
  // Assert: trip notes still visible if present
});

it('should not show pantry notes when inventoryItem has no notes', () => {
  // Render with trip item where inventoryItem = { notes: null }
  // Assert: no "Pantry:" label rendered
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

- [ ] **Step 3: Implement dual notes display in TripItemRow**

In `frontend/src/pages/components/trip-item-row.tsx`, below the item name display, add:

```tsx
{/* Pantry notes — only shown when inventoryItem exists and has notes */}
{item.inventoryItem?.notes && (
  <p className="text-xs text-text-secondary italic">
    Pantry: {item.inventoryItem.notes}
  </p>
)}

{/* Trip notes */}
{item.notes && (
  <p className="text-xs text-text-secondary">
    {item.notes}
  </p>
)}
```

The null-safe chain `item.inventoryItem?.notes` handles all edge cases:
- Pantry item deleted (`inventoryItem` is null) → skipped
- Pantry item has no notes (`inventoryItem.notes` is null) → skipped
- Both present → both shown

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx src/pages/tests/active-trip-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: display both pantry and trip notes on shopping list item rows"
```

---

## Final Verification

- [ ] **Run all backend tests**

```bash
cd backend && dotnet test -v n
```

Expected: all pass.

- [ ] **Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all pass.

- [ ] **TypeScript compilation check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Manual smoke test**

1. Create a pantry item inline (task 1)
2. Edit a pantry item via kebab menu, including scope change (task 2)
3. Edit a store via kebab menu, including scope change (task 3)
4. Start a trip → verify "Continue Shopping" on return (task 4)
5. Verify kebab tap targets are comfortable on mobile (task 6)
6. Verify items grouped by store on trip detail and active pages (task 7)
7. Add items with store override (task 8)
8. Filter items by store on add-items page (task 9)
9. Verify danger zone warning text and modal title (task 10)
10. Hold-to-confirm delete household — verify progress bar and 5s hold (task 11)
11. Delete a pantry item → verify trip items preserved with name (task 12)
12. Verify both note types on trip item rows (task 13)
