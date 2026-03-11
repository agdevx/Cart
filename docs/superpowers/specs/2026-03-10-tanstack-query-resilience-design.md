# TanStack Query Resilience Improvements — Design Spec

## Overview

Harden the frontend's TanStack Query layer for reliability and UX. Currently, mutation errors are silently swallowed (27 mutations with zero `onError` handlers), there's no 401 session-expiry handling, and no toast/notification system exists. This work adds structured error handling, optimistic updates, and query-level tuning.

## Selected Items

| # | Item | Category |
|---|------|----------|
| 1 | Optimistic updates for check/uncheck trip items | UX |
| 2 | Global mutation error handler via MutationCache | Reliability |
| 3 | Global query error handler via QueryCache (401 → login) | Reliability |
| 4 | Typed ApiError class + smart retry | Reliability |
| 7 | `placeholderData: keepPreviousData` on scope-filtered queries | UX |
| 8 | Increase `gcTime` to 30 minutes | Performance |
| 9 | Add `mutationKey` to all mutations | Future-proofing |
| 12 | Selective `refetchOnWindowFocus` for volatile queries | UX |

## Section 1: ApiError Class + apiFetch Changes

### New file: `frontend/src/apis/api-error.ts`

A typed error class replacing generic `new Error('Failed to fetch X')` across all hooks.

