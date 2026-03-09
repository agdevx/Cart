# App Improvements Round 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 401 store creation bug, improve UI/UX across multiple pages, redesign add-items workflow, rename inventory to pantry.

**Architecture:** Eight independent changes spanning backend bug fix, frontend route restructuring, UI component updates, and a new add-items page. Changes are ordered to minimize conflicts — rename (task 7) is done first since it touches routes used by other tasks.

**Tech Stack:** .NET 10 (backend fix), React 19, TypeScript, TailwindCSS v4, TanStack Query, React Router v7, Lucide Icons

---

### Task 1: Fix 401 on Store Creation (Backend)

**Root Cause:** `StoreService.CreateStore` checks `store.UserId != userId` for personal stores, but the frontend never sends `userId` in the request body — so `store.UserId` is `Guid.Empty`, which always fails the check. `InventoryService.CreateInventoryItem` handles this correctly by auto-setting `inventoryItem.OwnerUserId = userId` for personal items.

**Files:**
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs:24-28`
- Modify: `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`

**Step 1: Write a failing test for personal store creation without userId**

In `StoreServiceTests.cs`, add a test after the existing `Should_CreatePersonalStore_When_UserIdMatches` test:

```csharp
[Fact]
public async Task Should_CreatePersonalStore_When_UserIdNotProvided()
{
    // Arrange
    var userId = Guid.NewGuid();
    var store = new Store
    {
        Name = "My Local Store",
        // No UserId set — simulates what the frontend sends
    };

    _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>()))
                        .ReturnsAsync(store);

    // Act
    var result = await _storeService.CreateStore(store, userId);

    // Assert
    result.Should().NotBeNull();
    result.Name.Should().Be("My Local Store");
    store.UserId.Should().Be(userId);
    _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>()), Times.Once);
}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test --filter "Should_CreatePersonalStore_When_UserIdNotProvided"`
Expected: FAIL — `UnauthorizedAccessException: Cannot create store for another user`

**Step 3: Fix StoreService.CreateStore**

In `StoreService.cs`, replace the personal store branch (lines 24-28):

```csharp
//== Personal store: verify userId matches
else if (store.UserId != userId)
{
    throw new UnauthorizedAccessException("Cannot create store for another user");
}
```

With:

```csharp
//== Personal store: automatically set owner to current user
else
{
    store.UserId = userId;
}
```

This matches the pattern used by `InventoryService.CreateInventoryItem` (line 27).

**Step 4: Run all store service tests**

Run: `cd backend && dotnet test --filter "StoreServiceTests"`
Expected: ALL PASS

**Step 5: Run full backend test suite**

Run: `cd backend && dotnet test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Services/StoreService.cs backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs
git commit -m "fix: auto-set userId on personal store creation to prevent 401"
```

---

### Task 2: Rename Inventory → Pantry (Frontend Routes & Files)

Do this early since it touches routes used by other tasks. This is frontend-only — backend API routes stay as `/api/inventory/...`.

**Files to rename:**
- `frontend/src/pages/inventory-page.tsx` → `frontend/src/pages/pantry-page.tsx`
- `frontend/src/pages/inventory-items-view.tsx` → `frontend/src/pages/pantry-items-view.tsx`
- `frontend/src/pages/inventory-stores-view.tsx` → `frontend/src/pages/pantry-stores-view.tsx`
- `frontend/src/pages/add-inventory-item-page.tsx` → `frontend/src/pages/add-pantry-item-page.tsx`
- `frontend/src/pages/tests/inventory-page.test.tsx` → `frontend/src/pages/tests/pantry-page.test.tsx`
- `frontend/src/pages/tests/inventory-items-view.test.tsx` → `frontend/src/pages/tests/pantry-items-view.test.tsx`
- `frontend/src/pages/tests/inventory-stores-view.test.tsx` → `frontend/src/pages/tests/pantry-stores-view.test.tsx`

**Files to modify (imports/routes):**
- `frontend/src/app.tsx` — route paths `/inventory` → `/pantry`, component imports
- `frontend/src/features/bottom-nav/bottom-nav.tsx` — tab path `/inventory` → `/pantry`
- `frontend/src/pages/add-inventory-item-page.tsx` (renamed) — navigate path `/inventory` → `/pantry`
- All renamed page files — update ABOUTME comments, component names, imports

**Step 1: Rename files using git mv**

```bash
cd frontend/src/pages
git mv inventory-page.tsx pantry-page.tsx
git mv inventory-items-view.tsx pantry-items-view.tsx
git mv inventory-stores-view.tsx pantry-stores-view.tsx
git mv add-inventory-item-page.tsx add-pantry-item-page.tsx
cd tests
git mv inventory-page.test.tsx pantry-page.test.tsx
git mv inventory-items-view.test.tsx pantry-items-view.test.tsx
git mv inventory-stores-view.test.tsx pantry-stores-view.test.tsx
```

**Step 2: Update component names and exports in renamed files**

In `pantry-page.tsx`:
- Rename `InventoryPage` → `PantryPage`
- Update ABOUTME comments to say "Pantry" instead of "Inventory"
- Update import paths: `@/pages/inventory-items-view` → `@/pages/pantry-items-view`
- Update import paths: `@/pages/inventory-stores-view` → `@/pages/pantry-stores-view`
- Update import: `import type { InventoryFilter } from '@/pages/inventory-items-view'` → `from '@/pages/pantry-items-view'`
- Update route in "Add Item" link: `/inventory/add` → `/pantry/add`

In `pantry-items-view.tsx`:
- Rename `InventoryItemsView` → `PantryItemsView`
- Update ABOUTME comments

In `pantry-stores-view.tsx`:
- Rename `InventoryStoresView` → `PantryStoresView`
- Update ABOUTME comments

In `add-pantry-item-page.tsx`:
- Rename `AddInventoryItemPage` → `AddPantryItemPage`
- Update ABOUTME comments
- Change `navigate('/inventory')` → `navigate('/pantry')`

**Step 3: Update app.tsx routes and imports**

```tsx
// Update imports
import { AddPantryItemPage } from '@/pages/add-pantry-item-page'
import { PantryPage } from '@/pages/pantry-page'

