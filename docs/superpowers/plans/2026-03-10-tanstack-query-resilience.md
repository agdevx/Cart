# TanStack Query Resilience Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the frontend's TanStack Query layer with typed errors, global error handlers, optimistic updates, and query-level tuning.

**Architecture:** Centralize HTTP error handling in `apiFetch` via a typed `ApiError` class. Wire global `QueryCache`/`MutationCache` callbacks for 401 redirect and mutation error toasts (Sonner). Add optimistic updates for the check/uncheck interaction. Tune per-query options (`keepPreviousData`, `refetchOnWindowFocus`, `gcTime`). Add `mutationKey` to all mutations.

**Tech Stack:** TanStack Query v5, React Router DOM v6, Jotai, Sonner, Vitest

**Spec:** `docs/superpowers/specs/2026-03-10-tanstack-query-resilience-design.md`

---

## Chunk 1: Foundation — ApiError, apiFetch, Sonner

### Task 1: Create ApiError class

**Files:**
- Create: `frontend/src/apis/api-error.ts`
- Create: `frontend/src/apis/api-error.test.ts`

- [ ] **Step 1: Write failing tests for ApiError**

```typescript
// frontend/src/apis/api-error.test.ts
import { describe, expect, it } from 'vitest'

import { ApiError } from './api-error'

describe('ApiError', () => {
  it('should construct with status, statusText, and body', () => {
    const error = new ApiError(404, 'Not Found', { message: 'Resource not found' })

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.status).toBe(404)
    expect(error.statusText).toBe('Not Found')
    expect(error.body).toEqual({ message: 'Resource not found' })
    expect(error.message).toBe('API error 404: Not Found')
  })

  it('should handle null body', () => {
    const error = new ApiError(500, 'Internal Server Error', null)
    expect(error.body).toBeNull()
  })

  describe('convenience getters', () => {
    it.each([
      [400, 'isValidationError'],
      [401, 'isUnauthorized'],
      [403, 'isForbidden'],
      [404, 'isNotFound'],
      [409, 'isConflict'],
    ] as const)('status %d → %s should be true', (status, getter) => {
      const error = new ApiError(status, 'test', null)
      expect(error[getter]).toBe(true)
    })

    it('non-matching status returns false for all convenience getters', () => {
      const error = new ApiError(500, 'test', null)
      expect(error.isValidationError).toBe(false)
      expect(error.isUnauthorized).toBe(false)
      expect(error.isForbidden).toBe(false)
      expect(error.isNotFound).toBe(false)
      expect(error.isConflict).toBe(false)
    })
  })

  describe('isRetryable', () => {
    it.each([400, 401, 403, 404, 409, 422, 429])(
      'status %d should NOT be retryable',
      (status) => {
        const error = new ApiError(status, 'test', null)
        expect(error.isRetryable).toBe(false)
      }
    )

    it.each([500, 502, 503])(
      'status %d should be retryable',
      (status) => {
        const error = new ApiError(status, 'test', null)
        expect(error.isRetryable).toBe(true)
      }
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/apis/api-error.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ApiError class**

```typescript
// frontend/src/apis/api-error.ts
// ABOUTME: Typed API error class with HTTP status information
// ABOUTME: Enables smart retry logic and structured error handling across the app

export class ApiError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly body: unknown

  constructor(status: number, statusText: string, body: unknown) {
    super(`API error ${status}: ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }

  get isUnauthorized(): boolean { return this.status === 401 }
  get isForbidden(): boolean { return this.status === 403 }
  get isNotFound(): boolean { return this.status === 404 }
  get isConflict(): boolean { return this.status === 409 }
  get isValidationError(): boolean { return this.status === 400 }

  // Non-retryable: no point retrying auth failures, client errors, or rate limits
  // 429 included because immediate retry just burns through the rate limit faster
  get isRetryable(): boolean {
    return ![400, 401, 403, 404, 409, 422, 429].includes(this.status)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/apis/api-error.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/api-error.ts frontend/src/apis/api-error.test.ts
git commit -m "feat: add typed ApiError class for structured HTTP error handling"
```

---

### Task 2: Update apiFetch to throw ApiError

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`

- [ ] **Step 1: Write failing tests for ApiError throwing**

Add these tests to the existing `agdevx-cart-api-config.test.ts`:

```typescript
import { ApiError } from '../api-error'

// Add to the existing describe('apiFetch', ...) block:

it('should throw ApiError when response is not ok', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ message: 'Resource not found' }),
  })

  await expect(apiFetch('/test-endpoint')).rejects.toThrow(ApiError)
  await expect(apiFetch('/test-endpoint')).rejects.toMatchObject({
    status: 404,
    statusText: 'Not Found',
    body: { message: 'Resource not found' },
  })
})

