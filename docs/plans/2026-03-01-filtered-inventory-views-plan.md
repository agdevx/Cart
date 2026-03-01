# Filtered Inventory Views Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a filter dropdown to the Inventory page's Items tab so users can scope the view to personal items, a specific household, merged (household + personal), or all items grouped by household.

**Architecture:** Three new TanStack Query hooks call the existing backend endpoints (`/api/inventory/personal`, `/api/inventory/household/{id}`, `/api/inventory/merged/{id}`). A new `InventoryItemsView` component (mirroring `InventoryStoresView`) owns the filter state and delegates to the appropriate hook. The "All Items" view groups items by household name instead of lumping them together.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest, React Testing Library

---

### Task 1: usePersonalInventoryQuery Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/inventory/use-personal-inventory.query.ts`
- Test: `frontend/src/apis/agdevx-cart-api/inventory/tests/use-personal-inventory.query.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/apis/agdevx-cart-api/inventory/tests/use-personal-inventory.query.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { InventoryItem } from '../../models/inventory-item'
import { usePersonalInventoryQuery } from '../use-personal-inventory.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('usePersonalInventoryQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches personal inventory items successfully', async () => {
    const mockItems: InventoryItem[] = [
      {
        id: '1',
        name: 'My Snacks',
        defaultStoreId: null,
        notes: null,
        ownerUserId: 'user1',
        householdId: null,
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
    ]

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response)

    const { result } = renderHook(() => usePersonalInventoryQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockItems)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory/personal')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => usePersonalInventoryQuery(), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => usePersonalInventoryQuery(), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-personal-inventory.query.test.tsx`

Expected: FAIL — `use-personal-inventory.query` module not found

**Step 3: Write minimal implementation**

Create `frontend/src/apis/agdevx-cart-api/inventory/use-personal-inventory.query.ts`:

```ts
// ABOUTME: Query hook for fetching personal-only inventory items
// ABOUTME: Calls GET /api/inventory/personal, returns items owned by the current user

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const usePersonalInventoryQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'personal'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch('/api/inventory/personal');
      if (!response.ok) {
        throw new Error('Failed to fetch personal inventory');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-personal-inventory.query.test.tsx`

Expected: PASS — 3 tests pass

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/inventory/use-personal-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/tests/use-personal-inventory.query.test.tsx
git commit -m "feat: add usePersonalInventoryQuery hook with tests"
```

---

### Task 2: useHouseholdInventoryQuery Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts`
- Test: `frontend/src/apis/agdevx-cart-api/inventory/tests/use-household-inventory.query.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/apis/agdevx-cart-api/inventory/tests/use-household-inventory.query.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { InventoryItem } from '../../models/inventory-item'
import { useHouseholdInventoryQuery } from '../use-household-inventory.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useHouseholdInventoryQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches household inventory items successfully', async () => {
    const mockItems: InventoryItem[] = [
      {
        id: '1',
        name: 'Milk',
        defaultStoreId: 'store1',
        notes: 'Organic',
        ownerUserId: null,
        householdId: 'h1',
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
    ]

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response)

    const { result } = renderHook(() => useHouseholdInventoryQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockItems)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory/household/h1')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useHouseholdInventoryQuery('h1'), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('does not fetch when householdId is null', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useHouseholdInventoryQuery(null), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useHouseholdInventoryQuery('h1'), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-household-inventory.query.test.tsx`

Expected: FAIL — `use-household-inventory.query` module not found

**Step 3: Write minimal implementation**

Create `frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts`:

```ts
// ABOUTME: Query hook for fetching a single household's inventory items
// ABOUTME: Calls GET /api/inventory/household/{id}, returns items belonging to that household

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const useHouseholdInventoryQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'household', householdId],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch(`/api/inventory/household/${householdId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch household inventory');
      }
      return response.json();
    },
    enabled: isAuthenticated && householdId !== null,
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-household-inventory.query.test.tsx`

Expected: PASS — 4 tests pass

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/tests/use-household-inventory.query.test.tsx
git commit -m "feat: add useHouseholdInventoryQuery hook with tests"
```

---

