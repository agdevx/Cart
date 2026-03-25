# Trip Item Editing and Removal — Design

## Design Spec


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

## Implementation Plan


> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline editing and removal of trip items via kebab menus on both the trip detail page and active trip page.

**Architecture:** Two new mutation hooks (update + delete) shared by both pages. A `TripItemRow` component encapsulates each item's display, kebab menu, and inline edit form. Both pages replace their inline item rendering with `TripItemRow`. No backend changes needed — endpoints already exist.

**Tech Stack:** React 19, TanStack Query, Vitest, Lucide Icons, TailwindCSS v4

---

### Task 1: Create frontend mutation hooks (update + delete trip item)

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/delete-trip-item.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/tests/update-trip-item.mutation.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip-item.mutation.test.tsx`

**Step 1: Write test for update trip item mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/tests/update-trip-item.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the update trip item mutation hook
// ABOUTME: Verifies update calls correct endpoint with query params and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useUpdateTripItemMutation } from '../update-trip-item.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockAuth = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useUpdateTripItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates trip item with correct query params', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateTripItemMutation(), { wrapper })

    result.current.mutate({
      tripItemId: 'item1',
      tripId: 'trip1',
      quantity: 3,
      notes: 'Get organic',
      storeId: 'store1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith(
      '/api/tripitem/item1?quantity=3&notes=Get+organic&storeId=store1',
      { method: 'PUT' }
    )
  })

  it('invalidates trip items query on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTripItemMutation(), { wrapper })

    result.current.mutate({
      tripItemId: 'item1',
      tripId: 'trip1',
      quantity: 2,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trips', 'trip1', 'items'] })
  })

  it('handles update error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateTripItemMutation(), { wrapper })

    result.current.mutate({
      tripItemId: 'item1',
      tripId: 'trip1',
      quantity: 2,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 2: Write test for delete trip item mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip-item.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the delete trip item mutation hook
// ABOUTME: Verifies delete calls correct endpoint and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useDeleteTripItemMutation } from '../delete-trip-item.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockAuth = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useDeleteTripItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('deletes trip item successfully', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteTripItemMutation(), { wrapper })

    result.current.mutate({ tripItemId: 'item1', tripId: 'trip1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/tripitem/item1', {
      method: 'DELETE',
    })
  })

  it('invalidates trip items query on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteTripItemMutation(), { wrapper })

    result.current.mutate({ tripItemId: 'item1', tripId: 'trip1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trips', 'trip1', 'items'] })
  })

  it('handles delete error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteTripItemMutation(), { wrapper })

    result.current.mutate({ tripItemId: 'item1', tripId: 'trip1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/trip/tests/update-trip-item.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/delete-trip-item.mutation.test.tsx`
Expected: FAIL — hooks don't exist yet

**Step 4: Implement update trip item mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts`:

```ts
// ABOUTME: Mutation hook for updating trip item properties
// ABOUTME: Sends updated quantity, notes, and store via query params and invalidates cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripItemRequest {
  tripItemId: string
  tripId: string
  quantity: number
  notes?: string | null
  storeId?: string | null
}

export const useUpdateTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateTripItemRequest): Promise<void> => {
      const params = new URLSearchParams({
        quantity: request.quantity.toString(),
      })
      if (request.notes) params.append('notes', request.notes)
      if (request.storeId) params.append('storeId', request.storeId)

      const response = await apiFetch(`/api/tripitem/${request.tripItemId}?${params.toString()}`, {
        method: 'PUT',
      })
      if (!response.ok) {
        throw new Error('Failed to update trip item')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId, 'items'] })
    },
  })
}
```

**Step 5: Implement delete trip item mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/delete-trip-item.mutation.ts`:

```ts
// ABOUTME: Mutation hook for removing items from a trip
// ABOUTME: Sends delete request and invalidates trip items cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface DeleteTripItemRequest {
  tripItemId: string
  tripId: string
}

export const useDeleteTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: DeleteTripItemRequest): Promise<void> => {
      const response = await apiFetch(`/api/tripitem/${request.tripItemId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete trip item')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId, 'items'] })
    },
  })
}
```

**Step 6: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/trip/tests/update-trip-item.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/delete-trip-item.mutation.test.tsx`
Expected: All PASS