// Update routes
<Route path="/pantry" element={<ProtectedRoute><LayoutWithNav><PantryPage /></LayoutWithNav></ProtectedRoute>} />
<Route path="/pantry/add" element={<ProtectedRoute><AddPantryItemPage /></ProtectedRoute>} />
```

Remove old inventory imports and routes.

**Step 4: Update bottom-nav.tsx**

Change the pantry tab path from `/inventory` to `/pantry`:

```tsx
{ path: '/pantry', label: 'Pantry', icon: Package },
```

**Step 5: Update all test files**

In each renamed test file, update:
- Import paths to match new file names
- Component name references (`InventoryPage` → `PantryPage`, etc.)
- ABOUTME comments

**Step 6: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: PASS (no type errors)

**Step 7: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: ALL PASS

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename inventory to pantry throughout frontend"
```

---

### Task 3: Bottom Nav on All Authenticated Screens

**Files:**
- Modify: `frontend/src/app.tsx`

**Step 1: Restructure LayoutWithNav to wrap all protected routes**

In `app.tsx`, move `<BottomNav />` from `LayoutWithNav` into a new `AuthenticatedLayout` that wraps all protected routes. Every protected route gets `pb-24` padding and the bottom nav.

Replace the current route structure with:

```tsx
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-bg min-h-screen pb-24">
    {children}
    <BottomNav />
  </div>
)

export const AppRoutes = () => (
  <>
    <PwaInstallPrompt />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pantry" element={<ProtectedRoute><AuthenticatedLayout><PantryPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/pantry/add" element={<ProtectedRoute><AuthenticatedLayout><AddPantryItemPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping" element={<ProtectedRoute><AuthenticatedLayout><ShoppingPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping/:tripId" element={<ProtectedRoute><AuthenticatedLayout><TripDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping/:tripId/active" element={<ProtectedRoute><AuthenticatedLayout><ActiveTripPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household" element={<ProtectedRoute><AuthenticatedLayout><HouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/create" element={<ProtectedRoute><AuthenticatedLayout><CreateHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/join" element={<ProtectedRoute><AuthenticatedLayout><JoinHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/:id" element={<ProtectedRoute><AuthenticatedLayout><HouseholdDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/shopping" replace />} />
    </Routes>
  </>
)
```