it('should handle non-JSON error responses gracefully', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => { throw new SyntaxError('Unexpected token') },
  })

  await expect(apiFetch('/test-endpoint')).rejects.toThrow(ApiError)
  await expect(apiFetch('/test-endpoint')).rejects.toMatchObject({
    status: 500,
    body: null,
  })
})

it('should return Response normally when response is ok', async () => {
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({ data: 'test' }),
  }
  globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

  const result = await apiFetch('/test-endpoint')
  expect(result.ok).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`
Expected: New tests FAIL (apiFetch doesn't throw yet), existing tests PASS

- [ ] **Step 3: Update apiFetch to throw ApiError on non-ok responses**

In `agdevx-cart-api-config.ts`, add the import and the error check after the `fetch` call:

```typescript
import { ApiError } from '../api-error'
```

After `return fetch(endpoint, { ... })`, change to:

```typescript
const response = await fetch(endpoint, {
  ...options,
  headers,
  credentials: 'include',
})

if (!response.ok) {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Response body is not JSON — leave body as null
  }
  throw new ApiError(response.status, response.statusText, body)
}

return response
```

Note: The function signature changes from `return fetch(...)` to `const response = await fetch(...)` + `return response`. The return type stays `Promise<Response>`.

- [ ] **Step 4: Run all tests to verify**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`
Expected: All tests PASS (including existing ones)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
git commit -m "feat: throw ApiError from apiFetch on non-ok responses"
```

---

### Task 3: Install Sonner, add Toaster, consolidate auth storage key, update auth-provider

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/app.tsx`
- Modify: `frontend/src/state/auth-atoms.ts`
- Modify: `frontend/src/auth/use-auth.ts`
- Modify: `frontend/src/auth/auth-provider.tsx`

- [ ] **Step 1: Install Sonner**

Run: `cd frontend && npm install sonner`

- [ ] **Step 2: Add Toaster component to app.tsx**

Add import at top of `app.tsx`:

```typescript
import { Toaster } from 'sonner'
```

Add `<Toaster />` inside the `App` component, as a sibling to `QueryClientProvider` (outside all providers so it renders at the top level):

```typescript
const App = () => {
  return (
    <>
      <Toaster position="bottom-right" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </>
  )
}
```

- [ ] **Step 3: Export AUTH_USER_STORAGE_KEY and consolidate duplicates**

The constant `AUTH_USER_STORAGE_KEY = 'authUser'` is duplicated in 3 files: `auth-atoms.ts`, `use-auth.ts`, and `auth-provider.tsx`. Export it from `auth-atoms.ts` and import in the other two.

In `auth-atoms.ts`: change `const AUTH_USER_STORAGE_KEY` to `export const AUTH_USER_STORAGE_KEY`.

In `use-auth.ts`: remove `const AUTH_USER_STORAGE_KEY = 'authUser'` and update import:

```typescript
import { AUTH_USER_STORAGE_KEY, currentUserAtom } from '@/state/auth-atoms'
```

In `auth-provider.tsx`: remove `const AUTH_USER_STORAGE_KEY = 'authUser'` and update import:

```typescript
import { AUTH_USER_STORAGE_KEY, currentUserAtom } from '@/state/auth-atoms'
```

- [ ] **Step 4: Update auth-provider.tsx for ApiError from apiFetch**

With `apiFetch` now throwing `ApiError` on non-ok responses, the auth provider's session validation needs updating. The `/api/auth/me` call will throw `ApiError(401)` when the session is expired instead of returning a response with `ok: false`.

Before:
```typescript
try {
  const response = await apiFetch('/api/auth/me')
  if (response.ok) {
    const userData = await response.json()
    // ... set user
  } else {
    //== Cookie expired or invalid — clear local state
    setUser(null)
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }
} catch {
  //== Network error — keep optimistic local state
}
```

After:
```typescript
try {
  const response = await apiFetch('/api/auth/me')
  const userData = await response.json()
  const user: User = {
    id: userData.userId,
    email: userData.email,
    name: userData.name,
    createdBy: null,
    createdDate: new Date().toISOString(),
    modifiedBy: null,
    modifiedDate: null,
  }
  setUser(user)
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
} catch (error) {
  if (error instanceof ApiError) {
    //== HTTP error (e.g. 401 expired session) — clear local state
    setUser(null)
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }
  //== Network error (TypeError) — keep optimistic local state
}
```

