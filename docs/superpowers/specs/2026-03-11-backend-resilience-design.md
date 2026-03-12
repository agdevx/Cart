# Backend Resilience Design

## Overview

Two improvements to backend robustness: server-side request timeouts to prevent hung requests from consuming resources, and URL prefix versioning (`/api/v1/`) to support future independent endpoint evolution.

## Current State

- **Request timeouts**: Frontend has a 15s timeout via `AbortController` in `apiFetch`. Backend has no server-side timeout — a stuck database query or deadlock holds the connection indefinitely.
- **API versioning**: All endpoints use unversioned `/api/[controller]` routes. The only API consumer is the app's own frontend. One breaking change has already been made (TripItem endpoint) by updating both sides in the same PR.

## Component Designs

### 1. Server-Side Request Timeouts

#### Approach

Use ASP.NET Core's built-in `RequestTimeoutMiddleware` (available since .NET 8). Configure a default timeout policy on all endpoints, with per-endpoint overrides via `[RequestTimeout]` attribute where needed.

#### Configuration

**Default timeout: 30 seconds.** This is intentionally longer than the frontend's 15s. If the client aborts at 15s, the backend still finishes processing within a reasonable window. But 30s catches truly stuck requests (deadlocks, infinite loops, stalled I/O) that would otherwise hold connections open indefinitely.

**New file:** `backend/AGDevX.Cart.Api/Middleware/RequestTimeoutExtensions.cs`

Custom extension method `builder.Services.AddRequestTimeouts()` wrapping the built-in configuration:
- Default policy: 30 seconds
- Named policy `"sse"`: Timeout.InfiniteTimeSpan (for long-lived SSE connections)

#### Response on Timeout

When a request exceeds 30 seconds, ASP.NET Core's `RequestTimeoutMiddleware` cancels the `CancellationToken` and writes a `408 Request Timeout` response directly — this is the primary timeout handling path.

As a safety net, the `GlobalExceptionMiddleware` needs a new `catch (OperationCanceledException)` block (before the existing generic `catch (Exception)`) to handle edge cases where the response has already started writing when the timeout fires. This block should return the standard error format:

```json
{ "errorCode": "REQUEST_TIMEOUT", "message": "The request timed out." }
```

Note: `OperationCanceledException` can also come from client disconnections (browser closes tab). In that case, the response doesn't need to be written since nobody's listening. The catch block should check `context.RequestAborted.IsCancellationRequested` to distinguish client disconnection (log and return early) from server timeout (return 408).

#### SSE Endpoint Exclusion

`TripEventsController` holds connections open for real-time Server-Sent Events. These must be excluded from the default timeout. Apply `[RequestTimeout("sse")]` to the SSE endpoint, which uses the named policy with infinite timeout.

#### Pipeline Placement

`app.UseRequestTimeouts()` placed after rate limiting and before authentication in the pipeline:

```
1. GlobalExceptionHandler
2. SecurityHeaders
3. HSTS + HttpsRedirection (production only)
4. CORS
5. RateLimiter
6. RequestTimeouts    ← new
7. Authentication
8. Authorization
9. Controllers
```

#### CancellationToken Propagation

For the timeout to actually cancel stuck operations, controller methods that perform I/O should accept and pass `CancellationToken`. EF Core queries already support this. The change:

- Add `CancellationToken cancellationToken = default` parameter to controller action methods
- Pass it through to service methods → repository methods → EF Core queries (`.ToListAsync(cancellationToken)`, `.SaveChangesAsync(cancellationToken)`, etc.)

This is a cross-cutting change that touches all controllers, services, and repositories. The affected interfaces and their implementations:
- **Services:** `IHouseholdService`, `IStoreService`, `IInventoryService`, `ITripService`, `ITripItemService`, `IAuthService`
- **Repositories:** `IHouseholdRepository`, `IStoreRepository`, `IInventoryRepository`, `ITripRepository`, `ITripItemRepository`, `IUserRepository`
- **Controllers:** All 7 controllers

Each change is mechanical — adding the `CancellationToken` parameter and forwarding it. The implementation plan will detail the exact method signatures.

### 2. URL Prefix Versioning

#### Backend Changes

Update the `[Route]` attribute on all 7 controllers from `[Route("api/[controller]")]` to `[Route("api/v1/[controller]")]`.

| Controller | Current Route | New Route |
|------------|--------------|-----------|
| AuthController | `api/auth` | `api/v1/auth` |
| HouseholdController | `api/household` | `api/v1/household` |
| StoreController | `api/store` | `api/v1/store` |
| InventoryController | `api/inventory` | `api/v1/inventory` |
| TripController | `api/trip` | `api/v1/trip` |
| TripItemController | `api/tripitem` | `api/v1/tripitem` |
| TripEventsController | `api/trips/{tripId}/events` (absolute route) | `api/v1/trips/{tripId}/events` |

**Special cases with absolute route overrides:**
- `HouseholdController` has `[HttpPost("/api/households/join")]` → update to `[HttpPost("/api/v1/households/join")]`
- `TripEventsController` uses `[Route("api/trips/{tripId}/events")]` (not the `[controller]` convention) → update to `[Route("api/v1/trips/{tripId}/events")]`