```typescript
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

### Changes to `apiFetch` (`agdevx-cart-api-config.ts`)

After the `fetch()` call, check `response.ok`. If not ok:
1. Attempt to parse the response body as JSON (fall back to `null`)
2. Throw `new ApiError(response.status, response.statusText, body)`

Return type stays `Promise<Response>` for successful responses. Callers no longer need `if (!response.ok)` checks.

Network failures (`TypeError` from `fetch`) pass through as-is — they are not wrapped in `ApiError`. The global error handlers treat non-`ApiError` errors as retryable (queries retry once, mutations show toast).

### Ripple effect on all 39 hooks (12 queries + 27 mutations)

Remove the `if (!response.ok) throw new Error('...')` blocks from every query and mutation hook. They simplify to calling `apiFetch()` and parsing the successful response.

**Note on `use-stores.query.ts`:** This query uses `Promise.all` across multiple `apiFetch` calls (personal + N household fetches). With `apiFetch` throwing `ApiError`, the first failure rejects the entire `Promise.all` — this is acceptable all-or-nothing behavior for a combined query.

## Section 2: QueryClient Configuration — Global Error Handlers, Retry, gcTime

### QueryCache `onError` (query errors)

- Check if error is `ApiError` with status 401
- If 401: clear localStorage auth key, redirect via `window.location.href = '/login'`
- Non-401 query errors are silent — UI shows error states via `isError`/`error` properties

### MutationCache `onError` (mutation errors — safety net)

- Check if error is `ApiError` with status 401 → same logout/redirect
- All other mutation errors: `toast.error('Something went wrong. Please try again.')`
- This is the safety net for the 10+ locations where mutations currently fail silently

### Smart retry function (queries and mutations)

```typescript
retry: (failureCount, error) => {
  if (error instanceof ApiError && !error.isRetryable) return false
  return failureCount < 1
}
```

Applied to both `queries` and `mutations` default options. Mutations go from retry 0 to retry 1 (for retryable errors only).

### gcTime increase

`gcTime: 1000 * 60 * 30` (30 minutes, up from default 5 minutes). Reduces refetching when navigating back to previously visited pages.

### 401 redirect mechanism

Uses `window.location.href = '/login'` (not React Router `useNavigate`) because cache callbacks are outside the React component tree. Full page reload naturally clears Jotai state. localStorage auth key is cleared before redirect.

### Toast system (Sonner)

- Install `sonner` package
- Add `<Toaster />` component in `app.tsx` (bottom-right position, Sonner defaults for duration/max visible)
- MutationCache `onError` calls `toast.error()` for non-401 errors

## Section 3: Optimistic Updates for Check/Uncheck Trip Items

### Changes to `check-trip-item.mutation.ts`

Standard TanStack Query optimistic update pattern:

- **`onMutate`**: Cancel in-flight refetches for `['trips', tripId, 'items']`, snapshot current cache, optimistically flip `isChecked` and set/clear `checkedAt`
- **`onError`**: Rollback to snapshot. Global MutationCache `onError` shows toast.
- **`onSettled`**: Always invalidate `['trips', tripId]` (prefix match — covers both trip detail and trip items queries) to sync with server truth. This matches the current `onSuccess` invalidation scope.

### Changes to `active-trip-page.tsx`

`handleToggleItem` switches from `mutateAsync` (awaited, try/catch) to `mutate` (fire-and-forget). The optimistic update handles the UI, rollback handles errors.

### SSE interaction

Compatible. User checks item → instant optimistic update. SSE fires → `onSettled` invalidation → refetch confirms server state. Other users' changes arrive via SSE → invalidation → refetch merges both.

## Section 4: Per-Query Enhancements

### `placeholderData: keepPreviousData` (3 queries)

Prevents flash-to-empty when switching scope filters. Applied to queries whose key changes when the user switches scope:
- `use-stores.query.ts` — key: `['stores', householdIds]`
- `use-household-inventory.query.ts` — key: `['inventory', 'household', householdId]`
- `use-merged-inventory.query.ts` — key: `['inventory', 'merged', householdId]`

### Selective `refetchOnWindowFocus: true` (2 queries)

Overrides the global `false` default for data that other users can change:
- `use-trip-items.query.ts` — other users might add/check items
- `use-trips.query.ts` — trip status could change

### `mutationKey` on all 27 mutations

Convention mirrors query keys with an action verb:
- `['trips', 'create']`, `['trips', 'update']`, `['trips', 'delete']`, `['trips', 'start']`, `['trips', 'complete']`, `['trips', 'reopen']`
- `['trip-items', 'check']`, `['trip-items', 'add']`, `['trip-items', 'update']`, `['trip-items', 'delete']`
- `['stores', 'create']`, `['stores', 'update']`, `['stores', 'delete']`
- `['households', 'create']`, `['households', 'update']`, `['households', 'delete']`, `['households', 'join']`, `['households', 'remove-member']`, `['households', 'transfer-ownership']`, `['households', 'regenerate-invite-code']`
- `['inventory', 'create']`, `['inventory', 'update']`, `['inventory', 'delete']`
- `['auth', 'login']`, `['auth', 'register']`, `['auth', 'change-password']`, `['auth', 'update-profile']`

No behavior change today; enables future deduplication, filtering, and devtools inspection.

## Section 5: Ripple Effects and Testing

### Hook cleanup

All 39 hooks (12 queries + 27 mutations): remove `if (!response.ok) throw new Error('...')` blocks. Hooks simplify to calling `apiFetch()` and parsing successful responses.

### Silent error catch sites

The 10+ empty `try/catch` blocks in pages become unnecessary — global MutationCache `onError` is the safety net. Remove empty try/catch wrappers; switch `mutateAsync` to `mutate` where result isn't awaited.

### `error-messages.ts` deletion

Generic error message strings become unused with `ApiError` providing structured error info. Delete both `error-messages.ts` and `error-messages.test.ts`. Remove imports of `getErrorMessage`/`ERROR_MESSAGES` from `join-household-page.tsx` and `create-household-page.tsx`.

### Auth provider (`auth-provider.tsx`)

Keeps its own `response.ok` check for session validation on mount — the "no session" case is handled differently from a mid-session 401 (it silently clears state without redirecting).

### Login/register page error handling

These pages catch `ApiError` and use its properties for specific error display (e.g., "Invalid credentials" vs "Account already exists").

### Testing

- **ApiError class**: Unit tests for construction, convenience getters, `isRetryable` logic
- **apiFetch**: Assert throws `ApiError` on non-ok responses with correct status/body
- **QueryClient config**: Test retry function returns `false` for non-retryable statuses
- **Optimistic updates**: Test `onMutate` (cache updated), `onError` (rollback), `onSettled` (invalidation)
- **Hook tests**: Update to reflect hooks no longer throw their own errors
- **Toast integration**: Verify `toast.error` called from MutationCache `onError` for non-401 errors
- **401 redirect**: Verify `window.location.href` set to `/login` and localStorage cleared

## What's NOT Changing

- SSE client/hook code — no modifications needed (behavioral interaction with optimistic updates is compatible, see Section 3)
- Auth provider session validation on mount — keeps its own `response.ok` check
- Query key structure — unchanged across all queries
- Backend API contracts — no backend changes needed