Add import: `import { ApiError } from '@/apis/api-error'`

Note: This does NOT redirect to login. The auth provider silently clears state and `ProtectedRoute` handles the redirect. This is different from the mid-session 401 handler in `QueryCache` which does a hard redirect.

- [ ] **Step 5: Run full frontend test suite to verify nothing broke**

Run: `cd frontend && npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/app.tsx frontend/src/state/auth-atoms.ts frontend/src/auth/use-auth.ts frontend/src/auth/auth-provider.tsx
git commit -m "feat: install Sonner, consolidate auth storage key, update auth-provider for ApiError"
```

---

## Chunk 2: QueryClient + Global Error Handlers

### Task 4: Update QueryClient with caches, retry, gcTime

**Files:**
- Modify: `frontend/src/apis/tanstack-query/query-client.ts`
- Modify: `frontend/src/apis/tanstack-query/query-client.test.ts`

- [ ] **Step 1: Write failing tests for new QueryClient configuration**

Replace the existing `query-client.test.ts` with updated tests:

```typescript
// frontend/src/apis/tanstack-query/query-client.test.ts
// ABOUTME: Tests for Tanstack Query client configuration
// ABOUTME: Verifies query client defaults, retry logic, and global error handlers

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api-error'

import { handleUnauthorized, queryClient, shouldRetry } from './query-client'

describe('queryClient', () => {
  it('should be defined', () => {
    expect(queryClient).toBeDefined()
  })

  it('should be an instance of QueryClient', () => {
    expect(queryClient.constructor.name).toBe('QueryClient')
  })

  it('should have staleTime of 5 minutes', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5)
  })

  it('should have gcTime of 30 minutes', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 30)
  })

  it('should have refetchOnWindowFocus disabled by default', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false)
  })

  it('should have retry configured for mutations', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.mutations?.retry).toBe(shouldRetry)
  })
})

describe('shouldRetry', () => {
  it('should not retry non-retryable ApiError statuses', () => {
    const nonRetryable = [400, 401, 403, 404, 409, 422, 429]
    for (const status of nonRetryable) {
      expect(shouldRetry(0, new ApiError(status, 'test', null))).toBe(false)
    }
  })

  it('should retry retryable ApiError statuses on first failure', () => {
    expect(shouldRetry(0, new ApiError(500, 'test', null))).toBe(true)
    expect(shouldRetry(0, new ApiError(502, 'test', null))).toBe(true)
  })

  it('should not retry retryable ApiError after max failures', () => {
    expect(shouldRetry(1, new ApiError(500, 'test', null))).toBe(false)
  })

  it('should retry non-ApiError errors on first failure', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  })

  it('should not retry non-ApiError errors after max failures', () => {
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(false)
  })
})

describe('handleUnauthorized', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Mock window.location.href (not directly assignable in jsdom)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: 'http://localhost/' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('should clear localStorage and redirect when session exists', () => {
    localStorage.setItem('authUser', JSON.stringify({ id: '123' }))

    handleUnauthorized()

    expect(localStorage.getItem('authUser')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('should NOT redirect when no session exists (e.g., login page 401)', () => {
    // No authUser in localStorage — simulates a login attempt failure
    handleUnauthorized()

    expect(window.location.href).toBe('http://localhost/')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/apis/tanstack-query/query-client.test.ts`
Expected: FAIL — `shouldRetry` not exported, gcTime test fails

- [ ] **Step 3: Implement updated QueryClient configuration**

```typescript
// frontend/src/apis/tanstack-query/query-client.ts
// ABOUTME: TanStack Query client with global error handlers, smart retry, and caching
// ABOUTME: MutationCache shows toast on failures; QueryCache redirects to login on 401

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '../api-error'

import { AUTH_USER_STORAGE_KEY } from '@/state/auth-atoms'

/**
 * Handle 401 by clearing auth state and redirecting to login.
 * Only redirects if there's an existing session (prevents redirect during login attempts).
 * Uses window.location.href because cache callbacks are outside the React component tree.
 */
export function handleUnauthorized(): void {
  if (localStorage.getItem(AUTH_USER_STORAGE_KEY)) {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    window.location.href = '/login'
  }
}

/**
 * Smart retry function: skip retry for non-retryable HTTP errors (4xx, 429),
 * allow one retry for server errors and network failures.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && !error.isRetryable) return false
  return failureCount < 1
}

const queryCache = new QueryCache({
  onError: (error) => {
    if (error instanceof ApiError && error.isUnauthorized) {
      handleUnauthorized()
    }
  },
})

const mutationCache = new MutationCache({
  onError: (error, _variables, _onMutateResult, mutation) => {
    if (error instanceof ApiError && error.isUnauthorized) {
      handleUnauthorized()
      return
    }

    // Skip toast for mutations that handle errors inline
    const key = mutation.options.mutationKey
    if (key && key[0] === 'auth') return
    if (mutation.options.meta?.handlesErrors) return

    toast.error('Something went wrong. Please try again.')
  },
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetry,
    },
  },
})
```

