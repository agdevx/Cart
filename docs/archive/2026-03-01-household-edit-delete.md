# Household Editing and Deletion — Design

## Design Spec


## Scope

Add rename and delete actions to the household detail page.

## Backend

Already complete — no changes needed:
- `GET /api/household/{id}` — returns single household (member-only)
- `PUT /api/household/{id}` — updates household name (any member), accepts `string` body
- `DELETE /api/household/{id}` — deletes household (owner-only)

## UI Changes (Household Detail Page Only)

### Header — Inline Rename

Replace the hardcoded "Household Details" title with the actual household name. A pencil (`Pencil`) icon sits next to the name.

1. Clicking the pencil turns the name into a text input, pre-filled and auto-focused with text selected
2. Save on **Enter** or **blur** (if value changed)
3. Cancel on **Escape** (reverts to original name)
4. While saving, the input is disabled with a subtle loading state
5. Calls `PUT /api/household/{id}` with the updated name

Any household member can rename.

### Danger Zone — Delete (Owner Only)

At the bottom of the page, below the members list:

1. A red "Delete Household" button, visible only to the owner
2. Clicking shows a confirmation dialog: "Delete *{household name}*? This will remove the household and all members. This can't be undone."
3. Two buttons: **Cancel** (secondary) and **Delete** (destructive/red)
4. Calls `DELETE /api/household/{id}`
5. On success, navigates to `/household`

Uses the existing `ConfirmDialog` component.

## New Frontend Hooks

| Hook | Endpoint | Purpose |
|---|---|---|
| `useHouseholdQuery` | `GET /api/household/{id}` | Fetch single household for name display |
| `useUpdateHouseholdMutation` | `PUT /api/household/{id}` | Rename household |
| `useDeleteHouseholdMutation` | `DELETE /api/household/{id}` | Delete household |

## Pages Affected

- `household-detail-page.tsx` — add household name header with inline rename, danger zone delete section

## Implementation Plan


> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline rename and owner-only delete to the household detail page.

**Architecture:** Three new hooks (get, update, delete household) wired into the existing household detail page. Inline rename in the header replaces the hardcoded "Household Details" title. Danger zone delete section at the page bottom uses the existing `ConfirmDialog` component.

**Tech Stack:** React 19, TanStack Query, Vitest, Lucide Icons, TailwindCSS v4

---

### Task 1: Create frontend hooks (get, update, delete household)

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/household/use-household.query.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/delete-household.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/tests/use-household.query.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/household/tests/update-household.mutation.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/household/tests/delete-household.mutation.test.tsx`

**Step 1: Write tests for all three hooks**

Create `frontend/src/apis/agdevx-cart-api/household/tests/use-household.query.test.tsx`:

```tsx
// ABOUTME: Tests for the single household query hook
// ABOUTME: Verifies fetching a household by ID and error handling

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useHouseholdQuery } from '../use-household.query'

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