### Task 3: useMergedInventoryQuery Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts`
- Test: `frontend/src/apis/agdevx-cart-api/inventory/tests/use-merged-inventory.query.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/apis/agdevx-cart-api/inventory/tests/use-merged-inventory.query.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { InventoryItem } from '../../models/inventory-item'
import { useMergedInventoryQuery } from '../use-merged-inventory.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useMergedInventoryQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches merged inventory items successfully', async () => {
    const mockItems: InventoryItem[] = [
      {
        id: '1',
        name: 'Milk',
        defaultStoreId: null,
        notes: null,
        ownerUserId: null,
        householdId: 'h1',
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
      {
        id: '2',
        name: 'My Snacks',
        defaultStoreId: null,
        notes: null,
        ownerUserId: 'user1',
        householdId: null,
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
    ]

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response)

    const { result } = renderHook(() => useMergedInventoryQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockItems)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory/merged/h1')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useMergedInventoryQuery('h1'), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('does not fetch when householdId is null', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useMergedInventoryQuery(null), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useMergedInventoryQuery('h1'), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-merged-inventory.query.test.tsx`

Expected: FAIL — `use-merged-inventory.query` module not found

**Step 3: Write minimal implementation**

Create `frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts`:

```ts
// ABOUTME: Query hook for fetching merged inventory (household + personal items)
// ABOUTME: Calls GET /api/inventory/merged/{id}, returns household items combined with user's personal items

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const useMergedInventoryQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'merged', householdId],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch(`/api/inventory/merged/${householdId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch merged inventory');
      }
      return response.json();
    },
    enabled: isAuthenticated && householdId !== null,
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/inventory/tests/use-merged-inventory.query.test.tsx`

Expected: PASS — 4 tests pass

**Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/tests/use-merged-inventory.query.test.tsx
git commit -m "feat: add useMergedInventoryQuery hook with tests"
```

---

### Task 4: InventoryItemsView Component

**Files:**
- Create: `frontend/src/pages/inventory-items-view.tsx`
- Test: `frontend/src/pages/tests/inventory-items-view.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/pages/tests/inventory-items-view.test.tsx`:

```tsx
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as deleteInventoryModule from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import * as householdInventoryModule from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import * as inventoryQueryModule from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import * as mergedInventoryModule from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import * as personalInventoryModule from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryItemsView } from '../inventory-items-view'

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'h2', name: 'Book Club', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockAllItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '2', name: 'Bread', defaultStoreId: null, notes: null, ownerUserId: null, householdId: 'h2', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockPersonalItems: InventoryItem[] = [
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockHouseholdItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const mockMergedItems: InventoryItem[] = [
  { id: '1', name: 'Milk', defaultStoreId: null, notes: 'Organic', ownerUserId: null, householdId: 'h1', createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: '3', name: 'My Snacks', defaultStoreId: null, notes: null, ownerUserId: 'user1', householdId: null, createdBy: 'user1', createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

const renderView = (filter = 'all') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InventoryItemsView filter={filter} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const setupDefaultMocks = () => {
  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: mockHouseholds,
    isLoading: false,
  } as UseQueryResult<Household[]>)

  vi.spyOn(deleteInventoryModule, 'useDeleteInventoryItemMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, string>)
}

describe('InventoryItemsView', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders items grouped by household in "all" filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: mockAllItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('all')

    //== Per-household section headers
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    expect(screen.getByText('Book Club')).toBeInTheDocument()
    expect(screen.getByText('Personal Items')).toBeInTheDocument()

    //== Items
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('My Snacks')).toBeInTheDocument()
  })

  it('renders only personal items with personal filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: mockPersonalItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    expect(screen.getByText('My Snacks')).toBeInTheDocument()
    expect(screen.queryByText('Milk')).not.toBeInTheDocument()
    expect(screen.queryByText('Smith Family')).not.toBeInTheDocument()
  })

  it('renders only household items with household filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: mockHouseholdItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('household:h1')

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.queryByText('My Snacks')).not.toBeInTheDocument()
  })

  it('renders merged items with merged filter', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: mockMergedItems,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('merged:h1')

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('My Snacks')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  it('shows empty state when no items match', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: [],
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('personal')

    expect(screen.getByText('No inventory items yet. Add your first item!')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    setupDefaultMocks()

    vi.spyOn(inventoryQueryModule, 'useInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(personalInventoryModule, 'usePersonalInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(householdInventoryModule, 'useHouseholdInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    vi.spyOn(mergedInventoryModule, 'useMergedInventoryQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as UseQueryResult<InventoryItem[]>)

    renderView('all')

    expect(screen.getByText('Loading inventory...')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-items-view.test.tsx`

Expected: FAIL — `inventory-items-view` module not found

**Step 3: Write minimal implementation**

Create `frontend/src/pages/inventory-items-view.tsx`:

```tsx
// ABOUTME: Inventory items view with filter support for all, personal, household, and merged views
// ABOUTME: Groups items by household in "all" view, flat list for scoped filters

import { useMemo } from 'react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useHouseholdInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-household-inventory.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useMergedInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-merged-inventory.query'
import { usePersonalInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-personal-inventory.query'
import type { InventoryItem } from '@/apis/agdevx-cart-api/models/inventory-item'

interface InventoryItemsViewProps {
  filter: string
}

const parseFilter = (filter: string): { type: string; id: string | null } => {
  if (filter === 'all' || filter === 'personal') {
    return { type: filter, id: null }
  }
  const [type, id] = filter.split(':')
  return { type, id }
}

export const InventoryItemsView = ({ filter }: InventoryItemsViewProps) => {
  const { type: filterType, id: filterId } = parseFilter(filter)
  const { data: households } = useHouseholdsQuery()
  const deleteMutation = useDeleteInventoryItemMutation()

  const allQuery = useInventoryQuery()
  const personalQuery = usePersonalInventoryQuery()
  const householdQuery = useHouseholdInventoryQuery(filterType === 'household' ? filterId : null)
  const mergedQuery = useMergedInventoryQuery(filterType === 'merged' ? filterId : null)

  const activeQuery = useMemo(() => {
    switch (filterType) {
      case 'personal':
        return personalQuery
      case 'household':
        return householdQuery
      case 'merged':
        return mergedQuery
      default:
        return allQuery
    }
  }, [filterType, allQuery, personalQuery, householdQuery, mergedQuery])

  const items = activeQuery.data
  const isLoading = activeQuery.isLoading

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) {
    return <p className="text-text-secondary">Loading inventory...</p>
  }

  if (!items || items.length === 0) {
    return <p className="text-text-secondary mt-4">No inventory items yet. Add your first item!</p>
  }

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
      <button
        onClick={() => handleDelete(item.id)}
        disabled={deleteMutation.isPending}
        className="text-coral hover:text-coral/80 text-sm font-semibold"
      >
        Delete
      </button>
    </div>
  )

  //== For "all" filter, group by household sections
  if (filterType === 'all') {
    const householdItemsMap = new Map<string, InventoryItem[]>()
    for (const household of households || []) {
      householdItemsMap.set(
        household.id,
        items.filter((item) => item.householdId === household.id)
      )
    }
    const personalItems = items.filter((item) => item.ownerUserId !== null)

    return (
      <>
        {(households || []).map((household) => {
          const householdItems = householdItemsMap.get(household.id) || []
          if (householdItems.length === 0) return null
          return (
            <div key={household.id} className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">{household.name}</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {householdItems.map(renderItem)}
              </div>
            </div>
          )
        })}

        {personalItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Personal Items</span>
              <span className="flex-1 h-px bg-navy/8" />
            </div>
            <div className="space-y-2">
              {personalItems.map(renderItem)}
            </div>
          </div>
        )}
      </>
    )
  }

  //== For scoped filters, render a flat list
  return (
    <div className="space-y-2">
      {items.map(renderItem)}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-items-view.test.tsx`

Expected: PASS — 6 tests pass

**Step 5: Commit**

```bash
git add frontend/src/pages/inventory-items-view.tsx frontend/src/pages/tests/inventory-items-view.test.tsx
git commit -m "feat: add InventoryItemsView component with filter support and tests"
```

---

### Task 5: Wire Up InventoryPage with Filter Dropdown

**Files:**
- Modify: `frontend/src/pages/inventory-page.tsx`
- Modify: `frontend/src/pages/tests/inventory-page.test.tsx`

**Step 1: Update the InventoryPage test**

Replace `frontend/src/pages/tests/inventory-page.test.tsx` with:

