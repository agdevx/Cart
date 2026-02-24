# Store Management UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add store management CRUD to the inventory page via an Items/Stores segmented control.

**Architecture:** The inventory page gets a segmented control toggling between the existing items view and a new stores view. Store API hooks follow the existing TanStack Query patterns. The stores view is a separate component (`inventory-stores-view.tsx`) rendered conditionally by the inventory page. Stores are fetched via `GET /api/store/personal` + `GET /api/store/household/{id}` per household, combined into a single query.

**Tech Stack:** React, TypeScript, TanStack Query, Jotai, Tailwind CSS v4, Vitest, Testing Library, lucide-react

---

## Task 1: Store Query Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts`
- Create: `frontend/src/apis/agdevx-cart-api/store/tests/use-stores.query.test.tsx`
- Reference: `frontend/src/apis/agdevx-cart-api/inventory/use-inventory.query.ts` (pattern)
- Reference: `frontend/src/apis/agdevx-cart-api/models/store.ts` (existing Store type)

**Step 1: Write the failing test**

```tsx
// frontend/src/apis/agdevx-cart-api/store/tests/use-stores.query.test.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Store } from '../../models/store'
import { useStoresQuery } from '../use-stores.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockPersonalStore: Store = {
  id: 'ps1',
  name: 'Corner Market',
  householdId: null,
  userId: 'user1',
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const mockHouseholdStore: Store = {
  id: 'hs1',
  name: 'Costco',
  householdId: 'h1',
  userId: null,
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

describe('useStoresQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches personal and household stores', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPersonalStore],
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockHouseholdStore],
      } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery(['h1']), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPersonalStore, mockHouseholdStore])
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/personal')
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/household/h1')
  })

  it('fetches only personal stores when no household IDs provided', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPersonalStore],
    } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPersonalStore])
    expect(apiFetchModule.apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/personal')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValueOnce({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Failed to fetch stores'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/use-stores.query.test.tsx`
Expected: FAIL — module `../use-stores.query` not found

**Step 3: Write minimal implementation**

```tsx
// frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts
// ABOUTME: Query hook for fetching all stores (personal + household)
// ABOUTME: Combines personal stores with household stores from all provided household IDs

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Store } from '../models/store'

export const useStoresQuery = (householdIds: string[]) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['stores', householdIds],
    queryFn: async (): Promise<Store[]> => {
      const responses = await Promise.all([
        apiFetch('/api/store/personal'),
        ...householdIds.map((id) => apiFetch(`/api/store/household/${id}`)),
      ])

      const allStores: Store[] = []
      for (const response of responses) {
        if (!response.ok) {
          throw new Error('Failed to fetch stores')
        }
        const stores: Store[] = await response.json()
        allStores.push(...stores)
      }
      return allStores
    },
    enabled: isAuthenticated,
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/use-stores.query.test.tsx`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts frontend/src/apis/agdevx-cart-api/store/tests/use-stores.query.test.tsx
git commit -m "feat: add store query hook with tests"
```

---

## Task 2: Create Store Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/store/create-store.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/store/tests/create-store.mutation.test.tsx`
- Reference: `frontend/src/apis/agdevx-cart-api/inventory/create-inventory-item.mutation.ts` (pattern)

**Step 1: Write the failing test**

```tsx
// frontend/src/apis/agdevx-cart-api/store/tests/create-store.mutation.test.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Store } from '../../models/store'
import { useCreateStoreMutation } from '../create-store.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useCreateStoreMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('creates a household store successfully', async () => {
    const mockStore: Store = {
      id: 'hs1',
      name: 'Costco',
      householdId: 'h1',
      userId: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockStore,
    } as unknown as Response)

    const { result } = renderHook(() => useCreateStoreMutation(), { wrapper })

    result.current.mutate({ name: 'Costco', householdId: 'h1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockStore)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store', {
      method: 'POST',
      body: JSON.stringify({ name: 'Costco', householdId: 'h1' }),
    })
  })

  it('creates a personal store successfully', async () => {
    const mockStore: Store = {
      id: 'ps1',
      name: 'Corner Market',
      householdId: null,
      userId: 'user1',
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockStore,
    } as unknown as Response)

    const { result } = renderHook(() => useCreateStoreMutation(), { wrapper })

    result.current.mutate({ name: 'Corner Market' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store', {
      method: 'POST',
      body: JSON.stringify({ name: 'Corner Market' }),
    })
  })

  it('invalidates stores query on success', async () => {
    const mockStore: Store = {
      id: 'ps1',
      name: 'Corner Market',
      householdId: null,
      userId: 'user1',
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockStore,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateStoreMutation(), { wrapper })

    result.current.mutate({ name: 'Corner Market' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['stores'],
    })
  })

  it('handles creation error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useCreateStoreMutation(), { wrapper })

    result.current.mutate({ name: 'Costco', householdId: 'h1' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Failed to create store'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/create-store.mutation.test.tsx`