No other code changes on the backend — just route prefixes.

#### Frontend Changes

Update every hardcoded endpoint path in the API layer. Each mutation and query file in `frontend/src/apis/agdevx-cart-api/` has its endpoint path as a string literal. Change `/api/` to `/api/v1/` in each file.

**Files to update (by domain):**

**Auth (4 files):**
- `auth/login.mutation.ts` — `/api/auth/login` → `/api/v1/auth/login`
- `auth/register.mutation.ts` — `/api/auth/register` → `/api/v1/auth/register`
- `auth/change-password.mutation.ts` — `/api/auth/password` → `/api/v1/auth/password`
- `auth/update-profile.mutation.ts` — `/api/auth/profile` → `/api/v1/auth/profile`

**Auth hooks (2 files):**
- `frontend/src/auth/auth-provider.tsx` — `/api/auth/me` → `/api/v1/auth/me` (session validation on mount)
- `frontend/src/auth/use-auth.ts` — `/api/auth/logout` → `/api/v1/auth/logout`

**Household (11 files):**
- `household/create-household.mutation.ts`
- `household/delete-household.mutation.ts`
- `household/join-household.mutation.ts`
- `household/regenerate-invite-code.mutation.ts`
- `household/remove-household-member.mutation.ts`
- `household/transfer-household-ownership.mutation.ts`
- `household/update-household.mutation.ts`
- `household/use-households.query.ts`
- `household/use-household.query.ts`
- `household/use-household-members.query.ts`
- `household/use-invite-code.query.ts`

**Inventory (7 files):**
- `inventory/create-inventory-item.mutation.ts`
- `inventory/delete-inventory-item.mutation.ts`
- `inventory/update-inventory-item.mutation.ts`
- `inventory/use-inventory.query.ts`
- `inventory/use-household-inventory.query.ts`
- `inventory/use-personal-inventory.query.ts`
- `inventory/use-merged-inventory.query.ts`

**Store (4 files):**
- `store/create-store.mutation.ts`
- `store/delete-store.mutation.ts`
- `store/update-store.mutation.ts`
- `store/use-stores.query.ts`

**Trip (13 files):**
- `trip/create-trip.mutation.ts`
- `trip/delete-trip.mutation.ts`
- `trip/update-trip.mutation.ts`
- `trip/start-trip.mutation.ts`
- `trip/complete-trip.mutation.ts`
- `trip/reopen-trip.mutation.ts`
- `trip/add-trip-item.mutation.ts`
- `trip/update-trip-item.mutation.ts`
- `trip/delete-trip-item.mutation.ts`
- `trip/check-trip-item.mutation.ts`
- `trip/use-trips.query.ts`
- `trip/use-trip.query.ts`
- `trip/use-trip-items.query.ts`

**SSE endpoint (1 file):**
- `frontend/src/pages/active-trip-page.tsx` — SSE URL `/api/trips/${tripId}/events` → `/api/v1/trips/${tripId}/events` (this uses `EventSource` directly, not `apiFetch`)

**Config (1 file):**
- `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts` — verify no base URL logic needs updating (currently passes paths through to `fetch` directly)

The exact file list will be confirmed during implementation by grepping for `/api/` in the frontend source.

**Why per-file and not a base URL constant:** Keeping endpoint paths explicit in each file allows independent versioning per endpoint. When a single endpoint eventually needs a v2, only that file changes.

#### Vite Proxy

The current proxy config forwards `/api` to `http://localhost:5000`. Since `/api/v1/` is a sub-path of `/api`, the proxy continues to work as-is. No change needed.

#### Scalar API Docs

Scalar at `/scalar/v1` reads from OpenAPI metadata generated from controller route attributes. The updated `[Route("api/v1/[controller]")]` attributes will automatically reflect in the generated docs. No manual change needed.

#### Playwright Tests

Both `e2e/` and `e2e-integration/` test suites have hardcoded API paths. The `e2e/` tests use route pattern globs (e.g., `page.route('**/api/auth/login', ...)`), while `e2e-integration/` tests use full URLs (e.g., `http://localhost:5000/api/auth/register`). Both must be updated to include `/v1/`. The exact files will be confirmed during implementation.

## Testing Strategy

- **Request timeout**: Integration test that verifies a slow endpoint returns 408 after the timeout period. Unit test for the global exception handler's `OperationCanceledException` handling returning the `REQUEST_TIMEOUT` error format.
- **SSE exclusion**: Verify the TripEvents SSE endpoint does not time out after 30s (or test that the `[RequestTimeout("sse")]` attribute is applied).
- **CancellationToken propagation**: Verify that cancellation tokens are forwarded through the call chain by testing that a cancelled token prevents database operations from executing.
- **URL versioning**: Integration tests verifying all endpoints respond at `/api/v1/` paths. Verify old `/api/` paths return 404. Frontend E2E tests confirm the app works end-to-end with the new URLs.

## Out of Scope

- Pagination — not needed at current scale
- API versioning middleware/library (e.g., `Asp.Versioning.Http`) — route attribute prefix is sufficient for a single-consumer API
- Backward compatibility for `/api/` routes — no external consumers, clean break
- Response caching / ETag support