```tsx
import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { InventoryPage } from '../inventory-page'

//== Mock InventoryItemsView so we can inspect its props without setting up all inventory hooks
vi.mock('../inventory-items-view', () => ({
  InventoryItemsView: ({ filter }: { filter: string }) => (
    <div data-testid="inventory-items-view" data-filter={filter}>
      Items view with filter: {filter}
    </div>
  ),
}))

//== Mock InventoryStoresView
vi.mock('../inventory-stores-view', () => ({
  InventoryStoresView: () => <div data-testid="inventory-stores-view">Stores view</div>,
}))

const mockHouseholds: Household[] = [
  { id: 'h1', name: 'Smith Family', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
  { id: 'h2', name: 'Book Club', createdBy: null, createdDate: '2024-01-01', modifiedBy: null, modifiedDate: null },
]

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

    vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    } as UseQueryResult<Household[]>)
  })

  it('renders segmented control with Items and Stores tabs', () => {
    renderPage()

    expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Stores' })).toBeInTheDocument()
  })

  it('shows items view by default with filter dropdown', () => {
    renderPage()

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).toContain('bg-teal')

    expect(screen.getByTestId('inventory-items-view')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter inventory')).toBeInTheDocument()
  })

  it('renders filter dropdown with correct options', () => {
    renderPage()

    const select = screen.getByLabelText('Filter inventory')
    const options = select.querySelectorAll('option')

    expect(options).toHaveLength(7)
    expect(options[0]).toHaveTextContent('All Items')
    expect(options[1]).toHaveTextContent('Personal')
    expect(options[2]).toHaveTextContent('Smith Family')
    expect(options[3]).toHaveTextContent('Smith Family + Personal')
    expect(options[4]).toHaveTextContent('Book Club')
    expect(options[5]).toHaveTextContent('Book Club + Personal')
  })

  it('passes filter value to InventoryItemsView', () => {
    renderPage()

    const view = screen.getByTestId('inventory-items-view')
    expect(view).toHaveAttribute('data-filter', 'all')
  })

  it('updates filter when dropdown changes', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Filter inventory'), {
      target: { value: 'personal' },
    })

    const view = screen.getByTestId('inventory-items-view')
    expect(view).toHaveAttribute('data-filter', 'personal')
  })

  it('hides filter dropdown when Stores tab is active', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    expect(screen.queryByLabelText('Filter inventory')).not.toBeInTheDocument()
    expect(screen.getByTestId('inventory-stores-view')).toBeInTheDocument()
  })

  it('switches to stores view when Stores tab is clicked', () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Stores' }))

    const storesButton = screen.getByRole('tab', { name: 'Stores' })
    expect(storesButton.className).toContain('bg-teal')

    const itemsButton = screen.getByRole('tab', { name: 'Items' })
    expect(itemsButton.className).not.toContain('bg-teal')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-page.test.tsx`

Expected: FAIL — tests fail because InventoryPage doesn't have filter dropdown or use InventoryItemsView yet

**Step 3: Update InventoryPage implementation**

Replace `frontend/src/pages/inventory-page.tsx` with:

```tsx
// ABOUTME: Inventory management page with Items/Stores segmented control and filter dropdown
// ABOUTME: Items tab supports filtering by all, personal, household, or merged views

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Plus } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { InventoryItemsView } from '@/pages/inventory-items-view'
import { InventoryStoresView } from '@/pages/inventory-stores-view'

type InventoryTab = 'items' | 'stores'

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const [filter, setFilter] = useState('all')
  const { data: households } = useHouseholdsQuery()

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
      <div role="tablist" className="flex bg-bg-warm rounded-xl p-1 mb-4">
        <button
          role="tab"
          aria-selected={activeTab === 'items'}
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
          role="tab"
          aria-selected={activeTab === 'stores'}
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

      {/* Filter Dropdown — Items tab only */}
      {activeTab === 'items' && (
        <select
          aria-label="Filter inventory"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent mb-4"
        >
          <option value="all">All Items</option>
          <option value="personal">Personal</option>
          {(households || []).map((household) => (
            <optgroup key={household.id} label={household.name}>
              <option value={`household:${household.id}`}>{household.name}</option>
              <option value={`merged:${household.id}`}>{household.name} + Personal</option>
            </optgroup>
          ))}
        </select>
      )}

      {/* Items View */}
      {activeTab === 'items' && <InventoryItemsView filter={filter} />}

      {/* Stores View */}
      {activeTab === 'stores' && <InventoryStoresView />}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/tests/inventory-page.test.tsx`

Expected: PASS — 7 tests pass

**Step 5: Run the full test suite to check for regressions**

Run: `cd frontend && npx vitest run`

Expected: All tests pass

**Step 6: Commit**

```bash
git add frontend/src/pages/inventory-page.tsx frontend/src/pages/tests/inventory-page.test.tsx
git commit -m "feat: wire up InventoryPage with filter dropdown and InventoryItemsView"
```

---

### Task 6: Verify TypeScript and Full Test Suite

**Step 1: Run TypeScript compilation check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`

Expected: No errors

**Step 2: Run all frontend tests**

Run: `cd frontend && npx vitest run`

Expected: All tests pass (previous tests + new tests)

**Step 3: Commit any fixes if needed**

If TypeScript or tests revealed issues, fix and commit:

```bash
git add -A
git commit -m "fix: resolve type errors from filtered inventory views"
```