**Key design decisions:**
- `handleUnauthorized()` checks `localStorage` before redirecting — prevents redirect during login attempts where 401 means "wrong password"
- Auth mutations (key starts with `'auth'`) skip the toast — login/register pages handle errors inline
- `shouldRetry` is exported for testability
- `window.location.href` triggers a full page reload, naturally clearing Jotai state

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/apis/tanstack-query/query-client.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/apis/tanstack-query/query-client.ts frontend/src/apis/tanstack-query/query-client.test.ts
git commit -m "feat: add global error handlers, smart retry, and gcTime to QueryClient"
```

---

## Chunk 3: Hook Cleanup + Page Updates

### Task 5: Update error-messages.ts for ApiError

**Files:**
- Modify: `frontend/src/utilities/error-messages.ts`
- Modify: `frontend/src/utilities/error-messages.test.ts`

**Note:** The spec says to delete this file, but `create-household-page.tsx` and `join-household-page.tsx` use `getErrorMessage()` for inline error display. Inline errors provide better UX than generic toasts for form submissions, so we keep the file but simplify it to handle `ApiError`.

- [ ] **Step 1: Write failing test for ApiError handling**

Add to `error-messages.test.ts`:

```typescript
import { ApiError } from '@/apis/api-error'

// Add to getErrorMessage describe block:

it('should extract message from ApiError body', () => {
  const error = new ApiError(400, 'Bad Request', { message: 'Name already exists' })
  expect(getErrorMessage(error)).toBe('Name already exists')
})

it('should fall back to status text when ApiError body has no message', () => {
  const error = new ApiError(500, 'Internal Server Error', null)
  expect(getErrorMessage(error)).toBe('Internal Server Error')
})

