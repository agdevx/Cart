# App Improvements Round 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 18 changes from the round 2 design doc: bug fixes, backend schema changes, UI consistency improvements, and new features.

**Architecture:** Monorepo with .NET backend (`backend/`) and React/Vite frontend (`frontend/`). Backend uses EF Core with repository pattern; frontend uses TanStack Query for API, Jotai for state, Tailwind for styling. Changes span both layers with EF migrations for schema updates.

**Tech Stack:** .NET 10 / EF Core / xUnit + Moq + FluentAssertions (backend), React 19 / TypeScript / Vite / Vitest + RTL / TanStack Query / Tailwind v4 (frontend)

---

## Task 1: Fix Store Update 401 Bug

**Design ref:** #1 — StoreService.UpdateStore returns 401 because the frontend sends only `{ name }` in the body, so `store.Id` is `Guid.Empty` and `store.UserId` is null.

**Files:**
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs` (line 76-83)
- Modify: `backend/AGDevX.Cart.Api/Controllers/StoreController.cs` (line 89-105)
- Test: `backend/Tests/AGDevX.Cart.Services.Tests/` (StoreService tests)

**Step 1: Write the failing backend test**

Add test to the StoreService test file (create if it doesn't exist):

```csharp
[Fact]
public async Task Should_UpdateStoreName_When_OnlyNameProvided()
{
    var userId = Guid.NewGuid();
    var storeId = Guid.NewGuid();
    var existingStore = new Store { Id = storeId, Name = "Old Name", UserId = userId };

    _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existingStore);
    _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>())).ReturnsAsync((Store s) => s);

    var result = await _storeService.UpdateStore(storeId, "New Name", userId);

    result.Name.Should().Be("New Name");
    result.UserId.Should().Be(userId); // UserId preserved
}
```

**Step 2: Run test to verify it fails**

```bash
cd backend && dotnet test Tests/AGDevX.Cart.Services.Tests/ --filter "Should_UpdateStoreName"
```

Expected: FAIL — `UpdateStore` signature doesn't match yet.

**Step 3: Fix StoreService.UpdateStore**

Change the method to accept `(Guid storeId, string name, Guid userId)` instead of `(Store store, Guid userId)`. Fetch the existing store, update only the name, save:

```csharp
public async Task<Store> UpdateStore(Guid storeId, string name, Guid userId)
{
    //== Verify access before updating
    var existingStore = await GetById(storeId, userId)
                            ?? throw new UnauthorizedAccessException("Store not found or access denied");

    existingStore.Name = name;
    return await storeRepository.Update(existingStore);
}
```

Update `IStoreService.cs` interface to match:
```csharp
Task<Store> UpdateStore(Guid storeId, string name, Guid userId);
```

Update `StoreController.cs` Update method:
```csharp
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] Store store)
{
    try
    {
        var userId = User.GetUserId();
        await storeService.UpdateStore(id, store.Name, userId);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && dotnet test Tests/AGDevX.Cart.Services.Tests/ -v minimal
```

Expected: All pass. Fix any existing tests that called the old `UpdateStore(Store, Guid)` signature.

**Step 5: Run all backend tests**

```bash
cd backend && dotnet build && dotnet test -v minimal
```

Expected: All 170+ tests pass (some may need signature updates for the old UpdateStore).

**Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Services/StoreService.cs backend/AGDevX.Cart.Services/IStoreService.cs backend/AGDevX.Cart.Api/Controllers/StoreController.cs backend/Tests/
git commit -m "fix: resolve 401 on store update by accepting only name instead of full entity"
```

---

## Task 2: Backend — Add IsStarted/StartedAt to Trip + Start Endpoint

**Design ref:** #15 (backend part) — Add `IsStarted` bool and `StartedAt` DateTime? to Trip model, add `POST /api/trip/{id}/start` endpoint, new migration.

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/Trip.cs`
- Modify: `backend/AGDevX.Cart.Services/TripService.cs`
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs`
- Create: New EF migration
- Test: `backend/Tests/AGDevX.Cart.Services.Tests/` (TripService tests)

**Step 1: Write failing tests for StartTrip**

```csharp
[Fact]
public async Task Should_SetIsStartedAndStartedAt_When_StartTrip()
{
    var userId = Guid.NewGuid();
    var tripId = Guid.NewGuid();
    var trip = new Trip { Id = tripId, Name = "Test", IsStarted = false, StartedAt = null, IsCompleted = false };

    _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
    _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
    _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>())).ReturnsAsync((Trip t) => t);

    var result = await _tripService.StartTrip(tripId, userId);

    result.IsStarted.Should().BeTrue();
    result.StartedAt.Should().NotBeNull();
}

[Fact]
public async Task Should_ThrowUnauthorized_When_StartTripAsNonCollaborator()
{
    var userId = Guid.NewGuid();
    var tripId = Guid.NewGuid();

    _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

    var act = () => _tripService.StartTrip(tripId, userId);

    await act.Should().ThrowAsync<UnauthorizedAccessException>();
}
```

**Step 2: Run test to verify it fails**

```bash
cd backend && dotnet test Tests/AGDevX.Cart.Services.Tests/ --filter "StartTrip"
```

Expected: FAIL — `IsStarted` property and `StartTrip` method don't exist yet.

**Step 3: Add IsStarted/StartedAt to Trip model**

In `backend/AGDevX.Cart.Data/Models/Trip.cs`, add after `IsCompleted`/`CompletedAt`:

```csharp
//== Whether the trip has been started (moved from planning to active)
public bool IsStarted { get; set; }

//== When the trip was started
public DateTime? StartedAt { get; set; }
```

**Step 4: Add StartTrip to ITripService and TripService**

In `ITripService.cs` add:
```csharp
Task<Trip> StartTrip(Guid tripId, Guid userId);
```

In `TripService.cs` add:
```csharp
public async Task<Trip> StartTrip(Guid tripId, Guid userId)
{
    //== Verify user is collaborator before starting trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.IsStarted = true;
    trip.StartedAt = DateTime.UtcNow;

    return await tripRepository.Update(trip);
}
```

Also update `CreateTrip` to initialize the new fields:
```csharp
var trip = new Trip
{
    Name = name,
    HouseholdId = householdId,
    IsStarted = false,
    StartedAt = null,
    IsCompleted = false,
    CompletedAt = null
};
```

**Step 5: Add Start endpoint to TripController**

After the Complete endpoint:
```csharp
//== Start a trip (transition from planning to in-progress)
[HttpPost("{id}/start")]
public async Task<IActionResult> Start(Guid id)
{
    try
    {
        var userId = User.GetUserId();
        var trip = await tripService.StartTrip(id, userId);
        return Ok(trip);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (KeyNotFoundException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

**Step 6: Create EF migration**

```bash
cd backend && dotnet ef migrations add AddTripIsStarted --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

**Step 7: Run all backend tests**

```bash
cd backend && dotnet test -v minimal
```

Expected: All pass.

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add IsStarted/StartedAt to Trip model with start endpoint"
```

---

## Task 3: Backend — Cascade Delete Household Items & Stores

**Design ref:** #5 — When a household is deleted, its inventory items and stores are orphaned.

**Files:**
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs` (OnModelCreating)
- Create: New EF migration

**Step 1: Add cascade delete configurations to CartDbContext.cs**

In `OnModelCreating`, after the existing User configuration, add:

```csharp
//== Cascade delete inventory items when household is deleted
modelBuilder.Entity<InventoryItem>(entity =>
{
    entity.HasOne(i => i.Household)
          .WithMany()
          .HasForeignKey(i => i.HouseholdId)
          .OnDelete(DeleteBehavior.Cascade);
});

//== Cascade delete stores when household is deleted
modelBuilder.Entity<Store>(entity =>
{
    entity.HasOne(s => s.Household)
          .WithMany()
          .HasForeignKey(s => s.HouseholdId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

**Step 2: Create EF migration**

```bash
cd backend && dotnet ef migrations add CascadeDeleteHouseholdItemsAndStores --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

**Step 3: Verify build and tests pass**

```bash
cd backend && dotnet build && dotnet test -v minimal
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add cascade delete for household inventory items and stores"
```

---

## Task 4: Backend — Rename DisplayName → Name

**Design ref:** #8 (backend) — Rename `DisplayName` to `Name` on User model, all DTOs, services, tests. New migration.

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/User.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/AuthResponse.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/RegisterRequest.cs`
- Modify: `backend/AGDevX.Cart.Auth/AuthService.cs`
- Create: New EF migration
- Test: Update any tests referencing DisplayName

**Step 1: Rename in User model**

In `User.cs`, change:
```csharp
public string? DisplayName { get; set; }
```
to:
```csharp
public string? Name { get; set; }
```

**Step 2: Rename in DTOs**

In `AuthResponse.cs`, change `DisplayName` to `Name`:
```csharp
public string Name { get; set; } = string.Empty;
```

In `RegisterRequest.cs`, change `DisplayName` to `Name`:
```csharp
public string Name { get; set; } = string.Empty;
```

**Step 3: Update AuthService.cs**

In `Register` method (line 30): `DisplayName = request.DisplayName` → `Name = request.Name`
In `Register` return (line 40): `DisplayName = user.DisplayName` → `Name = user.Name`
In `Login` return (line 60): `DisplayName = user.DisplayName` → `Name = user.Name`

**Step 4: Search for any other backend references to DisplayName**

```bash
cd backend && grep -r "DisplayName" --include="*.cs" -l
```

Update all found references.

**Step 5: Create EF migration to rename column**

```bash
cd backend && dotnet ef migrations add RenameDisplayNameToName --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

**IMPORTANT:** Check the generated migration. EF may generate a drop + add column instead of rename. If so, manually edit the migration to use `RenameColumn`:
```csharp
migrationBuilder.RenameColumn(
    name: "DisplayName",
    table: "Users",
    newName: "Name");
```

**Step 6: Build and run all backend tests**

```bash
cd backend && dotnet build && dotnet test -v minimal
```

Fix any test compilation errors from the rename.

**Step 7: Commit**

```bash
git add backend/
git commit -m "refactor: rename User.DisplayName to User.Name across backend"
```

---

## Task 5: Frontend — Rename displayName → name

**Design ref:** #8 (frontend) — Update all frontend references to `displayName` → `name` on User model.

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/models/user.ts`
- Modify: `frontend/src/pages/register-page.tsx`
- Modify: `frontend/src/pages/household-page.tsx` (HouseholdMembersList)
- Modify: `frontend/src/pages/household-detail-page.tsx`
- Modify: `frontend/src/auth/use-auth.ts`
- Modify: `frontend/src/auth/auth-provider.tsx`
- Modify: All frontend files referencing `displayName` on user
- Test: Update corresponding test files

**Step 1: Search for all frontend references**

```bash
cd frontend && grep -r "displayName\|DisplayName" --include="*.ts" --include="*.tsx" -l
```

**Step 2: Update User model**

In `frontend/src/apis/agdevx-cart-api/models/user.ts`, change `displayName` → `name`:
```typescript
export interface User {
  id: string;
  email: string | null;
  name: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
```

**Step 3: Update register-page.tsx**

- State variable: `displayName` → `name` (but keep the form field labeled "Name" and state var can stay `name`)
- Validation: `isDisplayNameValid` → `isNameValid`
- `touched.displayName` → `touched.name`
- `displayNameError` → `nameError`
- Registration payload: `displayName` → `name`
- `setAuth` call: `displayName: response.displayName` → `name: response.name`
- Label text: "Display Name" → "Name"

**Step 4: Update household-page.tsx HouseholdMembersList**

Change `m.user?.displayName` → `m.user?.name`:
```typescript
const names = members
  .map((m) => m.user?.name || 'Unknown')
  .join(', ')
```

**Step 5: Update household-detail-page.tsx**

Any references to `displayName` for member display → `name`.

**Step 6: Update auth files**

In `use-auth.ts` and `auth-provider.tsx`, update any `displayName` references if present.

**Step 7: Update all test files that reference displayName**

Search and replace across all test files.

**Step 8: Run frontend tests**

```bash
cd frontend && npm test -- --run
```

Expected: All 285+ tests pass.

**Step 9: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json
```

**Step 10: Commit**

```bash
git add frontend/
git commit -m "refactor: rename displayName to name across frontend"
```

---

## Task 6: Settings Page + Nav Item

**Design ref:** #4 — New settings page with logout button, add to bottom nav, remove logout from household page.

**Files:**
- Create: `frontend/src/pages/settings-page.tsx`
- Modify: `frontend/src/features/bottom-nav/bottom-nav.tsx`
- Modify: `frontend/src/pages/household-page.tsx`
- Modify: `frontend/src/app.tsx`
- Create: `frontend/src/pages/tests/settings-page.test.tsx`
- Modify: `frontend/src/features/bottom-nav/tests/bottom-nav.test.tsx` (if exists)
- Modify: `frontend/src/pages/tests/household-page.test.tsx` (if exists)

**Step 1: Write test for SettingsPage**

Create `frontend/src/pages/tests/settings-page.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPage } from '../settings-page'

const mockLogout = vi.fn()

vi.mock('@/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@test.com', name: 'Test User' },
    isAuthenticated: true,
    logout: mockLogout,
    setAuth: vi.fn(),
  }),
}))

const queryClient = new QueryClient()
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
)

describe('SettingsPage', () => {
  it('renders Settings heading', () => {
    render(<SettingsPage />, { wrapper })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    render(<SettingsPage />, { wrapper })
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('calls logout when button is clicked', () => {
    render(<SettingsPage />, { wrapper })
    fireEvent.click(screen.getByText('Logout'))
    expect(mockLogout).toHaveBeenCalledOnce()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/pages/tests/settings-page.test.tsx
```

**Step 3: Create SettingsPage**

Create `frontend/src/pages/settings-page.tsx`:
```typescript
// ABOUTME: Settings page with user preferences and account actions
// ABOUTME: Contains logout functionality moved from the household page

import { LogOut } from 'lucide-react'

import { useAuth } from '@/auth/use-auth'

export const SettingsPage = () => {
  const { logout } = useAuth()

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Settings
        </h1>
      </div>

      <div className="space-y-3">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-coral/30 text-coral rounded-xl font-display font-bold hover:bg-coral/8 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Add Settings tab to bottom nav**

In `frontend/src/features/bottom-nav/bottom-nav.tsx`:
- Add import: `import { Package, Settings, ShoppingCart, Users } from 'lucide-react'`
- Add 4th tab to the `tabs` array:
```typescript
const tabs = [
  { path: '/pantry', label: 'Pantry', icon: Package },
  { path: '/shopping', label: 'Trips', icon: ShoppingCart },
  { path: '/household', label: 'Household', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
]
```

**Step 5: Remove logout button from household page**

In `frontend/src/pages/household-page.tsx`:
- Remove `LogOut` from lucide imports
- Remove `useAuth` import and `const { logout } = useAuth()` call
- Remove the logout button from the header (the entire `<button onClick={logout}>` element)

**Step 6: Add route in app.tsx**

- Add import: `import { SettingsPage } from '@/pages/settings-page'`
- Add route before the catch-all:
```typescript
<Route path="/settings" element={<ProtectedRoute><AuthenticatedLayout><SettingsPage /></AuthenticatedLayout></ProtectedRoute>} />
```

**Step 7: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

**Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: add settings page with logout, update bottom nav"
```

---

## Task 7: Add-Items Flow Rework

**Design ref:** #2 — Change "Start Shopping" to "Add Items", navigate to trip detail instead of active trip.

**Files:**
- Modify: `frontend/src/pages/add-trip-items-page.tsx` (lines 82-101, 257-265)
- Test: `frontend/src/pages/tests/add-trip-items-page.test.tsx`

**Step 1: Update tests**

Find existing tests for the "Start Shopping" button and update expected text to "Add Items" and expected navigation to `/shopping/${tripId}` instead of `/shopping/${tripId}/active`.

**Step 2: Make the changes**

In `add-trip-items-page.tsx`:

Rename `handleStartShopping` → `handleAddItems`. Change navigation:
```typescript
const handleAddItems = async () => {
  if (!tripId || selectedCount === 0) return

  setIsAdding(true)
  try {
    await Promise.all(
      Object.entries(selectedItems).map(([inventoryItemId, { quantity }]) =>
        addTripItemMutation.mutateAsync({
          tripId,
          inventoryItemId,
          quantity,
        })
      )
    )
    navigate(`/shopping/${tripId}`)
  } catch {
    // Error handled by mutation state
    setIsAdding(false)
  }
}
```

Update the button:
```typescript
<button
  onClick={handleAddItems}
  disabled={isAdding}
  className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors shadow-lg"
>
  {isAdding ? 'Adding Items...' : `Add Items (${selectedCount} ${selectedCount === 1 ? 'item' : 'items'})`}
</button>
```

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/tests/
git commit -m "feat: change add-items flow to return to trip detail instead of active trip"
```

---

## Task 8: Household Card Members — Exclude Self

**Design ref:** #3 — HouseholdMembersList should exclude the current user.

**Files:**
- Modify: `frontend/src/pages/household-page.tsx` (HouseholdMembersList component, lines 11-25)
- Test: `frontend/src/pages/tests/household-page.test.tsx`

**Step 1: Update tests**

Add/update tests to verify the current user is excluded from the members list.

**Step 2: Update HouseholdMembersList**

```typescript
const HouseholdMembersList = ({ householdId }: { householdId: string }) => {
  const { user } = useAuth()
  const { data: members } = useHouseholdMembersQuery(householdId)

  if (!members || members.length === 0) return null

  const otherMembers = members.filter((m) => m.userId !== user?.id)
  if (otherMembers.length === 0) return null

  const names = otherMembers
    .map((m) => m.user?.name || 'Unknown')
    .join(', ')

  return (
    <p className="text-[13px] text-text-secondary font-medium mt-1 truncate">
      {names}
    </p>
  )
}
```

Note: `useAuth` is already imported at the top of the file.

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/household-page.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/household-page.tsx frontend/src/pages/tests/
git commit -m "feat: exclude current user from household card member names"
```

---

## Task 9: Delete Household Warning + Danger Zone Accordion

**Design ref:** #6 and #7 — Update delete warning message, wrap Danger Zone in collapsible accordion.

**Files:**
- Modify: `frontend/src/pages/household-detail-page.tsx` (lines 302-323)
- Test: `frontend/src/pages/tests/household-detail-page.test.tsx`

**Step 1: Update tests**

Add tests for:
- Danger Zone is collapsed by default (delete button not visible)
- Clicking Danger Zone header expands it
- Delete confirmation message includes warning about items and stores

**Step 2: Update the danger zone section**

Replace the danger zone section (lines 302-312) with an accordion:

```tsx
{/* Danger Zone — owner-only accordion */}
{isOwner && (
  <DangerZoneAccordion
    onDeleteClick={() => setShowDeleteConfirm(true)}
  />
)}
```

Add a `DangerZoneAccordion` component above `HouseholdDetailPage` in the same file (or inline the state):

```tsx
const DangerZoneAccordion = ({ onDeleteClick }: { onDeleteClick: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mt-6 bg-coral/5 rounded-2xl border border-coral/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between"
      >
        <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-coral">Danger Zone</h2>
        <ChevronDown className={`w-4 h-4 text-coral transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`grid transition-all ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            <button
              onClick={onDeleteClick}
              className="w-full py-3 bg-coral text-white rounded-xl font-display font-bold hover:bg-coral/90 transition-colors"
            >
              Delete Household
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Add `ChevronDown` to lucide imports.

**Step 3: Update delete confirmation message**

Change the ConfirmDialog message (line 318):
```tsx
message="This will permanently delete the household and all its items and stores. This can't be undone."
```

**Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx
```

**Step 5: Commit**

```bash
git add frontend/src/pages/household-detail-page.tsx frontend/src/pages/tests/
git commit -m "feat: add danger zone accordion and cascade delete warning on household delete"
```

---

## Task 10: Store Edit Cancel Button

**Design ref:** #10 — Add X/cancel button next to save checkmark when editing store name.

**Files:**
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (lines 116-134, renderStoreRow edit mode)
- Test: `frontend/src/pages/tests/pantry-stores-view.test.tsx`

**Step 1: Update test**

Add test: when editing, a cancel button is visible and clicking it exits edit mode.

**Step 2: Add cancel button**

Add `X` to lucide imports: `import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'`

In `renderStoreRow`, after the Check button in edit mode, add:
```tsx
<button
  onClick={handleCancelEdit}
  aria-label="Cancel editing"
  className="text-text-tertiary hover:text-coral transition-colors"
>
  <X className="w-5 h-5" />
</button>
```

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-stores-view.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/tests/
git commit -m "feat: add cancel button for store name editing"
```

---

## Task 11: Store Row Kebab Menu

**Design ref:** #11 — Replace inline Pencil/Trash2 buttons with kebab menu on store rows.

**Files:**
- Modify: `frontend/src/pages/pantry-stores-view.tsx` (renderStoreRow non-edit mode)
- Test: `frontend/src/pages/tests/pantry-stores-view.test.tsx`

**Step 1: Update tests**

Update existing tests: remove assertions on visible Pencil/Trash2 buttons; add assertions for kebab menu trigger and menu items.

**Step 2: Add kebab menu state**

Add state at top of `PantryStoresView`:
```typescript
const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
const menuRef = useRef<HTMLDivElement>(null)
```

Add outside-click handler (same pattern as `trip-card.tsx`):
```typescript
useEffect(() => {
  if (!menuOpenId) return
  const handleMouseDown = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpenId(null)
    }
  }
  document.addEventListener('mousedown', handleMouseDown)
  return () => document.removeEventListener('mousedown', handleMouseDown)
}, [menuOpenId])
```

Add imports: `MoreVertical` from lucide, `useEffect, useRef` from react.

**Step 3: Replace inline buttons with kebab menu**

In `renderStoreRow`, replace the non-edit `<>` branch (lines 136-155):
```tsx
<>
  <span className="font-bold text-navy">{store.name}</span>
  <div className="relative" ref={menuOpenId === store.id ? menuRef : undefined}>
    <button
      onClick={() => setMenuOpenId(menuOpenId === store.id ? null : store.id)}
      aria-label="Store actions"
      className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
    >
      <MoreVertical className="w-5 h-5 text-text-tertiary" />
    </button>
    {menuOpenId === store.id && (
      <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
        <button
          onClick={() => { setMenuOpenId(null); handleStartEdit(store.id, store.name) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => { setMenuOpenId(null); setDeleteConfirm({ id: store.id, name: store.name }) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    )}
  </div>
</>
```

**Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-stores-view.test.tsx
```

**Step 5: Commit**

```bash
git add frontend/src/pages/pantry-stores-view.tsx frontend/src/pages/tests/
git commit -m "feat: replace store row inline buttons with kebab menu"
```

---

## Task 12: Pantry Item Kebab Menu

**Design ref:** #12 — Replace Delete button on pantry items with kebab menu.

**Files:**
- Modify: `frontend/src/pages/pantry-items-view.tsx` (renderItem function)
- Test: `frontend/src/pages/tests/pantry-items-view.test.tsx`

**Step 1: Update tests**

Replace assertion for visible "Delete" button with kebab menu interaction.

**Step 2: Add kebab menu state and imports**

Add `MoreVertical, Trash2` to imports from lucide-react. Add `useEffect, useRef, useState` from react.

Add state:
```typescript
const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
const menuRef = useRef<HTMLDivElement>(null)
```

Add outside-click handler (same as Task 11).

**Step 3: Replace the delete button with kebab menu**

In `renderItem`, replace the button with a kebab menu (same pattern as stores). Menu has one item: "Delete" in coral.

```tsx
const renderItem = (item: InventoryItem) => (
  <div
    key={item.id}
    className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-start"
  >
    <div>
      <h3 className="font-bold text-navy">{item.name}</h3>
      {item.notes && (
        <p className="text-sm text-text-secondary mt-0.5">{item.notes}</p>
      )}
    </div>
    <div className="relative" ref={menuOpenId === item.id ? menuRef : undefined}>
      <button
        onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
        aria-label="Item actions"
        className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-text-tertiary" />
      </button>
      {menuOpenId === item.id && (
        <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
          <button
            onClick={() => { setMenuOpenId(null); handleDelete(item.id) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  </div>
)
```

Also replace the native `confirm()` in `handleDelete` with a ConfirmDialog (import it):
```typescript
const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

const handleDelete = (id: string, name: string) => {
  setMenuOpenId(null)
  setDeleteConfirm({ id, name })
}

const handleConfirmDelete = async () => {
  if (!deleteConfirm) return
  await deleteMutation.mutateAsync(deleteConfirm.id)
  setDeleteConfirm(null)
}
```

Add the ConfirmDialog at the end of the return, before the closing `</>` or `</div>`.

**Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-items-view.test.tsx
```

**Step 5: Commit**

```bash
git add frontend/src/pages/pantry-items-view.tsx frontend/src/pages/tests/
git commit -m "feat: replace pantry item delete button with kebab menu and confirm dialog"
```

---

## Task 13: Add Item Button Style

**Design ref:** #13 — Move "Add Item" button from header to below segmented control, match dashed-border style.

**Files:**
- Modify: `frontend/src/pages/pantry-page.tsx` (lines 27-35 and placement)
- Test: `frontend/src/pages/tests/pantry-page.test.tsx`

**Step 1: Update tests**

Update tests to expect "Add Item" button below the segmented control (not in header).

**Step 2: Move and restyle the Add Item button**

Remove the `Link` from the header (lines 27-35). Add it below the segmented control, before the filter dropdown, as a dashed-border button matching the store "Add Store" pattern:

```tsx
{activeTab === 'items' && (
  <Link
    to="/pantry/add"
    className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
  >
    <Plus className="w-5 h-5" />
    Add Item
  </Link>
)}
```

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-page.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/pantry-page.tsx frontend/src/pages/tests/
git commit -m "feat: restyle Add Item button with dashed border below segmented control"
```

---

## Task 14: Add Items Button on Trip Detail

**Design ref:** #14 — Restyle the "Add Items" button on trip detail page from small outlined to dashed-border.

**Files:**
- Modify: `frontend/src/pages/trip-detail-page.tsx` (lines 83-93)
- Test: `frontend/src/pages/tests/trip-detail-page.test.tsx`

**Step 1: Update tests**

Update tests for the new button style/position if asserting on classes.

**Step 2: Move and restyle the Add Items button**

Replace the "Shopping List" header + inline button section. Put the Add Items button below the section label:

```tsx
<div className="mb-4">
  <div className="flex items-center gap-2.5 mb-3">
    <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Shopping List</span>
    <span className="flex-1 h-px bg-navy/8" />
  </div>

  <button
    onClick={() => navigate(`/shopping/${tripId}/add-items`)}
    className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
  >
    <Plus className="w-5 h-5" />
    Add Items
  </button>

  {tripItems && tripItems.length > 0 ? (
    // ... existing items list ...
  ) : (
    <p className="text-text-secondary">No items in this trip yet. Add some items to get started!</p>
  )}
</div>
```

Add `Plus` to the lucide imports.

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/trip-detail-page.tsx frontend/src/pages/tests/
git commit -m "feat: restyle trip detail Add Items button with dashed border"
```

---

## Task 15: Trip Status Labels + Sections (Frontend)

**Design ref:** #15 (frontend) — Three sections: In Progress, Planning, Completed (accordion). "Start Shopping" calls start endpoint.

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/start-trip.mutation.ts`
- Modify: `frontend/src/pages/shopping-page.tsx`
- Modify: `frontend/src/pages/trip-detail-page.tsx`
- Modify: `frontend/src/pages/components/trip-card.tsx`
- Test: Corresponding test files

**Step 1: Update Trip model**

In `frontend/src/apis/agdevx-cart-api/models/trip.ts`, add:
```typescript
isStarted: boolean
startedAt: string | null
```

**Step 2: Create start-trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/start-trip.mutation.ts`:
```typescript
// ABOUTME: Mutation hook for starting a trip (transitioning from planning to in-progress)
// ABOUTME: Calls start endpoint and invalidates trip query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { Trip } from '../models/trip'
import { apiFetch } from '../agdevx-cart-api-config'

export const useStartTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<Trip> => {
      const response = await apiFetch(`/api/trip/${tripId}/start`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to start trip')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

**Step 3: Write tests for start-trip mutation**

Create test file following existing mutation test patterns.

**Step 4: Update trip-detail-page.tsx — "Start Shopping" calls start endpoint**

Import `useStartTripMutation`. Change `handleStartShopping`:
```typescript
const startMutation = useStartTripMutation()

const handleStartShopping = async () => {
  try {
    await startMutation.mutateAsync(tripId!)
    navigate(`/shopping/${tripId}/active`)
  } catch {
    // Error handled by mutation state
  }
}
```

**Step 5: Update shopping-page.tsx — Three sections**

Replace two-way split with three-way:
```typescript
const inProgressTrips = trips?.filter((trip) => trip.isStarted && !trip.isCompleted) || []
const planningTrips = trips?.filter((trip) => !trip.isStarted && !trip.isCompleted) || []
const completedTrips = trips?.filter((trip) => trip.isCompleted) || []
```

Add state for completed accordion:
```typescript
const [showCompleted, setShowCompleted] = useState(false)
```

Render three sections: In Progress, Planning, and Completed (in accordion). Use the same accordion pattern from Task 9:

```tsx
{/* In Progress section */}
{inProgressTrips.length > 0 && (
  <div className="mb-6">
    <div className="flex items-center gap-2.5 mt-6 mb-3">
      <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">In Progress</span>
      <span className="flex-1 h-px bg-navy/8" />
    </div>
    <div className="space-y-3">
      {inProgressTrips.map((trip) => (
        <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
      ))}
    </div>
  </div>
)}

{/* Planning section */}
{planningTrips.length > 0 && (
  <div className="mb-6">
    <div className="flex items-center gap-2.5 mt-6 mb-3">
      <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Planning</span>
      <span className="flex-1 h-px bg-navy/8" />
    </div>
    <div className="space-y-3">
      {planningTrips.map((trip) => (
        <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
      ))}
    </div>
  </div>
)}

{/* Completed section (accordion) */}
{completedTrips.length > 0 && (
  <div className="mt-6">
    <button
      onClick={() => setShowCompleted(!showCompleted)}
      className="flex items-center gap-2.5 w-full mb-3"
    >
      <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
        Completed ({completedTrips.length})
      </span>
      <span className="flex-1 h-px bg-navy/8" />
      <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
    </button>
    {showCompleted && (
      <div className="space-y-3">
        {completedTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
        ))}
      </div>
    )}
  </div>
)}
```

Import `ChevronDown` from lucide.

**Step 6: Update trip-card.tsx date label**

Update the `dateLabel` to handle the new states:
```typescript
const dateLabel = trip.isCompleted
  ? `Completed: ${trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}`
  : trip.isStarted
  ? `Started: ${trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : 'N/A'}`
  : `Created: ${new Date(trip.createdDate).toLocaleDateString()}`
```

**Step 7: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

**Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: add trip status sections (In Progress, Planning, Completed accordion) with start trip endpoint"
```

---

## Task 16: Default Store on Pantry Items

**Design ref:** #9 and #18 — Add store dropdown to add-pantry-item-page. DefaultStoreId already exists in backend model.

**Files:**
- Modify: `frontend/src/pages/add-pantry-item-page.tsx`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/create-inventory-item.mutation.ts` (verify `defaultStoreId` is sent)
- Test: Corresponding test files

**Step 1: Verify backend accepts defaultStoreId**

Check that `create-inventory-item.mutation.ts` sends `defaultStoreId` in the request body. The InventoryItem model already has the field, and the controller likely accepts `[FromBody] InventoryItem` directly.

**Step 2: Write tests**

Add tests for: store dropdown appears when stores exist, defaultStoreId is included in mutation call.

**Step 3: Add store dropdown to add-pantry-item-page**

Import stores query:
```typescript
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
```

Add state for default store:
```typescript
const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null)
```

Fetch stores:
```typescript
const { data: households } = useHouseholdsQuery()
const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
const { data: stores } = useStoresQuery(householdIds)
```

Add `useMemo` to react imports.

Add dropdown after Notes field (only if stores exist):
```tsx
{stores && stores.length > 0 && (
  <div>
    <label htmlFor="defaultStore" className="block text-sm font-semibold text-navy-soft mb-1">
      Default Store (optional)
    </label>
    <select
      id="defaultStore"
      value={defaultStoreId || ''}
      onChange={(e) => setDefaultStoreId(e.target.value || null)}
      className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
      disabled={createMutation.isPending}
    >
      <option value="">None</option>
      {stores.map((store) => (
        <option key={store.id} value={store.id}>{store.name}</option>
      ))}
    </select>
  </div>
)}
```

Include in mutation call:
```typescript
await createMutation.mutateAsync({
  name: name.trim(),
  notes: notes.trim() || null,
  householdId: householdId === 'personal' ? null : householdId,
  defaultStoreId,
})
```

**Step 4: Update create-inventory-item mutation if needed**

Verify the mutation request interface includes `defaultStoreId`:
```typescript
interface CreateInventoryItemRequest {
  name: string
  notes: string | null
  householdId: string | null
  defaultStoreId?: string | null
}
```

**Step 5: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/add-pantry-item-page.test.tsx
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: add default store dropdown to add pantry item page"
```

---

## Task 17: Pantry Filter Tabs

**Design ref:** #16 — Replace native `<select>` with horizontal tab/toggle component.

**Files:**
- Modify: `frontend/src/pages/pantry-page.tsx` (lines 67-83)
- Test: `frontend/src/pages/tests/pantry-page.test.tsx`

**Step 1: Update tests**

Replace tests that look for a `<select>` with tests for tab buttons.

**Step 2: Replace select with tabs**

Replace the `<select>` element with tab buttons matching the add-trip-items-page pattern:

```tsx
{activeTab === 'items' && (
  <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 mb-4 overflow-x-auto">
    <button
      role="tab"
      aria-selected={filter === 'all'}
      onClick={() => setFilter('all')}
      className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
        filter === 'all'
          ? 'bg-teal text-white shadow-sm'
          : 'text-text-secondary hover:text-navy'
      }`}
    >
      All
    </button>
    <button
      role="tab"
      aria-selected={filter === 'personal'}
      onClick={() => setFilter('personal')}
      className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
        filter === 'personal'
          ? 'bg-teal text-white shadow-sm'
          : 'text-text-secondary hover:text-navy'
      }`}
    >
      Personal
    </button>
    {(households || []).map((household) => (
      <button
        key={household.id}
        role="tab"
        aria-selected={filter === `household:${household.id}` || filter === `merged:${household.id}`}
        onClick={() => setFilter(`household:${household.id}`)}
        className={`flex-shrink-0 px-4 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
          filter === `household:${household.id}` || filter === `merged:${household.id}`
            ? 'bg-teal text-white shadow-sm'
            : 'text-text-secondary hover:text-navy'
        }`}
      >
        {household.name}
      </button>
    ))}
  </div>
)}
```

Note: The "merged" filter option is dropped from the UI since tabs don't support sub-options well. If the design requires keeping it, consider adding a toggle within the household tab. For now, household filter shows household-only items.

**Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/pantry-page.test.tsx
```

**Step 4: Commit**

```bash
git add frontend/src/pages/pantry-page.tsx frontend/src/pages/tests/
git commit -m "feat: replace pantry filter dropdown with horizontal tab buttons"
```

---

## Task 18: Default Item Type from Pantry Filter

**Design ref:** #17 — Pre-select type based on current Pantry page filter via URL params.

**Files:**
- Modify: `frontend/src/pages/pantry-page.tsx` (Add Item link)
- Modify: `frontend/src/pages/add-pantry-item-page.tsx` (read scope from URL)
- Test: Corresponding test files

**Step 1: Update tests**

Add test: when navigating from a household filter, the scope param is passed and the add-item page defaults to that household.

**Step 2: Update pantry-page.tsx Add Item link**

Change the Link `to` prop to include the scope:
```tsx
<Link
  to={filter === 'all' || filter === 'personal'
    ? '/pantry/add'
    : `/pantry/add?scope=${filter}`}
  className="..."
>
```

Where `filter` values like `household:${householdId}` get passed as the scope param.

**Step 3: Update add-pantry-item-page.tsx to read scope**

Add `useSearchParams` import:
```typescript
import { useNavigate, useSearchParams } from 'react-router-dom'
```

Read scope from URL and set initial state:
```typescript
const [searchParams] = useSearchParams()
const scopeParam = searchParams.get('scope')

const [householdId, setHouseholdId] = useState<string>(() => {
  if (scopeParam?.startsWith('household:')) {
    return scopeParam.split(':')[1]
  }
  return 'personal'
})
```

**Step 4: Run tests**

```bash
cd frontend && npx vitest run src/pages/tests/add-pantry-item-page.test.tsx src/pages/tests/pantry-page.test.tsx
```

**Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

**Step 6: Commit**

```bash
git add frontend/src/pages/pantry-page.tsx frontend/src/pages/add-pantry-item-page.tsx frontend/src/pages/tests/
git commit -m "feat: default add-item type based on current pantry filter"
```

---

## Final: Full Verification

**Step 1: Run all backend tests**

```bash
cd backend && dotnet test -v minimal
```

**Step 2: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

**Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json
```

**Step 4: Lint check**

```bash
cd frontend && npx eslint .
```

**Step 5: Build both projects**

```bash
cd backend && dotnet build
cd frontend && npm run build
```

All green = done.