describe('useHouseholdQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches a household by id', async () => {
    mockAuth()

    const mockHousehold = { id: 'h1', name: 'Test House', createdBy: '1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHousehold),
    } as unknown as Response)

    const { result } = renderHook(() => useHouseholdQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockHousehold))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household/h1')
  })

  it('handles fetch error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useHouseholdQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

Create `frontend/src/apis/agdevx-cart-api/household/tests/update-household.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the update household mutation hook
// ABOUTME: Verifies rename sends correct request and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useUpdateHouseholdMutation } from '../update-household.mutation'

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

describe('useUpdateHouseholdMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('sends PUT with name as JSON string body', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateHouseholdMutation(), { wrapper })

    result.current.mutate({ householdId: 'h1', name: 'New Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household/h1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('New Name'),
    })
  })

  it('invalidates households and household queries on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateHouseholdMutation(), { wrapper })

    result.current.mutate({ householdId: 'h1', name: 'New Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['households'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['household', 'h1'] })
  })

  it('handles update error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateHouseholdMutation(), { wrapper })

    result.current.mutate({ householdId: 'h1', name: 'New Name' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

Create `frontend/src/apis/agdevx-cart-api/household/tests/delete-household.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the delete household mutation hook
// ABOUTME: Verifies delete sends correct request and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useDeleteHouseholdMutation } from '../delete-household.mutation'

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

describe('useDeleteHouseholdMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('deletes household successfully', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteHouseholdMutation(), { wrapper })

    result.current.mutate('h1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household/h1', {
      method: 'DELETE',
    })
  })

  it('invalidates households query on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteHouseholdMutation(), { wrapper })

    result.current.mutate('h1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['households'] })
  })

  it('handles delete error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteHouseholdMutation(), { wrapper })

    result.current.mutate('h1')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/household/tests/use-household.query.test.tsx src/apis/agdevx-cart-api/household/tests/update-household.mutation.test.tsx src/apis/agdevx-cart-api/household/tests/delete-household.mutation.test.tsx`
Expected: FAIL — hooks don't exist yet

**Step 3: Implement useHouseholdQuery**

Create `frontend/src/apis/agdevx-cart-api/household/use-household.query.ts`:

```ts
// ABOUTME: Query hook for fetching a single household by ID
// ABOUTME: Returns household details including name for display and editing

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

export const useHouseholdQuery = (householdId: string) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household', householdId],
    queryFn: async (): Promise<Household> => {
      const response = await apiFetch(`/api/household/${householdId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch household')
      }
      return response.json()
    },
    enabled: isAuthenticated && !!householdId,
  })
}
```

**Step 4: Implement useUpdateHouseholdMutation**

Create `frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts`:

```ts
// ABOUTME: Mutation hook for renaming a household
// ABOUTME: Sends PUT request with name as JSON string body

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateHouseholdRequest {
  householdId: string
  name: string
}

export const useUpdateHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateHouseholdRequest): Promise<void> => {
      const response = await apiFetch(`/api/household/${request.householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.name),
      })
      if (!response.ok) {
        throw new Error('Failed to update household')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId] })
    },
  })
}
```

**Step 5: Implement useDeleteHouseholdMutation**

Create `frontend/src/apis/agdevx-cart-api/household/delete-household.mutation.ts`:

```ts
// ABOUTME: Mutation hook for deleting a household
// ABOUTME: Owner-only operation that removes the household entirely

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<void> => {
      const response = await apiFetch(`/api/household/${householdId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete household')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
```

**Step 6: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/household/tests/use-household.query.test.tsx src/apis/agdevx-cart-api/household/tests/update-household.mutation.test.tsx src/apis/agdevx-cart-api/household/tests/delete-household.mutation.test.tsx`
Expected: All PASS (8 tests)

**Step 7: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/household/use-household.query.ts frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts frontend/src/apis/agdevx-cart-api/household/delete-household.mutation.ts frontend/src/apis/agdevx-cart-api/household/tests/use-household.query.test.tsx frontend/src/apis/agdevx-cart-api/household/tests/update-household.mutation.test.tsx frontend/src/apis/agdevx-cart-api/household/tests/delete-household.mutation.test.tsx
git commit -m "feat: add household query, update, and delete mutation hooks"
```

---

### Task 2: Add rename and delete to household detail page

**Files:**
- Modify: `frontend/src/pages/household-detail-page.tsx`
- Modify: `frontend/src/pages/tests/household-detail-page.test.tsx`

**Step 1: Write tests for new functionality**

Add to `frontend/src/pages/tests/household-detail-page.test.tsx`:

New test cases (add to the existing describe block):

1. **Displays the household name in the header** — verify the household name appears instead of "Household Details"
2. **Renames household via inline edit** — click pencil, change name, press Enter, verify mutation called
3. **Cancels rename on Escape** — click pencil, press Escape, verify mutation NOT called, name reverts
4. **Shows delete button for owner** — verify "Delete Household" button appears when user is owner
5. **Hides delete button for non-owner** — verify "Delete Household" button does NOT appear for regular members
6. **Shows delete confirmation dialog** — click Delete Household, verify dialog appears with household name
7. **Deletes household on confirm** — click Delete in dialog, verify mutation called

New mocks needed:
- `useHouseholdQuery` — return mock household with name
- `useUpdateHouseholdMutation` — return mock with `mutate` spy
- `useDeleteHouseholdMutation` — return mock with `mutate` spy

**Step 2: Run tests to verify new tests fail**

Run: `cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx`
Expected: New tests FAIL — page doesn't have rename/delete yet. Existing 5 tests should still pass.

**Step 3: Update household-detail-page.tsx**

Changes:
- Add imports: `Pencil` from lucide-react, `useHouseholdQuery`, `useUpdateHouseholdMutation`, `useDeleteHouseholdMutation`, `ConfirmDialog`
- Add hooks: `useHouseholdQuery(householdId!)`, `useUpdateHouseholdMutation()`, `useDeleteHouseholdMutation()`
- Add state: `isRenaming` (boolean), `editName` (string), `showDeleteConfirm` (boolean)
- Add loading check: include household query loading in the loading gate
- Replace header title "Household Details" with the household name + pencil icon:
  - Normal mode: `<h1>{household?.name || 'Unnamed'}</h1>` + pencil button
  - Editing mode: text input with Enter/Escape/blur handlers
  - While saving: input disabled
- Add rename handlers:
  - `handleStartRename` — sets `isRenaming(true)`, `editName(household.name)`
  - `handleSaveRename` — calls `updateMutation.mutate({ householdId, name: editName })`, sets `isRenaming(false)`
  - `handleCancelRename` — sets `isRenaming(false)`
  - `handleRenameKeyDown` — Enter saves, Escape cancels
  - `handleRenameBlur` — saves if name changed
- Add danger zone section at page bottom (after members list, before the existing confirmation dialog):
  ```tsx
  {isOwner && (
    <div className="mt-6 p-5 bg-coral/5 rounded-2xl border border-coral/20">
      <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-coral mb-3">Danger Zone</h2>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full py-3 bg-coral text-white rounded-xl font-display font-bold hover:bg-coral/90 transition-colors"
      >
        Delete Household
      </button>
    </div>
  )}
  ```
- Add delete confirmation dialog (using ConfirmDialog component):
  ```tsx
  {showDeleteConfirm && (
    <ConfirmDialog
      title="Delete Household"
      message={`Delete "${household?.name}"? This will remove the household and all members. This can't be undone.`}
      confirmLabel="Delete"
      onConfirm={handleDeleteHousehold}
      onCancel={() => setShowDeleteConfirm(false)}
      isPending={deleteMutation.isPending}
    />
  )}
  ```
- Add delete handler: calls `deleteMutation.mutate(householdId)`, on success navigates to `/household`

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/tests/household-detail-page.test.tsx`
Expected: All PASS (existing 5 + new 7 = 12 tests)

**Step 5: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 6: Commit**

```bash
git add frontend/src/pages/household-detail-page.tsx frontend/src/pages/tests/household-detail-page.test.tsx
git commit -m "feat: add household rename and delete to detail page"
```

---

### Task 3: Run full test suites and verify

**Step 1: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 2: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

**Step 3: Run all backend tests** (sanity check — no backend changes)

Run: `cd backend && dotnet test`
Expected: All PASS