it('should fall back to status text when ApiError body message is not a string', () => {
  const error = new ApiError(400, 'Bad Request', { code: 123 })
  expect(getErrorMessage(error)).toBe('Bad Request')
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `cd frontend && npx vitest run src/utilities/error-messages.test.ts`
Expected: New ApiError tests FAIL

- [ ] **Step 3: Update getErrorMessage to handle ApiError**

Replace the contents of `error-messages.ts`:

```typescript
// ABOUTME: Error message utility for extracting user-facing messages from errors
// ABOUTME: Handles ApiError (with HTTP body), standard Error, and unknown values

import { ApiError } from '@/apis/api-error'

/**
 * Extracts a user-friendly error message from any error type.
 * - ApiError: uses body.message if available, falls back to statusText
 * - Error: returns .message
 * - Anything else: returns generic fallback
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (body && typeof body.message === 'string') return body.message
    return error.statusText
  }

  if (error instanceof Error) return error.message

  return 'An unexpected error occurred. Please try again.'
}
```

- [ ] **Step 4: Update tests — remove ERROR_MESSAGES references**

Replace the full test file to match the simplified implementation. Remove all `ERROR_MESSAGES` tests and error code mapping tests. Keep tests for `getErrorMessage` with Error objects, unknown values, and add the ApiError tests from step 1.

```typescript
// frontend/src/utilities/error-messages.test.ts
// ABOUTME: Tests for error message utility
// ABOUTME: Verifies message extraction from ApiError, Error, and unknown values

import { describe, expect, it } from 'vitest'

import { ApiError } from '@/apis/api-error'

import { getErrorMessage } from './error-messages'

describe('getErrorMessage', () => {
  it('should extract message from ApiError body', () => {
    const error = new ApiError(400, 'Bad Request', { message: 'Name already exists' })
    expect(getErrorMessage(error)).toBe('Name already exists')
  })

  it('should fall back to statusText when ApiError body has no message', () => {
    const error = new ApiError(500, 'Internal Server Error', null)
    expect(getErrorMessage(error)).toBe('Internal Server Error')
  })

  it('should fall back to statusText when ApiError body message is not a string', () => {
    const error = new ApiError(400, 'Bad Request', { code: 123 })
    expect(getErrorMessage(error)).toBe('Bad Request')
  })

  it('should return error message from Error objects', () => {
    expect(getErrorMessage(new Error('Something went wrong'))).toBe('Something went wrong')
  })

  it('should return fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred. Please try again.')
  })

  it('should return fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred. Please try again.')
  })

  it('should return fallback for non-string, non-Error values', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred. Please try again.')
    expect(getErrorMessage({})).toBe('An unexpected error occurred. Please try again.')
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utilities/error-messages.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utilities/error-messages.ts frontend/src/utilities/error-messages.test.ts
git commit -m "refactor: simplify getErrorMessage to handle ApiError"
```

---

### Task 6: Remove response.ok checks from all query hooks

**Files (12 query hooks):**
- Modify: `frontend/src/apis/agdevx-cart-api/trip/use-trips.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/trip/use-trip.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/trip/use-trip-items.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-households.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-household.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-household-members.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-invite-code.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-inventory.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-personal-inventory.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts`

- [ ] **Step 1: Remove response.ok checks from all query hooks**

**Pattern — Before (all 11 standard queries follow this):**

```typescript
queryFn: async (): Promise<SomeType[]> => {
  const response = await apiFetch('/api/endpoint')
  if (!response.ok) {
    throw new Error('Failed to fetch X')
  }
  return response.json()
},
```

**Pattern — After:**

```typescript
queryFn: async (): Promise<SomeType[]> => {
  const response = await apiFetch('/api/endpoint')
  return response.json()
},
```

Apply this to all 11 standard query hooks: `use-trips`, `use-trip`, `use-trip-items`, `use-households`, `use-household`, `use-household-members`, `use-invite-code`, `use-inventory`, `use-personal-inventory`, `use-household-inventory`, `use-merged-inventory`.

**Special case — `use-stores.query.ts`:** This uses `Promise.all` with a for loop:

Before:
```typescript
const allStores: Store[] = []
for (const response of responses) {
  if (!response.ok) {
    throw new Error('Failed to fetch stores')
  }
  const stores: Store[] = await response.json()
  allStores.push(...stores)
}
```

After (apiFetch throws before the loop if any call fails):
```typescript
const allStores: Store[] = []
for (const response of responses) {
  const stores: Store[] = await response.json()
  allStores.push(...stores)
}
```

- [ ] **Step 2: Run full test suite to verify nothing broke**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/use-trips.query.ts frontend/src/apis/agdevx-cart-api/trip/use-trip.query.ts frontend/src/apis/agdevx-cart-api/trip/use-trip-items.query.ts frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts frontend/src/apis/agdevx-cart-api/household/use-households.query.ts frontend/src/apis/agdevx-cart-api/household/use-household.query.ts frontend/src/apis/agdevx-cart-api/household/use-household-members.query.ts frontend/src/apis/agdevx-cart-api/household/use-invite-code.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-personal-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts
git commit -m "refactor: remove response.ok checks from query hooks (handled by apiFetch)"
```

---

### Task 7: Remove response.ok checks from all mutation hooks + add mutationKeys

**Files (27 mutation hooks):**

**Auth (4):**
- `frontend/src/apis/agdevx-cart-api/auth/login.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/auth/change-password.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/auth/update-profile.mutation.ts`

**Trip (10):**
- `frontend/src/apis/agdevx-cart-api/trip/create-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/delete-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/start-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/complete-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/reopen-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/add-trip-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/check-trip-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/delete-trip-item.mutation.ts`

**Household (7):**
- `frontend/src/apis/agdevx-cart-api/household/create-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/delete-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/join-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/remove-household-member.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/transfer-household-ownership.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/regenerate-invite-code.mutation.ts`

**Store (3):**
- `frontend/src/apis/agdevx-cart-api/store/create-store.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/store/update-store.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/store/delete-store.mutation.ts`

**Inventory (3):**
- `frontend/src/apis/agdevx-cart-api/inventory/create-inventory-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/update-inventory-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation.ts`

- [ ] **Step 1: Remove response.ok checks + add mutationKey to all mutations**

**Pattern — Standard mutation (23 of 27):**

Before (example: `create-trip.mutation.ts`):
```typescript
return useMutation({
  mutationFn: async (request: CreateTripRequest): Promise<Trip> => {
    const response = await apiFetch('/api/trip', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    if (!response.ok) {
      throw new Error('Failed to create trip')
    }
    return response.json() as Promise<Trip>
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  },
})
```

After:
```typescript
return useMutation({
  mutationKey: ['trips', 'create'],
  mutationFn: async (request: CreateTripRequest): Promise<Trip> => {
    const response = await apiFetch('/api/trip', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.json() as Promise<Trip>
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  },
})
```

**Pattern — Auth mutations (login + register have different structure):**

Before (`login.mutation.ts`):
```typescript
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }
  return response.json()
}

export function useLoginMutation() {
  return useMutation({ mutationFn: login })
}
```

After:
```typescript
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  return response.json()
}

export function useLoginMutation() {
  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: login,
  })
}
```

Note: The old login/register mutations parsed the error body themselves. With `apiFetch` doing this centrally, the body is available on `ApiError.body`. The `headers: { 'Content-Type': 'application/json' }` on login/register is redundant (apiFetch sets it when body is present) but harmless — leave it to avoid unnecessary churn.

**Full mutationKey mapping:**

| File | mutationKey |
|------|-------------|
| `login.mutation.ts` | `['auth', 'login']` |
| `register.mutation.ts` | `['auth', 'register']` |
| `change-password.mutation.ts` | `['auth', 'change-password']` |
| `update-profile.mutation.ts` | `['auth', 'update-profile']` |
| `create-trip.mutation.ts` | `['trips', 'create']` |
| `update-trip.mutation.ts` | `['trips', 'update']` |
| `delete-trip.mutation.ts` | `['trips', 'delete']` |
| `start-trip.mutation.ts` | `['trips', 'start']` |
| `complete-trip.mutation.ts` | `['trips', 'complete']` |
| `reopen-trip.mutation.ts` | `['trips', 'reopen']` |
| `add-trip-item.mutation.ts` | `['trip-items', 'add']` |
| `check-trip-item.mutation.ts` | `['trip-items', 'check']` |
| `update-trip-item.mutation.ts` | `['trip-items', 'update']` |
| `delete-trip-item.mutation.ts` | `['trip-items', 'delete']` |
| `create-household.mutation.ts` | `['households', 'create']` + `meta: { handlesErrors: true }` |
| `update-household.mutation.ts` | `['households', 'update']` |
| `delete-household.mutation.ts` | `['households', 'delete']` |
| `join-household.mutation.ts` | `['households', 'join']` + `meta: { handlesErrors: true }` |
| `remove-household-member.mutation.ts` | `['households', 'remove-member']` |
| `transfer-household-ownership.mutation.ts` | `['households', 'transfer-ownership']` |
| `regenerate-invite-code.mutation.ts` | `['households', 'regenerate-invite-code']` |
| `create-store.mutation.ts` | `['stores', 'create']` |
| `update-store.mutation.ts` | `['stores', 'update']` |
| `delete-store.mutation.ts` | `['stores', 'delete']` |
| `create-inventory-item.mutation.ts` | `['inventory', 'create']` |
| `update-inventory-item.mutation.ts` | `['inventory', 'update']` |
| `delete-inventory-item.mutation.ts` | `['inventory', 'delete']` |

- [ ] **Step 2: Update existing mutation tests**

The auth mutation tests (`login.mutation.test.ts`, etc.) currently mock `globalThis.fetch` with `ok: false` and expect `isError: true`. With `apiFetch` now throwing `ApiError` before the mutation sees the response, these tests still work — `ApiError` propagates through the mutation and sets `isError: true`. However, the error object type changes from `Error` to `ApiError`. Update any assertions that check error type/message.

In `login.mutation.test.ts`, the test "should handle login failure with invalid credentials" still works because `apiFetch` throws before the mutation function reads the response. The mock needs to include `statusText`:

```typescript
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 401,
  statusText: 'Unauthorized',
  json: async () => ({
    errorCode: 'UNAUTHORIZED',
    message: 'Invalid credentials',
  }),
})
```

Make similar updates to `register.mutation.test.ts`, `change-password.mutation.test.ts`, and `update-profile.mutation.test.ts`.

- [ ] **Step 3: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/
git commit -m "refactor: remove response.ok from mutations, add mutationKey to all 27 mutations"
```