Remove the old `LayoutWithNav` component.

**Step 2: Remove duplicate `pb-24` / `min-h-screen` / `bg-bg` from individual pages**

Since `AuthenticatedLayout` now provides `bg-bg min-h-screen pb-24`, remove these classes from pages that had them independently:
- `active-trip-page.tsx` — remove `bg-bg min-h-screen` from the wrapper div, keep `px-5 pt-14 pb-8`
- `add-pantry-item-page.tsx` — remove `bg-bg min-h-screen` from wrapper div
- `create-household-page.tsx` — remove `bg-bg min-h-screen` from wrapper div
- `trip-detail-page.tsx` — remove `bg-bg min-h-screen` from wrapper div

Check each page: if it has its own `pb-8`, that's fine — the `pb-24` on `AuthenticatedLayout` ensures enough space for the nav.

**Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: PASS

**Step 4: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add frontend/src/app.tsx frontend/src/pages/active-trip-page.tsx frontend/src/pages/add-pantry-item-page.tsx frontend/src/pages/create-household-page.tsx frontend/src/pages/trip-detail-page.tsx
git commit -m "feat: show bottom nav on all authenticated screens"
```

---

### Task 4: Item Type Description Styling (Custom Dropdown)

The parenthetical "(Household)" in type selectors needs lighter grey text. Native `<option>` can't do mixed colors, so build a lightweight custom dropdown.

**Files:**
- Create: `frontend/src/pages/components/scope-select.tsx`
- Create: `frontend/src/pages/components/tests/scope-select.test.tsx`
- Modify: `frontend/src/pages/add-pantry-item-page.tsx`
- Modify: `frontend/src/pages/shopping-page.tsx`
- Modify: `frontend/src/pages/pantry-stores-view.tsx`

**Step 1: Write tests for ScopeSelect component**

Create `frontend/src/pages/components/tests/scope-select.test.tsx`:

```tsx
// ABOUTME: Tests for the ScopeSelect custom dropdown
// ABOUTME: Verifies rendering, selection, and description styling

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ScopeSelect } from '../scope-select'

const mockHouseholds = [
  { id: 'h1', name: 'Smith Family' },
  { id: 'h2', name: 'Work Team' },
]