Expected: FAIL — module `../create-store.mutation` not found

**Step 3: Write minimal implementation**

```tsx
// frontend/src/apis/agdevx-cart-api/store/create-store.mutation.ts
// ABOUTME: Mutation hook for creating stores
// ABOUTME: Creates household or personal store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Store } from '../models/store'

interface CreateStoreRequest {
  name: string
  householdId?: string | null
}

export const useCreateStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateStoreRequest): Promise<Store> => {
      const response = await apiFetch('/api/store', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        throw new Error('Failed to create store')
      }
      return response.json() as Promise<Store>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/create-store.mutation.test.tsx`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/create-store.mutation.ts frontend/src/apis/agdevx-cart-api/store/tests/create-store.mutation.test.tsx
git commit -m "feat: add create store mutation with tests"
```

---

## Task 3: Update Store Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/store/update-store.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/store/tests/update-store.mutation.test.tsx`
- Reference: `frontend/src/apis/agdevx-cart-api/inventory/update-inventory-item.mutation.ts` (pattern)

**Step 1: Write the failing test**

```tsx
// frontend/src/apis/agdevx-cart-api/store/tests/update-store.mutation.test.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useUpdateStoreMutation } from '../update-store.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUpdateStoreMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates a store successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateStoreMutation(), { wrapper })

    result.current.mutate({ id: 'store1', name: 'Costco Wholesale' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/store1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Costco Wholesale' }),
    })
  })

  it('invalidates stores query on success', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateStoreMutation(), { wrapper })

    result.current.mutate({ id: 'store1', name: 'Updated Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['stores'],
    })
  })

  it('handles update error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateStoreMutation(), { wrapper })

    result.current.mutate({ id: 'store1', name: 'Updated' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Failed to update store'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/update-store.mutation.test.tsx`
Expected: FAIL — module `../update-store.mutation` not found

**Step 3: Write minimal implementation**

```tsx
// frontend/src/apis/agdevx-cart-api/store/update-store.mutation.ts
// ABOUTME: Mutation hook for updating store name
// ABOUTME: Updates store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateStoreRequest {
  id: string
  name: string
}

export const useUpdateStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateStoreRequest): Promise<void> => {
      const { id, ...updateData } = request
      const response = await apiFetch(`/api/store/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        throw new Error('Failed to update store')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/update-store.mutation.test.tsx`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/update-store.mutation.ts frontend/src/apis/agdevx-cart-api/store/tests/update-store.mutation.test.tsx
git commit -m "feat: add update store mutation with tests"
```

---

## Task 4: Delete Store Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/store/delete-store.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/store/tests/delete-store.mutation.test.tsx`
- Reference: `frontend/src/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation.ts` (pattern)

**Step 1: Write the failing test**

```tsx
// frontend/src/apis/agdevx-cart-api/store/tests/delete-store.mutation.test.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useDeleteStoreMutation } from '../delete-store.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useDeleteStoreMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('deletes a store successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteStoreMutation(), { wrapper })

    result.current.mutate('store1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/store1', {
      method: 'DELETE',
    })
  })

  it('invalidates stores query on success', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteStoreMutation(), { wrapper })

    result.current.mutate('store1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['stores'],
    })
  })

  it('handles delete error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteStoreMutation(), { wrapper })

    result.current.mutate('store1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Failed to delete store'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/delete-store.mutation.test.tsx`