**Step 7: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts frontend/src/apis/agdevx-cart-api/trip/delete-trip-item.mutation.ts frontend/src/apis/agdevx-cart-api/trip/tests/update-trip-item.mutation.test.tsx frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip-item.mutation.test.tsx
git commit -m "feat: add update and delete trip item mutation hooks with tests"
```

---

### Task 2: Build TripItemRow component

**Files:**
- Create: `frontend/src/pages/components/trip-item-row.tsx`
- Create: `frontend/src/pages/components/tests/trip-item-row.test.tsx`

**Step 1: Write tests for TripItemRow**

Create `frontend/src/pages/components/tests/trip-item-row.test.tsx`:

The component must be tested in both planning and shopping variants. Key test cases:

1. Renders item name, quantity, and notes
2. Shows kebab menu with Edit and Remove options
3. Clicking Edit expands inline form with quantity, notes, store fields pre-filled
4. Clicking Save calls onUpdate with updated values
5. Clicking Cancel collapses form
6. Clicking Remove calls onDelete immediately (no confirmation)
7. When `showCheckbox` is true, renders checkbox
8. When `showCheckbox` is true, clicking the row calls onToggleCheck
9. When `showCheckbox` is true and editing, row click does NOT toggle check
10. Checked items show strikethrough styling

Mock data needs:
- A mock TripItem
- A mock stores array (for the store dropdown)
- Callback mocks for onUpdate, onDelete, onToggleCheck

Wrapper needs: `BrowserRouter` (not strictly needed but consistent with project patterns).

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/components/tests/trip-item-row.test.tsx`
Expected: FAIL — component doesn't exist yet

**Step 3: Implement TripItemRow**

Create `frontend/src/pages/components/trip-item-row.tsx`:

Props:
```ts
interface TripItemRowProps {
  tripItem: TripItem
  itemName: string
  stores: Store[]
  onUpdate: (tripItemId: string, quantity: number, notes: string | null, storeId: string | null) => void
  onDelete: (tripItemId: string) => void
  isUpdating?: boolean
  showCheckbox?: boolean
  onToggleCheck?: (tripItemId: string, currentlyChecked: boolean) => void
}
```

The component renders:
- **Normal mode**: Item name, quantity, notes, kebab menu
- **Edit mode**: Expanded inline form with quantity input, notes input, store dropdown, Save/Cancel buttons
- **Shopping mode** (showCheckbox=true): Adds a custom checkbox, click-to-toggle, checked styling (teal bg, strikethrough)

The kebab menu uses `MoreVertical` from lucide-react. Menu items: `Pencil` for Edit, `Trash2` for Remove. Same kebab pattern as `TripCard`.

When in edit mode and showCheckbox is true, the row's click-to-toggle behavior is disabled.

Styling matches existing patterns:
- Planning variant: `p-4 bg-surface rounded-xl shadow-sm`
- Shopping variant: same as active-trip-page.tsx lines 123-158 (with checkbox, checked bg, strikethrough)
- Edit form: nested inside the row, fields with standard input styling
- Kebab: positioned top-right of the row

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/components/tests/trip-item-row.test.tsx`
Expected: All PASS

**Step 5: Commit**

```bash
git add frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/components/tests/trip-item-row.test.tsx
git commit -m "feat: add TripItemRow component with kebab menu and inline edit"
```

---

### Task 3: Integrate TripItemRow into trip detail page

**Files:**
- Modify: `frontend/src/pages/trip-detail-page.tsx`
- Modify or Create: `frontend/src/pages/tests/trip-detail-page.test.tsx`

**Step 1: Write tests for the updated trip detail page**

Test cases:
1. Renders trip items using TripItemRow (verify kebab menus appear)
2. Editing a trip item: open kebab, click Edit, change quantity, click Save — verify updateMutation called
3. Removing a trip item: open kebab, click Remove — verify deleteMutation called
4. Store dropdown populated in edit form

Mocks needed:
- `useTripQuery` — return mock trip
- `useTripItemsQuery` — return mock items
- `useInventoryQuery` — return mock inventory
- `useAddTripItemMutation` — return mock
- `useUpdateTripItemMutation` — return mock with `mutate` spy
- `useDeleteTripItemMutation` — return mock with `mutate` spy
- `useStoresQuery` — return mock stores
- `useHouseholdsQuery` — return mock households

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx`
Expected: FAIL — page doesn't use new components yet