describe('ScopeSelect', () => {
  it('should render personal option and household options', () => {
    render(
      <ScopeSelect
        value="personal"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
      />
    )

    // Open the dropdown
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Personal Item')).toBeInTheDocument()
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    expect(screen.getByText('Work Team')).toBeInTheDocument()
  })

  it('should render household descriptions in muted style', () => {
    render(
      <ScopeSelect
        value="personal"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
      />
    )

    fireEvent.click(screen.getByRole('button'))

    const descriptions = screen.getAllByText('(Household)')
    descriptions.forEach((desc) => {
      expect(desc).toHaveClass('text-text-tertiary')
    })
  })

  it('should call onChange when an option is selected', () => {
    const onChange = vi.fn()

    render(
      <ScopeSelect
        value="personal"
        onChange={onChange}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
      />
    )

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Smith Family'))

    expect(onChange).toHaveBeenCalledWith('h1')
  })

  it('should show selected option label when closed', () => {
    render(
      <ScopeSelect
        value="h1"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
      />
    )

    expect(screen.getByRole('button')).toHaveTextContent('Smith Family')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/components/tests/scope-select.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement ScopeSelect**

Create `frontend/src/pages/components/scope-select.tsx`:

```tsx
// ABOUTME: Custom dropdown for scope selection (personal vs household)
// ABOUTME: Renders household description text in muted grey to distinguish from option name

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ScopeOption {
  id: string
  name: string | null
}

interface ScopeSelectProps {
  value: string
  onChange: (value: string) => void
  personalLabel: string
  households: ScopeOption[] | undefined
  householdDescription: string
  disabled?: boolean
}

export const ScopeSelect = ({
  value,
  onChange,
  personalLabel,
  households,
  householdDescription,
  disabled,
}: ScopeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDisplayLabel = () => {
    if (value === 'personal') return personalLabel
    const household = households?.find((h) => h.id === value)
    return household?.name || personalLabel
  }

  const handleSelect = (newValue: string) => {
    onChange(newValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-left flex justify-between items-center"
      >
        <span>{getDisplayLabel()}</span>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-surface border border-navy/10 rounded-xl shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => handleSelect('personal')}
            className={`w-full px-4 py-3 text-left hover:bg-bg-warm transition-colors ${
              value === 'personal' ? 'bg-teal/8 text-teal font-semibold' : 'text-text'
            }`}
          >
            {personalLabel}
          </button>
          {households?.map((household) => (
            <button
              key={household.id}
              type="button"
              onClick={() => handleSelect(household.id)}
              className={`w-full px-4 py-3 text-left hover:bg-bg-warm transition-colors ${
                value === household.id ? 'bg-teal/8 text-teal font-semibold' : 'text-text'
              }`}
            >
              {household.name}
              {' '}
              <span className="text-text-tertiary text-sm">({householdDescription})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/components/tests/scope-select.test.tsx`
Expected: PASS

**Step 5: Replace native selects with ScopeSelect**

In `add-pantry-item-page.tsx`, replace the `<select id="household">` block (lines 77-90) with:

```tsx
<ScopeSelect
  value={householdId}
  onChange={setHouseholdId}
  personalLabel="Personal Item"
  households={households}
  householdDescription="Household"
  disabled={createMutation.isPending}
/>
```

Add import: `import { ScopeSelect } from './components/scope-select'`

In `shopping-page.tsx`, replace the `<select id="household">` block (lines 117-131) with:

```tsx
<ScopeSelect
  value={householdId}
  onChange={setHouseholdId}
  personalLabel="Personal Trip"
  households={households}
  householdDescription="Household"
  disabled={createMutation.isPending}
/>
```

Add import: `import { ScopeSelect } from './components/scope-select'`

In `pantry-stores-view.tsx`, replace the `<select id="storeScope">` block (lines 190-203) with:

```tsx
<ScopeSelect
  value={storeScope}
  onChange={setStoreScope}
  personalLabel="Personal"
  households={households}
  householdDescription="Household"
  disabled={createMutation.isPending}
/>
```

Add import: `import { ScopeSelect } from './components/scope-select'`

**Step 6: Run TypeScript check and full test suite**

Run: `cd frontend && npx tsc -b --noEmit && npm test`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add frontend/src/pages/components/scope-select.tsx frontend/src/pages/components/tests/scope-select.test.tsx frontend/src/pages/add-pantry-item-page.tsx frontend/src/pages/shopping-page.tsx frontend/src/pages/pantry-stores-view.tsx
git commit -m "feat: custom scope dropdown with muted description styling"
```

---

### Task 5: Navigate to Trip After Creation

**Files:**
- Modify: `frontend/src/pages/shopping-page.tsx`
- Modify: `frontend/src/pages/tests/shopping-page.test.tsx`

**Step 1: Write/update test for post-creation navigation**

In `shopping-page.test.tsx`, add a test that verifies navigation after trip creation:

```tsx
it('should navigate to new trip after creation', async () => {
  const mockNavigate = vi.fn()
  vi.mocked(useNavigate).mockReturnValue(mockNavigate)

  // Mock createMutation to return trip with ID
  const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-trip-id' })
  // ... setup to capture the mutateAsync call

  // Fill form and submit
  // Assert: expect(mockNavigate).toHaveBeenCalledWith('/shopping/new-trip-id')
})
```

Note: Adapt to match the existing test file's mock patterns. The existing test mocks `useCreateTripMutation` as a module spy — follow that pattern.

**Step 2: Update ShoppingPage to navigate after creation**

In `shopping-page.tsx`, modify `handleCreateTrip` (lines 33-49):

```tsx
const handleCreateTrip = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!tripName.trim()) {
    return
  }

  try {
    const newTrip = await createMutation.mutateAsync({
      name: tripName.trim(),
      householdId: householdId === 'personal' ? null : householdId,
    })
    setTripName('')
    setShowCreateForm(false)
    navigate(`/shopping/${newTrip.id}`)
  } catch {
    // Error handled by mutation state
  }
}
```

Add `useNavigate` import and hook call:

```tsx
const navigate = useNavigate()
```

**Step 3: Run tests**

Run: `cd frontend && npx vitest run src/pages/tests/shopping-page.test.tsx`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add frontend/src/pages/shopping-page.tsx frontend/src/pages/tests/shopping-page.test.tsx
git commit -m "feat: navigate to trip detail page after creating a trip"
```

---

### Task 6: Styled Confirmation Modal for Incomplete Trip

**Files:**
- Modify: `frontend/src/pages/active-trip-page.tsx`
- Modify: `frontend/src/pages/tests/active-trip-page.test.tsx`

**Step 1: Update test to expect styled dialog instead of native confirm**

In `active-trip-page.test.tsx`, find the test that verifies the confirm behavior when not all items are checked. Replace the `window.confirm` mock with assertions on the `ConfirmDialog` component rendering:

```tsx
it('should show confirmation dialog when completing trip with unchecked items', async () => {
  // ... existing setup with unchecked items ...

  fireEvent.click(screen.getByText('Complete Trip'))

  // Verify styled dialog appears (not native confirm)
  expect(screen.getByText('It looks like you may have missed some items. Are you sure you want to complete your trip?')).toBeInTheDocument()
  expect(screen.getByText('Complete Anyway')).toBeInTheDocument()
  expect(screen.getByText('Keep Shopping')).toBeInTheDocument()
})
```

**Step 2: Replace native confirm() with ConfirmDialog**

In `active-trip-page.tsx`:

Add state: `const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)`

Add import: `import { ConfirmDialog } from './components/confirm-dialog'`

Replace `handleCompleteTrip` (lines 74-90):

```tsx
const handleCompleteTrip = async () => {
  if (!tripId) return

  const allChecked = tripItems?.every((item) => item.isChecked)

  if (!allChecked) {
    setShowCompleteConfirm(true)
    return
  }

  await doCompleteTrip()
}

const doCompleteTrip = async () => {
  if (!tripId) return

  try {
    await completeMutation.mutateAsync(tripId)
    navigate('/shopping')
  } catch {
    // Error handled by mutation state
  }
}
```

Add the dialog in the JSX, after the "Complete Trip" button:

```tsx
{showCompleteConfirm && (
  <ConfirmDialog
    title="Hold on!"
    message="It looks like you may have missed some items. Are you sure you want to complete your trip?"
    confirmLabel="Complete Anyway"
    cancelLabel="Keep Shopping"
    onConfirm={() => {
      setShowCompleteConfirm(false)
      doCompleteTrip()
    }}
    onCancel={() => setShowCompleteConfirm(false)}
    isPending={completeMutation.isPending}
  />
)}
```

Note: The `ConfirmDialog` currently uses a hardcoded "Cancel" label. Add a `cancelLabel` prop:

In `confirm-dialog.tsx`, add optional `cancelLabel` prop:

```tsx
interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}
```

And use it in the cancel button: `{cancelLabel || 'Cancel'}`

**Step 3: Run tests**

Run: `cd frontend && npx vitest run src/pages/tests/active-trip-page.test.tsx`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add frontend/src/pages/active-trip-page.tsx frontend/src/pages/tests/active-trip-page.test.tsx frontend/src/pages/components/confirm-dialog.tsx
git commit -m "feat: replace native confirm with styled dialog on incomplete trip completion"
```

---

### Task 7: Household Card — Members Instead of Date

**Files:**
- Modify: `frontend/src/pages/household-page.tsx`
- Modify: `frontend/src/apis/agdevx-cart-api/models/household.ts` — add `displayName` to `HouseholdMember`
- Modify: `backend/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs` — add `.ThenInclude(m => m.User)` to include user data in member responses

**Step 1: Add ThenInclude for User navigation property (backend)**

In `HouseholdRepository.cs`, update the `GetById` method (line 14) and `GetUserHouseholds` method (line 28) to include user data:

```csharp
// GetById
return await context.Households.Include(h => h.Members)
                               .ThenInclude(m => m.User)
                               .FirstOrDefaultAsync(h => h.Id == householdId);

// GetByInviteCode
return await context.Households.Include(h => h.Members)
                               .ThenInclude(m => m.User)
                               .FirstOrDefaultAsync(h => h.InviteCode == inviteCode);

// GetUserHouseholds
return await context.Households.Include(h => h.Members)
                               .ThenInclude(m => m.User)
                               .Where(h => h.Members.Any(m => m.UserId == userId))
                               .ToListAsync();
```

**Step 2: Run backend tests**

Run: `cd backend && dotnet test`
Expected: ALL PASS

**Step 3: Update frontend HouseholdMember model**

In `frontend/src/apis/agdevx-cart-api/models/household.ts`, add `displayName` to `HouseholdMember`:

```typescript
export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  joinedAt: string;
  role: string;
  user?: {
    displayName: string | null;
  };
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
```

**Step 4: Create a helper component for household card members**

In `household-page.tsx`, replace the created date with member names. Import `useHouseholdMembersQuery` and use it per-household.

Create a small inline component or extract one:

```tsx
const HouseholdMembersList = ({ householdId }: { householdId: string }) => {
  const { data: members } = useHouseholdMembersQuery(householdId)

  if (!members || members.length === 0) return null

  const names = members
    .map((m) => m.user?.displayName || 'Unknown')
    .join(', ')

  return (
    <p className="text-[13px] text-text-secondary font-medium mt-1 truncate">
      {names}
    </p>
  )
}
```

Replace the `Created: {date}` paragraph in the household card with `<HouseholdMembersList householdId={household.id} />`.

**Step 5: Run TypeScript check and frontend tests**

Run: `cd frontend && npx tsc -b --noEmit && npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs frontend/src/apis/agdevx-cart-api/models/household.ts frontend/src/pages/household-page.tsx
git commit -m "feat: show member names instead of created date on household cards"
```

---

### Task 8: Redesign Add-Items-to-Shopping-List

The largest change. Replace the one-at-a-time add-item form with a full pantry list page.

**Files:**
- Create: `frontend/src/pages/add-trip-items-page.tsx`
- Create: `frontend/src/pages/tests/add-trip-items-page.test.tsx`
- Modify: `frontend/src/app.tsx` — add new route
- Modify: `frontend/src/pages/trip-detail-page.tsx` — replace inline add-item form with link to new page

**Step 1: Add route in app.tsx**

Add before the active trip route:

```tsx
<Route path="/shopping/:tripId/add-items" element={<ProtectedRoute><AuthenticatedLayout><AddTripItemsPage /></AuthenticatedLayout></ProtectedRoute>} />
```

Add import: `import { AddTripItemsPage } from '@/pages/add-trip-items-page'`

**Step 2: Write tests for AddTripItemsPage**

Create `frontend/src/pages/tests/add-trip-items-page.test.tsx`:

```tsx
// ABOUTME: Tests for the AddTripItemsPage
// ABOUTME: Verifies search filtering, item selection, quantity input, and batch add

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as personalInventoryModule from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import * as householdInventoryModule from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import * as tripQueryModule from '@/apis/agdevx-cart-api/trip/use-trip.query'
import * as tripItemsModule from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import * as addTripItemModule from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'

import { AddTripItemsPage } from '../add-trip-items-page'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip1' }),
    useNavigate: () => vi.fn(),
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockInventory: InventoryItem[] = [
  { id: 'item1', name: 'Milk', householdId: null, ownerUserId: 'user1', notes: null, createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'item2', name: 'Bread', householdId: 'h1', ownerUserId: null, notes: null, createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'item3', name: 'Eggs', householdId: null, ownerUserId: 'user1', notes: null, createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

// ... setup mocks following existing test patterns ...

describe('AddTripItemsPage', () => {
  it('should render search bar and item list', () => {
    // ... mock query hooks ...
    render(<AddTripItemsPage />, { wrapper })

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
  })

  it('should filter items by search text', () => {
    render(<AddTripItemsPage />, { wrapper })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'mil' } })

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  it('should exclude items already on the trip', () => {
    // Mock tripItems to include item1
    render(<AddTripItemsPage />, { wrapper })

    expect(screen.queryByText('Milk')).not.toBeInTheDocument()
  })

  it('should show quantity input when item is selected', () => {
    render(<AddTripItemsPage />, { wrapper })

    fireEvent.click(screen.getByText('Milk'))

    // Quantity input should appear with default value 1
    const quantityInput = screen.getByDisplayValue('1')
    expect(quantityInput).toBeInTheDocument()
  })

  it('should show Start Shopping button with selected count', () => {
    render(<AddTripItemsPage />, { wrapper })

    fireEvent.click(screen.getByText('Milk'))
    fireEvent.click(screen.getByText('Eggs'))

    expect(screen.getByText(/Start Shopping/)).toBeInTheDocument()
  })
})
```

Adapt mock setup to match the existing patterns in `trip-detail-page.test.tsx` and `active-trip-page.test.tsx`.

**Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/tests/add-trip-items-page.test.tsx`
Expected: FAIL — module not found

**Step 4: Implement AddTripItemsPage**

Create `frontend/src/pages/add-trip-items-page.tsx`:

```tsx
// ABOUTME: Add items to trip page with full pantry list, search, and batch selection
// ABOUTME: Replaces the one-at-a-time item adding with a selectable list and Start Shopping button

import { ArrowLeft, Search, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import { useAddTripItemMutation } from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'

type SourceFilter = 'all' | 'personal' | string // string = householdId

export const AddTripItemsPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip } = useTripQuery(tripId!)
  const { data: allInventory } = useInventoryQuery()
  const { data: personalInventory } = usePersonalInventoryQuery()
  const { data: households } = useHouseholdsQuery()
  const { data: tripItems } = useTripItemsQuery(tripId!)
  const addItemMutation = useAddTripItemMutation()

  const [searchText, setSearchText] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [isAdding, setIsAdding] = useState(false)

  // Get the right inventory based on source filter
  // For household filters, we need individual household inventory queries
  // Since hooks can't be called conditionally, we use the all-inventory query and filter client-side
  const filteredBySource = useMemo(() => {
    let items = allInventory || []

    if (sourceFilter === 'personal') {
      items = items.filter((item) => item.ownerUserId !== null && item.householdId === null)
    } else if (sourceFilter !== 'all') {
      items = items.filter((item) => item.householdId === sourceFilter)
    }

    return items
  }, [allInventory, sourceFilter])

  // Exclude items already on the trip
  const availableItems = useMemo(() => {
    const tripItemIds = new Set(tripItems?.map((ti) => ti.inventoryItemId) || [])
    return filteredBySource.filter((item) => !tripItemIds.has(item.id))
  }, [filteredBySource, tripItems])

  // Apply search filter
  const displayItems = useMemo(() => {
    if (!searchText.trim()) return availableItems
    const search = searchText.toLowerCase()
    return availableItems.filter((item) => item.name.toLowerCase().includes(search))
  }, [availableItems, searchText])

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.set(itemId, 1)
      }
      return next
    })
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      next.set(itemId, Math.max(1, quantity))
      return next
    })
  }

  const handleStartShopping = async () => {
    if (!tripId || selectedItems.size === 0) return

    setIsAdding(true)
    try {
      // Add all selected items in parallel
      await Promise.all(
        Array.from(selectedItems.entries()).map(([inventoryItemId, quantity]) =>
          addItemMutation.mutateAsync({
            tripId,
            inventoryItemId,
            quantity,
          })
        )
      )
      navigate(`/shopping/${tripId}/active`)
    } catch {
      // Error handled by mutation state
      setIsAdding(false)
    }
  }

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="mb-4">
        <button
          onClick={() => navigate(`/shopping/${tripId}`)}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trip
        </button>
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Add <span className="text-teal">Items</span>
        </h1>
        {trip && <p className="text-text-secondary text-sm mt-1">{trip.name}</p>}
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search pantry items..."
          className="w-full pl-10 pr-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
        />
      </div>

      {/* Source filter toggle — same pattern as Items/Stores on Pantry page */}
      <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 mb-4 overflow-x-auto">
        <button
          role="tab"
          aria-selected={sourceFilter === 'all'}
          onClick={() => setSourceFilter('all')}
          className={`flex-shrink-0 px-3 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            sourceFilter === 'all'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          All
        </button>
        <button
          role="tab"
          aria-selected={sourceFilter === 'personal'}
          onClick={() => setSourceFilter('personal')}
          className={`flex-shrink-0 px-3 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            sourceFilter === 'personal'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Personal
        </button>
        {households?.map((household) => (
          <button
            key={household.id}
            role="tab"
            aria-selected={sourceFilter === household.id}
            onClick={() => setSourceFilter(household.id)}
            className={`flex-shrink-0 px-3 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
              sourceFilter === household.id
                ? 'bg-teal text-white shadow-sm'
                : 'text-text-secondary hover:text-navy'
            }`}
          >
            {household.name}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-2 mb-24">
        {displayItems.length > 0 ? (
          displayItems.map((item) => {
            const isSelected = selectedItems.has(item.id)
            return (
              <div
                key={item.id}
                className={`p-4 bg-surface rounded-xl shadow-sm flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-teal/40' : ''
                }`}
                onClick={() => handleToggleItem(item.id)}
              >
                {/* Checkbox indicator */}
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-teal border-teal text-white'
                      : 'border-navy/20 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-navy">{item.name}</span>
                  {item.householdId && (
                    <span className="ml-2 text-xs text-text-tertiary font-medium">
                      {households?.find((h) => h.id === item.householdId)?.name || 'Household'}
                    </span>
                  )}
                  {!item.householdId && (
                    <span className="ml-2 text-xs text-text-tertiary font-medium">Personal</span>
                  )}
                </div>

                {/* Quantity input (visible when selected) */}
                {isSelected && (
                  <input
                    type="number"
                    min="1"
                    value={selectedItems.get(item.id) || 1}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleQuantityChange(item.id, parseInt(e.target.value, 10) || 1)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 px-2 py-1.5 border border-navy/10 rounded-lg bg-bg text-center text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                )}
              </div>
            )
          })
        ) : (
          <p className="text-text-secondary text-center py-8">
            {searchText ? 'No items match your search' : 'No items available'}
          </p>
        )}
      </div>

      {/* Sticky Start Shopping button */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-5 pb-2">
          <button
            onClick={handleStartShopping}
            disabled={isAdding}
            className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingCart className="w-5 h-5" />
            {isAdding ? 'Adding Items...' : `Start Shopping (${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 5: Update TripDetailPage to link to new add-items page**

In `trip-detail-page.tsx`, replace the inline add-item form with a button that navigates to the new page.

Remove: `showAddItem` state, `selectedItemId` state, `quantity` state, `handleAddItem` function, and the inline form JSX.

Replace the "Add Item" button and form with:

```tsx
<button
  onClick={() => navigate(`/shopping/${tripId}/add-items`)}
  className="px-4 py-2 text-sm font-display font-semibold text-teal border border-teal/30 rounded-xl hover:bg-teal/8 transition-colors"
>
  Add Items
</button>
```

Remove unused imports: `useState` (if no longer needed), `useInventoryQuery`, `useAddTripItemMutation`.

**Step 6: Run TypeScript check and full test suite**

Run: `cd frontend && npx tsc -b --noEmit && npm test`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/tests/add-trip-items-page.test.tsx frontend/src/pages/trip-detail-page.tsx frontend/src/app.tsx
git commit -m "feat: redesign add-items with full pantry list, search, and batch selection"
```