---

### Task 8: Update page error handling

**Files:**
- Modify: `frontend/src/pages/login-page.tsx`
- Modify: `frontend/src/pages/register-page.tsx`
- Modify: `frontend/src/pages/shopping-page.tsx`
- Modify: `frontend/src/pages/trip-detail-page.tsx`
- Modify: `frontend/src/pages/active-trip-page.tsx`
- Modify: `frontend/src/pages/create-household-page.tsx`
- Modify: `frontend/src/pages/join-household-page.tsx`

- [ ] **Step 1: Update login page — simplify catch**

In `login-page.tsx`, the catch block currently does `console.error`. The global MutationCache handles auth mutation errors silently (no toast because key is `['auth', ...]`). The inline `loginMutation.isError` display still works. Remove the `console.error`:

```typescript
// Before:
} catch (error) {
  console.error('Login failed:', error)
}

// After:
} catch {
  // Error displayed inline via loginMutation.isError
}
```

- [ ] **Step 2: Update register page — use ApiError for duplicate detection**

In `register-page.tsx`, the catch block checks `error.message` for "already exists". With `ApiError`, the structure changes:

```typescript
// Before:
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (errorMessage.includes('already exists') || errorMessage.includes('DUPLICATE_EMAIL')) {
    setServerEmailError('This email is already registered')
  } else {
    console.error('Registration failed:', error)
  }
}

// After:
} catch (error) {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (body?.errorCode === 'DUPLICATE_EMAIL') {
      setServerEmailError('This email is already registered')
    }
  }
  // Other errors: no toast (auth mutation), inline state via registerMutation.isError
}
```