**Step 3: Update trip-detail-page.tsx**

Changes to `frontend/src/pages/trip-detail-page.tsx`:
- Add imports: `useUpdateTripItemMutation`, `useDeleteTripItemMutation`, `useStoresQuery`, `useHouseholdsQuery`, `TripItemRow`
- Add hooks: `useUpdateTripItemMutation()`, `useDeleteTripItemMutation()`, `useStoresQuery(householdIds)`, `useHouseholdsQuery()`
- Derive `householdIds` from households data (same pattern as inventory-stores-view.tsx)
- Add `handleUpdateItem(tripItemId, quantity, notes, storeId)` handler
- Add `handleDeleteItem(tripItemId)` handler
- Replace lines 150-171 (inline item rendering) with `TripItemRow` components:

```tsx
{tripItems.map((item) => {
  const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
  return (
    <TripItemRow
      key={item.id}
      tripItem={item}
      itemName={inventoryItem?.name || 'Unknown Item'}
      stores={stores || []}
      onUpdate={handleUpdateItem}
      onDelete={handleDeleteItem}
      isUpdating={updateMutation.isPending}
    />
  )
})}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/tests/trip-detail-page.test.tsx`
Expected: All PASS

**Step 5: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 6: Commit**

```bash
git add frontend/src/pages/trip-detail-page.tsx frontend/src/pages/tests/trip-detail-page.test.tsx
git commit -m "feat: add trip item edit/remove to trip detail page"
```

---

### Task 4: Integrate TripItemRow into active trip page

**Files:**
- Modify: `frontend/src/pages/active-trip-page.tsx`
- Modify or Create: `frontend/src/pages/tests/active-trip-page.test.tsx`

**Step 1: Write tests for the updated active trip page**

Test cases:
1. Renders trip items with checkboxes and kebab menus
2. Clicking an item toggles check (existing behavior preserved)
3. Editing: open kebab, click Edit, change quantity, click Save — verify updateMutation called
4. Removing: open kebab, click Remove — verify deleteMutation called
5. Checked items show strikethrough styling (existing behavior preserved)
6. When editing, clicking the row does NOT toggle check

Mocks needed:
- Same as Task 3 plus `useCheckTripItemMutation`, `useCompleteTripMutation`, `useSSE`

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/tests/active-trip-page.test.tsx`
Expected: FAIL — page doesn't use new components yet

**Step 3: Update active-trip-page.tsx**

Changes to `frontend/src/pages/active-trip-page.tsx`:
- Add imports: `useUpdateTripItemMutation`, `useDeleteTripItemMutation`, `useStoresQuery`, `useHouseholdsQuery`, `TripItemRow`
- Add hooks: same as trip detail page
- Add `handleUpdateItem` and `handleDeleteItem` handlers
- Replace lines 118-161 (inline item rendering with checkbox) with `TripItemRow` components:

```tsx
{tripItems.map((item) => {
  const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
  return (
    <TripItemRow
      key={item.id}
      tripItem={item}
      itemName={inventoryItem?.name || 'Unknown Item'}
      stores={stores || []}
      onUpdate={handleUpdateItem}
      onDelete={handleDeleteItem}
      isUpdating={updateMutation.isPending}
      showCheckbox
      onToggleCheck={(id, checked) => handleToggleItem(id, checked)}
    />
  )
})}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/tests/active-trip-page.test.tsx`
Expected: All PASS

**Step 5: Commit**

```bash
git add frontend/src/pages/active-trip-page.tsx frontend/src/pages/tests/active-trip-page.test.tsx
git commit -m "feat: add trip item edit/remove to active trip page"
```

---

### Task 5: Run full test suites and verify

**Step 1: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 2: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

**Step 3: Run all backend tests** (sanity check — no backend changes)

Run: `cd backend && dotnet test`
Expected: All PASS