Expected: FAIL — module `../delete-store.mutation` not found

**Step 3: Write minimal implementation**

```tsx
// frontend/src/apis/agdevx-cart-api/store/delete-store.mutation.ts
// ABOUTME: Mutation hook for deleting stores
// ABOUTME: Deletes store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiFetch(`/api/store/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete store')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/store/tests/delete-store.mutation.test.tsx`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/delete-store.mutation.ts frontend/src/apis/agdevx-cart-api/store/tests/delete-store.mutation.test.tsx
git commit -m "feat: add delete store mutation with tests"
```

---

## Task 5: Add Segmented Control to Inventory Page

Adds an Items/Stores toggle to the inventory page. When "Stores" is selected, renders a placeholder (the full stores view is built in Task 6).

**Files:**
- Modify: `frontend/src/pages/inventory-page.tsx`
- Create: `frontend/src/pages/tests/inventory-page.test.tsx`

**Step 1: Write the failing test**

```tsx
// frontend/src/pages/tests/inventory-page.test.tsx
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as deleteInventoryModule from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryPage } from '../inventory-page'

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InventoryPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('InventoryPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders segmented control with Items and Stores tabs', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    expect(screen.getByRole('button', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stores' })).toBeInTheDocument()
  })

  it('shows items view by default', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    //== Items tab should be active (teal background)
    const itemsButton = screen.getByRole('button', { name: 'Items' })
    expect(itemsButton.className).toContain('bg-teal')
  })

  it('switches to stores view when Stores tab is clicked', () => {
    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Stores' }))

    //== Stores tab should now be active
    const storesButton = screen.getByRole('button', { name: 'Stores' })
    expect(storesButton.className).toContain('bg-teal')

    //== Items tab should be inactive
    const itemsButton = screen.getByRole('button', { name: 'Items' })
    expect(itemsButton.className).not.toContain('bg-teal')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-page.test.tsx`
Expected: FAIL — no "Items" or "Stores" buttons found (segmented control doesn't exist yet)

**Step 3: Modify inventory page to add segmented control**

Modify `frontend/src/pages/inventory-page.tsx`:
- Add `useState<'items' | 'stores'>('items')` for the active tab
- Add a segmented control below the page title
- Wrap the existing items content in a conditional (`activeTab === 'items'`)
- Add a placeholder for the stores view (`activeTab === 'stores'`)

The segmented control uses the app's design tokens:
- Active tab: `bg-teal text-white` with `rounded-lg`
- Inactive tab: `text-text-secondary`
- Container: `bg-bg-warm rounded-xl p-1` (pill-shaped track)

```tsx
// Full updated inventory-page.tsx
// ABOUTME: Inventory management page with Items/Stores segmented control
// ABOUTME: Displays household and personal inventory items with add/delete actions

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'

type InventoryTab = 'items' | 'stores'

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const { data: inventory, isLoading } = useInventoryQuery()
  const deleteMutation = useDeleteInventoryItemMutation()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading inventory...</p>
      </div>
    )
  }

  const householdItems = inventory?.filter((item) => item.householdId !== null) || []
  const personalItems = inventory?.filter((item) => item.ownerUserId !== null) || []

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Pantry</span>
        </h1>
        {activeTab === 'items' && (
          <Link
            to="/inventory/add"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        )}
      </div>

      {/* Segmented Control */}
      <div className="flex bg-bg-warm rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'items'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Items
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'stores'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Stores
        </button>
      </div>

      {/* Items View */}
      {activeTab === 'items' && (
        <>
          {householdItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Household Items</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {householdItems.map((item) => (
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
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-coral hover:text-coral/80 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {personalItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Personal Items</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {personalItems.map((item) => (
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
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-coral hover:text-coral/80 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inventory && inventory.length === 0 && (
            <p className="text-text-secondary mt-4">No inventory items yet. Add your first item!</p>
          )}
        </>
      )}

      {/* Stores View */}
      {activeTab === 'stores' && (
        <p className="text-text-secondary">Stores view coming soon.</p>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-page.test.tsx`
Expected: PASS (3 tests)

**Step 5: Run existing tests to verify no regressions**

Run: `cd frontend && npx vitest run`
Expected: All existing tests pass

**Step 6: Commit**

```bash
git add frontend/src/pages/inventory-page.tsx frontend/src/pages/tests/inventory-page.test.tsx
git commit -m "feat: add Items/Stores segmented control to inventory page"
```

---

## Task 6: Build Stores View Component

Creates the stores view component that displays household and personal stores in sections with full CRUD capabilities: inline create form, in-place name editing, and delete with confirmation modal.

**Files:**
- Create: `frontend/src/pages/inventory-stores-view.tsx`
- Create: `frontend/src/pages/tests/inventory-stores-view.test.tsx`
- Modify: `frontend/src/pages/inventory-page.tsx` (import and render the stores view)

**Step 1: Write the failing tests**

```tsx
// frontend/src/pages/tests/inventory-stores-view.test.tsx
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import * as createStoreModule from '@/apis/agdevx-cart-api/store/create-store.mutation'
import * as deleteStoreModule from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import * as updateStoreModule from '@/apis/agdevx-cart-api/store/update-store.mutation'
import * as storesQueryModule from '@/apis/agdevx-cart-api/store/use-stores.query'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryStoresView } from '../inventory-stores-view'

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockStores: Store[] = [
  { id: 'hs1', name: 'Costco', householdId: 'h1', userId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'hs2', name: 'Trader Joes', householdId: 'h1', userId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'ps1', name: 'Corner Market', householdId: null, userId: 'user1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockCreateMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
} as unknown as UseMutationResult<Store, Error, { name: string; householdId?: string | null }>

const mockUpdateMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
} as unknown as UseMutationResult<void, Error, { id: string; name: string }>

const mockDeleteMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
} as unknown as UseMutationResult<void, Error, string>

const setupMocks = (stores: Store[] = mockStores, households: Household[] = mockHouseholds) => {
  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: households,
    isLoading: false,
  } as UseQueryResult<Household[]>)

  vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
    data: stores,
    isLoading: false,
  } as UseQueryResult<Store[]>)

  vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue(mockCreateMutation)
  vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue(mockUpdateMutation)
  vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue(mockDeleteMutation)
}

const renderView = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InventoryStoresView />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('InventoryStoresView', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<Household[]>)

    vi.spyOn(storesQueryModule, 'useStoresQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<Store[]>)

    vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue(mockCreateMutation)
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue(mockUpdateMutation)
    vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue(mockDeleteMutation)

    renderView()

    expect(screen.getByText('Loading stores...')).toBeInTheDocument()
  })

  it('renders household and personal store sections', () => {
    setupMocks()
    renderView()

    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    expect(screen.getByText('Costco')).toBeInTheDocument()
    expect(screen.getByText('Trader Joes')).toBeInTheDocument()
    expect(screen.getByText('Personal Stores')).toBeInTheDocument()
    expect(screen.getByText('Corner Market')).toBeInTheDocument()
  })

  it('renders empty state when no stores exist', () => {
    setupMocks([], mockHouseholds)
    renderView()

    expect(screen.getByText('No stores yet. Add your first store!')).toBeInTheDocument()
  })

  it('shows create form when Add Store button is clicked', () => {
    setupMocks()
    renderView()

    fireEvent.click(screen.getByText('Add Store'))

    expect(screen.getByLabelText('Store Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Scope')).toBeInTheDocument()
  })

  it('creates a store via the inline form', async () => {
    const mutateAsyncFn = vi.fn().mockResolvedValue({})
    vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<Store, Error, { name: string; householdId?: string | null }>)

    setupMocks()
    //== Re-mock create after setupMocks
    vi.spyOn(createStoreModule, 'useCreateStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<Store, Error, { name: string; householdId?: string | null }>)

    renderView()

    fireEvent.click(screen.getByText('Add Store'))

    fireEvent.change(screen.getByLabelText('Store Name'), {
      target: { value: 'Whole Foods' },
    })

    fireEvent.submit(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mutateAsyncFn).toHaveBeenCalledWith({
        name: 'Whole Foods',
        householdId: null,
      })
    })
  })

  it('enables in-place editing when edit icon is clicked', () => {
    setupMocks()
    renderView()

    //== Click the first edit button (Costco)
    const editButtons = screen.getAllByLabelText('Edit store name')
    fireEvent.click(editButtons[0])

    const input = screen.getByDisplayValue('Costco')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('saves edited name on Enter', async () => {
    const mutateAsyncFn = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string }>)

    setupMocks()
    vi.spyOn(updateStoreModule, 'useUpdateStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, { id: string; name: string }>)

    renderView()

    const editButtons = screen.getAllByLabelText('Edit store name')
    fireEvent.click(editButtons[0])

    const input = screen.getByDisplayValue('Costco')
    fireEvent.change(input, { target: { value: 'Costco Wholesale' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mutateAsyncFn).toHaveBeenCalledWith({ id: 'hs1', name: 'Costco Wholesale' })
    })
  })

  it('cancels editing on Escape', () => {
    setupMocks()
    renderView()

    const editButtons = screen.getAllByLabelText('Edit store name')
    fireEvent.click(editButtons[0])

    const input = screen.getByDisplayValue('Costco')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    //== Should revert to display mode showing original name
    expect(screen.getByText('Costco')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Changed')).not.toBeInTheDocument()
  })

  it('shows delete confirmation modal', () => {
    setupMocks()
    renderView()

    const deleteButtons = screen.getAllByLabelText('Delete store')
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText('Delete Store')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Costco"/)).toBeInTheDocument()
  })

  it('deletes a store after confirmation', async () => {
    const mutateAsyncFn = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    setupMocks()
    vi.spyOn(deleteStoreModule, 'useDeleteStoreMutation').mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    } as unknown as UseMutationResult<void, Error, string>)

    renderView()

    const deleteButtons = screen.getAllByLabelText('Delete store')
    fireEvent.click(deleteButtons[0])

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(mutateAsyncFn).toHaveBeenCalledWith('hs1')
    })
  })

  it('cancels delete when Cancel is clicked', () => {
    setupMocks()
    renderView()

    const deleteButtons = screen.getAllByLabelText('Delete store')
    fireEvent.click(deleteButtons[0])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    //== Modal should close
    expect(screen.queryByText('Delete Store')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-stores-view.test.tsx`
Expected: FAIL — module `../inventory-stores-view` not found

**Step 3: Write the stores view component**

```tsx
// frontend/src/pages/inventory-stores-view.tsx
// ABOUTME: Store management view displayed within the inventory page
// ABOUTME: Provides CRUD for household and personal stores with inline create, in-place edit, and delete confirmation

import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Store } from '@/apis/agdevx-cart-api/models/store'
import { useCreateStoreMutation } from '@/apis/agdevx-cart-api/store/create-store.mutation'
import { useDeleteStoreMutation } from '@/apis/agdevx-cart-api/store/delete-store.mutation'
import { useUpdateStoreMutation } from '@/apis/agdevx-cart-api/store/update-store.mutation'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'

export const InventoryStoresView = () => {
  const { data: households, isLoading: householdsLoading } = useHouseholdsQuery()
  const householdIds = households?.map((h) => h.id) ?? []
  const { data: stores, isLoading: storesLoading } = useStoresQuery(householdIds)
  const createMutation = useCreateStoreMutation()
  const updateMutation = useUpdateStoreMutation()
  const deleteMutation = useDeleteStoreMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeScope, setStoreScope] = useState<string>('personal')
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Store | null>(null)

  if (householdsLoading || storesLoading) {
    return <p className="text-text-secondary">Loading stores...</p>
  }

  const householdStoreGroups = (households ?? [])
    .map((household) => ({
      household,
      stores: (stores ?? []).filter((s) => s.householdId === household.id),
    }))
    .filter((group) => group.stores.length > 0)

  const personalStores = (stores ?? []).filter((s) => s.userId !== null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) return

    try {
      await createMutation.mutateAsync({
        name: storeName.trim(),
        householdId: storeScope === 'personal' ? null : storeScope,
      })
      setStoreName('')
      setShowCreateForm(false)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleStartEdit = (store: Store) => {
    setEditingStoreId(store.id)
    setEditingName(store.name)
  }

  const handleSaveEdit = async () => {
    if (!editingStoreId || !editingName.trim()) return

    try {
      await updateMutation.mutateAsync({ id: editingStoreId, name: editingName.trim() })
    } catch {
      // Error handled by mutation state
    }
    setEditingStoreId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingStoreId(null)
    setEditingName('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id)
    } catch {
      // Error handled by mutation state
    }
    setDeleteConfirm(null)
  }

  const renderStoreRow = (store: Store) => {
    const isEditing = editingStoreId === store.id

    return (
      <div
        key={store.id}
        className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-center"
      >
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 mr-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="flex-1 px-3 py-1.5 border border-navy/10 rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="text-teal hover:text-teal-light"
              aria-label="Save store name"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-navy">{store.name}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartEdit(store)}
                className="text-text-tertiary hover:text-teal transition-colors"
                aria-label="Edit store name"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirm(store)}
                className="text-text-tertiary hover:text-coral transition-colors"
                aria-label="Delete store"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  const hasStores = (stores ?? []).length > 0

  return (
    <>
      {/* Add Store Button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-2"
      >
        <Plus className="w-5 h-5" />
        {showCreateForm ? 'Cancel' : 'Add Store'}
      </button>

      {/* Inline Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
          <div className="mb-3">
            <label htmlFor="storeName" className="block text-sm font-semibold text-navy-soft mb-1">
              Store Name
            </label>
            <input
              id="storeName"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g., Costco"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="storeScope" className="block text-sm font-semibold text-navy-soft mb-1">
              Scope
            </label>
            <select
              id="storeScope"
              value={storeScope}
              onChange={(e) => setStoreScope(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            >
              <option value="personal">Personal</option>
              {households?.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !storeName.trim()}
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {/* Household Store Sections */}
      {householdStoreGroups.map(({ household, stores: groupStores }) => (
        <div key={household.id} className="mb-6">
          <div className="flex items-center gap-2.5 mt-4 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
              {household.name}
            </span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-2">
            {groupStores.map(renderStoreRow)}
          </div>
        </div>
      ))}

      {/* Personal Stores Section */}
      {personalStores.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-4 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
              Personal Stores
            </span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-2">
            {personalStores.map(renderStoreRow)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasStores && (
        <p className="text-text-secondary mt-4">No stores yet. Add your first store!</p>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="font-display text-lg font-bold text-navy mb-2">Delete Store</h3>
            <p className="text-text-secondary mb-5">
              Are you sure you want to delete &quot;{deleteConfirm.name}&quot;?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 4: Update inventory page to render the stores view**

In `frontend/src/pages/inventory-page.tsx`, replace the stores placeholder:

Replace:
```tsx
      {/* Stores View */}
      {activeTab === 'stores' && (
        <p className="text-text-secondary">Stores view coming soon.</p>
      )}
```

With:
```tsx
      {/* Stores View */}
      {activeTab === 'stores' && <InventoryStoresView />}
```

Add the import at the top:
```tsx
import { InventoryStoresView } from '@/pages/inventory-stores-view'
```

**Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-stores-view.test.tsx`
Expected: PASS (10 tests)

**Step 6: Run all tests to check for regressions**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

**Step 7: Commit**

```bash
git add frontend/src/pages/inventory-stores-view.tsx frontend/src/pages/tests/inventory-stores-view.test.tsx frontend/src/pages/inventory-page.tsx
git commit -m "feat: add store management view with CRUD to inventory page"
```

---

## Task 7: Final Verification

**Step 1: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

**Step 2: Run TypeScript type check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No type errors

**Step 3: Run linting**

Run: `cd frontend && npx eslint src/`
Expected: No lint errors (or only pre-existing ones)

**Step 4: Manual smoke test (if dev server available)**

Run: `cd frontend && npx vite --host` (if backend is running)
Navigate to `/inventory`, verify:
- Segmented control appears with Items/Stores
- Items view works as before
- Stores view loads and displays stores
- Create, edit, and delete work

**Step 5: Commit if any fixes were needed**

If any fixes were made during verification, commit them:
```bash
git add -A
git commit -m "fix: address issues found during store management verification"
```