Add import: `import { ApiError } from '@/apis/api-error'`

- [ ] **Step 3: Clean up silent catches in shopping-page, trip-detail-page**

These pages use `mutateAsync` + try/catch where the catch is empty (`// Error handled by mutation state`). The try/catch is still needed to prevent unhandled promise rejection when `mutateAsync` fails, but the comment is now misleading (errors are handled by the global MutationCache toast). Update comments:

In `shopping-page.tsx` line 56-58:
```typescript
// Before:
} catch {
  // Error handled by mutation state
}

// After:
} catch {
  // Error toast shown by global MutationCache handler
}
```

In `trip-detail-page.tsx` line 62-64:
```typescript
// Same comment update
```

- [ ] **Step 4: Clean up active-trip-page — update both catches**

In `active-trip-page.tsx`:

`handleToggleItem` (lines 83-95) — this will be replaced by optimistic updates in Task 9, so leave it for now. It will be overhauled completely in that task.

`doCompleteTrip` (lines 122-132):
```typescript
// Same comment update as above
} catch {
  // Error toast shown by global MutationCache handler
}
```

- [ ] **Step 5: Update household page catch comments**

In `create-household-page.tsx` and `join-household-page.tsx`, update the catch comment. These pages show inline errors via `getErrorMessage(mutation.error)` and their mutations have `meta: { handlesErrors: true }` so the global toast is skipped:

```typescript
// Before:
} catch {
  // Error is handled by mutation state
}

// After:
} catch {
  // Error displayed inline via getErrorMessage(mutation.error)
}
```

- [ ] **Step 6: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/login-page.tsx frontend/src/pages/register-page.tsx frontend/src/pages/shopping-page.tsx frontend/src/pages/trip-detail-page.tsx frontend/src/pages/active-trip-page.tsx frontend/src/pages/create-household-page.tsx frontend/src/pages/join-household-page.tsx
git commit -m "refactor: update page error handling for ApiError and global toast"
```

---

## Chunk 4: Optimistic Updates + Per-Query Enhancements

### Task 9: Add optimistic updates to check-trip-item mutation

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/trip/check-trip-item.mutation.ts`
- Modify: `frontend/src/pages/active-trip-page.tsx`

- [ ] **Step 1: Update check-trip-item mutation with optimistic update lifecycle**

Replace the mutation in `check-trip-item.mutation.ts`:

```typescript
// ABOUTME: Mutation hook for checking/unchecking trip items with optimistic updates
// ABOUTME: Instantly toggles UI state, rolls back on failure, refetches on settle

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'

interface CheckTripItemRequest {
  tripId: string
  tripItemId: string
  isChecked: boolean
}

export const useCheckTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trip-items', 'check'],
    mutationFn: async (request: CheckTripItemRequest): Promise<TripItem> => {
      const { tripItemId, isChecked } = request
      const endpoint = isChecked ? 'check' : 'uncheck'
      const response = await apiFetch(`/api/tripitem/${tripItemId}/${endpoint}`, {
        method: 'POST',
      })
      return response.json() as Promise<TripItem>
    },
    onMutate: async (variables) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['trips', variables.tripId, 'items'] })

      // Snapshot current cache for rollback
      const previousItems = queryClient.getQueryData<TripItem[]>(['trips', variables.tripId, 'items'])

      // Optimistically flip the isChecked flag
      queryClient.setQueryData<TripItem[]>(
        ['trips', variables.tripId, 'items'],
        (old) =>
          old?.map((item) =>
            item.id === variables.tripItemId
              ? {
                  ...item,
                  isChecked: variables.isChecked,
                  checkedAt: variables.isChecked ? new Date().toISOString() : null,
                }
              : item
          )
      )

      return { previousItems }
    },
    onError: (_error, variables, context) => {
      // Rollback to snapshot on failure
      if (context?.previousItems) {
        queryClient.setQueryData(['trips', variables.tripId, 'items'], context.previousItems)
      }
      // Global MutationCache onError shows toast
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch to sync with server truth
      // Prefix match covers both trip detail and trip items queries
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
```

- [ ] **Step 2: Update handleToggleItem in active-trip-page.tsx**

Switch from `mutateAsync` (awaited, try/catch) to `mutate` (fire-and-forget):

```typescript
// Before:
const handleToggleItem = async (tripItemId: string, currentlyChecked: boolean) => {
  if (!tripId) return
  try {
    await checkMutation.mutateAsync({
      tripId,
      tripItemId,
      isChecked: !currentlyChecked,
    })
  } catch {
    // Error handled by mutation state
  }
}

// After:
const handleToggleItem = (tripItemId: string, currentlyChecked: boolean) => {
  if (!tripId) return
  checkMutation.mutate({
    tripId,
    tripItemId,
    isChecked: !currentlyChecked,
  })
}
```

- [ ] **Step 3: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS. The `active-trip-page.test.tsx` mocks `useCheckTripItemMutation` so optimistic update internals are not exercised in page tests — they rely on the mutation hook's unit behavior.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/check-trip-item.mutation.ts frontend/src/pages/active-trip-page.tsx
git commit -m "feat: add optimistic updates for check/uncheck trip items"
```

---

### Task 10: Add keepPreviousData to scope-filtered queries

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts`

- [ ] **Step 1: Add keepPreviousData to all 3 queries**

Add import to each file:
```typescript
import { keepPreviousData, useQuery } from '@tanstack/react-query'
```

Add option to each `useQuery` call:
```typescript
placeholderData: keepPreviousData,
```

Example for `use-stores.query.ts`:
```typescript
return useQuery({
  queryKey: ['stores', householdIds],
  queryFn: async (): Promise<Store[]> => {
    // ...
  },
  enabled: isAuthenticated,
  placeholderData: keepPreviousData,
})
```

Same pattern for `use-household-inventory.query.ts` and `use-merged-inventory.query.ts`.

- [ ] **Step 2: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-household-inventory.query.ts frontend/src/apis/agdevx-cart-api/inventory/use-merged-inventory.query.ts
git commit -m "feat: add keepPreviousData to scope-filtered queries"
```

---

### Task 11: Add refetchOnWindowFocus to volatile queries

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/trip/use-trip-items.query.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/trip/use-trips.query.ts`

- [ ] **Step 1: Add refetchOnWindowFocus: true to both queries**

In `use-trip-items.query.ts`:
```typescript
return useQuery({
  queryKey: ['trips', tripId, 'items'],
  queryFn: async (): Promise<TripItem[]> => {
    const response = await apiFetch(`/api/tripitem/trip/${tripId}`)
    return response.json() as Promise<TripItem[]>
  },
  enabled: isAuthenticated && !!tripId,
  refetchOnWindowFocus: true,
})
```

In `use-trips.query.ts`:
```typescript
return useQuery({
  queryKey: ['trips'],
  queryFn: async (): Promise<Trip[]> => {
    const response = await apiFetch('/api/trip/user')
    return response.json()
  },
  enabled: isAuthenticated,
  refetchOnWindowFocus: true,
})
```

- [ ] **Step 2: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/use-trip-items.query.ts frontend/src/apis/agdevx-cart-api/trip/use-trips.query.ts
git commit -m "feat: enable refetchOnWindowFocus for trip queries"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run TypeScript type checking**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No type errors

- [ ] **Step 2: Run linting**

Run: `cd frontend && npx eslint src/`
Expected: No lint errors (or only pre-existing ones)

- [ ] **Step 3: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Verify no unused imports or references to deleted code**

Search for any remaining references to the old `ERROR_MESSAGES` constant:

Run: `grep -r "ERROR_MESSAGES" frontend/src/`
Expected: No results (the constant was removed in Task 5)

- [ ] **Step 5: Commit any final fixes**

If any issues were found and fixed in steps 1-4, commit them:

```bash
git commit -m "fix: resolve lint/type issues from TanStack Query resilience changes"
```
