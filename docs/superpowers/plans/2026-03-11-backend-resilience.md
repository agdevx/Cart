# Backend Resilience Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side request timeouts and migrate all endpoints to `/api/v1/` URL prefix versioning.

**Architecture:** ASP.NET Core built-in `RequestTimeoutMiddleware` with 30s default and SSE exclusion. CancellationToken propagated through all layers. Route attributes updated to `api/v1/[controller]` on all controllers, frontend paths updated per-file.

**Tech Stack:** .NET 10, ASP.NET Core, Entity Framework Core, React 19, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-11-backend-resilience-design.md`

---

## Chunk 1: Request Timeout Infrastructure

### Task 1: RequestTimeoutExtensions Middleware

**Files:**
- Create: `backend/AGDevX.Cart.Api/Middleware/RequestTimeoutExtensions.cs`
- Create: `backend/AGDevX.Cart.Api.Tests/Middleware/RequestTimeoutExtensionsTests.cs`

- [ ] **Step 1: Write failing test for timeout configuration**

```csharp
// backend/AGDevX.Cart.Api.Tests/Middleware/RequestTimeoutExtensionsTests.cs
// ABOUTME: Tests that request timeout middleware is configured with correct policies

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http.Timeouts;
using Xunit;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class RequestTimeoutExtensionsTests
{
    [Fact]
    public void AddRequestTimeoutPolicies_RegistersDefaultPolicy()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRequestTimeoutPolicies();

        var app = builder.Build();
        var options = app.Services.GetRequiredService<IOptions<RequestTimeoutOptions>>();

        Assert.NotNull(options.Value.DefaultPolicy);
        Assert.Equal(TimeSpan.FromSeconds(30), options.Value.DefaultPolicy!.Timeout);
    }

    [Fact]
    public void AddRequestTimeoutPolicies_RegistersSsePolicy()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRequestTimeoutPolicies();

        var app = builder.Build();
        var options = app.Services.GetRequiredService<IOptions<RequestTimeoutOptions>>();

        Assert.True(options.Value.Policies.ContainsKey("sse"));
        Assert.Equal(Timeout.InfiniteTimeSpan, options.Value.Policies["sse"].Timeout);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "RequestTimeoutExtensionsTests"`
Expected: FAIL — AddRequestTimeoutPolicies method not found

- [ ] **Step 3: Implement RequestTimeoutExtensions**

```csharp
// backend/AGDevX.Cart.Api/Middleware/RequestTimeoutExtensions.cs
// ABOUTME: Configures server-side request timeouts. Default 30s for all endpoints,
// infinite timeout for SSE endpoints. Prevents hung requests from holding connections.

using Microsoft.AspNetCore.Http.Timeouts;

namespace AGDevX.Cart.Api.Middleware;

public static class RequestTimeoutExtensions
{
    public static IServiceCollection AddRequestTimeoutPolicies(this IServiceCollection services)
    {
        services.AddRequestTimeouts(options =>
        {
            options.DefaultPolicy = new RequestTimeoutPolicy
            {
                Timeout = TimeSpan.FromSeconds(30)
            };

            options.AddPolicy("sse", new RequestTimeoutPolicy
            {
                Timeout = Timeout.InfiniteTimeSpan
            });
        });

        return services;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "RequestTimeoutExtensionsTests"`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Middleware/RequestTimeoutExtensions.cs backend/AGDevX.Cart.Api.Tests/Middleware/RequestTimeoutExtensionsTests.cs
git commit -m "feat: add request timeout middleware configuration"
```

---

### Task 2: Update GlobalExceptionMiddleware for OperationCanceledException

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs`
- Modify: `backend/AGDevX.Cart.Api.Tests/Middleware/GlobalExceptionMiddlewareTests.cs`

- [ ] **Step 1: Write failing tests for timeout and client disconnect handling**

Add to the existing test file (or create if it doesn't exist):

```csharp
// Uses Moq to match the existing test file's pattern
[Fact]
public async Task Returns408_WhenOperationCanceledByTimeout()
{
    var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
    var middleware = new GlobalExceptionMiddleware(
        _ => throw new OperationCanceledException(),
        logger.Object
    );

    var context = new DefaultHttpContext();
    // RequestAborted is NOT canceled — this is a server timeout, not client disconnect
    context.Response.Body = new MemoryStream();

    await middleware.InvokeAsync(context);

    context.Response.Body.Seek(0, SeekOrigin.Begin);
    var body = await new StreamReader(context.Response.Body).ReadToEndAsync();

    Assert.Equal(408, context.Response.StatusCode);
    Assert.Contains("REQUEST_TIMEOUT", body);
}

[Fact]
public async Task ReturnsNoResponse_WhenClientDisconnects()
{
    var cts = new CancellationTokenSource();
    cts.Cancel();

    var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
    var middleware = new GlobalExceptionMiddleware(
        _ => throw new OperationCanceledException(),
        logger.Object
    );

    var context = new DefaultHttpContext();
    context.RequestAborted = cts.Token;
    context.Response.Body = new MemoryStream();

    await middleware.InvokeAsync(context);

    // Client disconnected — middleware should not try to write a response
    context.Response.Body.Seek(0, SeekOrigin.Begin);
    var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
    Assert.Empty(body);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "GlobalExceptionMiddlewareTests"`
Expected: FAIL — tests fail because current middleware doesn't handle OperationCanceledException specially

- [ ] **Step 3: Update GlobalExceptionMiddleware**

Add a `catch (OperationCanceledException)` block **before** the existing generic `catch (Exception)`:

```csharp
catch (OperationCanceledException)
{
    if (context.RequestAborted.IsCancellationRequested)
    {
        _logger.LogInformation("Client disconnected");
        return;
    }

    _logger.LogWarning("Request timed out: {Path}", context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status408RequestTimeout;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsJsonAsync(new
    {
        errorCode = "REQUEST_TIMEOUT",
        message = "The request timed out."
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "GlobalExceptionMiddlewareTests"`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs backend/AGDevX.Cart.Api.Tests/Middleware/GlobalExceptionMiddlewareTests.cs
git commit -m "feat: handle request timeout and client disconnect in exception middleware"
```

---

### Task 3: Wire Timeout into Pipeline and Exclude SSE

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs`

- [ ] **Step 1: Add timeout services and middleware to Program.cs**

In the service registration section (near other `builder.Services.Add*` calls):
```csharp
builder.Services.AddRequestTimeoutPolicies();
```

In the pipeline, add `app.UseRequestTimeouts()` after `app.UseRateLimiter()` and before `app.UseAuthentication()`:
```csharp
app.UseRateLimiter();
app.UseRequestTimeouts();  // ← new line
app.UseAuthentication();
```

- [ ] **Step 2: Add [RequestTimeout("sse")] to TripEventsController**

On the SSE endpoint method in `TripEventsController.cs`, add the attribute:
```csharp
[HttpGet]
[RequestTimeout("sse")]
public async Task GetEvents(Guid tripId, CancellationToken cancellationToken)
```

Add the using: `using Microsoft.AspNetCore.Http.Timeouts;`

- [ ] **Step 3: Build to verify compilation**

Run: `cd backend && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/Program.cs backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs
git commit -m "feat: wire request timeout into pipeline, exclude SSE endpoint"
```

---

## Chunk 2: CancellationToken Propagation

### Task 4: Repository Interfaces and Implementations

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/IHouseholdRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/IStoreRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/StoreRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/IInventoryRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/InventoryRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/ITripRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/ITripItemRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/IUserRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/UserRepository.cs`

This is a mechanical change: add `CancellationToken cancellationToken = default` to every async method signature in each interface and implementation, then forward it to all EF Core async calls.

- [ ] **Step 1: Update all repository interfaces**

For every `Task<T>` method in each interface, add `CancellationToken cancellationToken = default` as the last parameter. Example for `IHouseholdRepository`:

```csharp
Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default);
Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default);
Task<IEnumerable<Household>> GetUserHouseholds(Guid userId, CancellationToken cancellationToken = default);
Task<Household> Create(Household household, CancellationToken cancellationToken = default);
Task<Household> Update(Household household, CancellationToken cancellationToken = default);
Task Delete(Guid householdId, CancellationToken cancellationToken = default);
Task<bool> IsUserMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
Task AddMember(HouseholdMember member, CancellationToken cancellationToken = default);
Task RemoveMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
Task UpdateMemberRole(Guid householdId, Guid userId, string role, CancellationToken cancellationToken = default);
```

Apply the same pattern to `IStoreRepository`, `IInventoryRepository`, `ITripRepository`, `ITripItemRepository`, `IUserRepository`.

- [ ] **Step 2: Update all repository implementations**

For each implementation, add `CancellationToken cancellationToken = default` to match the interface, then pass `cancellationToken` to every EF Core async call:
- `FindAsync(id, cancellationToken)`
- `FirstOrDefaultAsync(predicate, cancellationToken)`
- `ToListAsync(cancellationToken)`
- `AnyAsync(predicate, cancellationToken)`
- `SaveChangesAsync(cancellationToken)`
- `CountAsync(predicate, cancellationToken)`

- [ ] **Step 3: Build to verify compilation**

Run: `cd backend && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Run data tests**

Run: `cd backend && dotnet test AGDevX.Cart.Data.Tests`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Data/
git commit -m "feat: add CancellationToken to all repository interfaces and implementations"
```

---

### Task 5: Service Interfaces and Implementations

**Files:**
- Modify: `backend/AGDevX.Cart.Services/IHouseholdService.cs` and `HouseholdService.cs`
- Modify: `backend/AGDevX.Cart.Services/IStoreService.cs` and `StoreService.cs`
- Modify: `backend/AGDevX.Cart.Services/IInventoryService.cs` and `InventoryService.cs`
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs` and `TripService.cs`
- Modify: `backend/AGDevX.Cart.Services/ITripItemService.cs` and `TripItemService.cs`
- Modify: `backend/AGDevX.Cart.Auth/IAuthService.cs` and `AuthService.cs`

Same mechanical change as repositories: add `CancellationToken cancellationToken = default` to every async method, forward it to repository calls.

- [ ] **Step 1: Update all service interfaces**

Add `CancellationToken cancellationToken = default` as the last parameter to every `Task<T>` method. Example for `IHouseholdService`:

```csharp
Task<Household> CreateHousehold(Guid userId, string name, CancellationToken cancellationToken = default);
Task<IEnumerable<Household>> GetUserHouseholds(Guid userId, CancellationToken cancellationToken = default);
// ... same for all methods
```

Apply to all 6 service interfaces.

- [ ] **Step 2: Update all service implementations**

Add `CancellationToken cancellationToken = default` to match interfaces. Forward `cancellationToken` to every repository async call:
- `_repository.GetById(id, cancellationToken)`
- `_repository.Create(entity, cancellationToken)`
- `_repository.SaveChangesAsync(cancellationToken)`
- etc.

- [ ] **Step 3: Build to verify compilation**

Run: `cd backend && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Run service tests**

Run: `cd backend && dotnet test AGDevX.Cart.Services.Tests`
Expected: All tests PASS (mocked repositories accept any args)

- [ ] **Step 5: Run auth tests**

Run: `cd backend && dotnet test AGDevX.Cart.Auth.Tests`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Services/ backend/AGDevX.Cart.Auth/
git commit -m "feat: add CancellationToken to all service interfaces and implementations"
```

---

### Task 6: Controller CancellationToken Parameters

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/AuthController.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/HouseholdController.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/StoreController.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripItemController.cs`

`TripEventsController` already has `CancellationToken` — skip it.

- [ ] **Step 1: Add CancellationToken to all controller action methods**

For each async action method, add `CancellationToken cancellationToken = default` as a parameter and forward it to service calls. ASP.NET Core automatically binds the request's cancellation token. Example:

```csharp
[HttpGet]
public async Task<IActionResult> GetUserHouseholds(CancellationToken cancellationToken = default)
{
    try
    {
        var userId = User.GetUserId();
        var households = await _householdService.GetUserHouseholds(userId, cancellationToken);
        return Ok(households);
    }
    // ... existing catch blocks unchanged
}
```

Apply to all action methods in all 6 controllers.

- [ ] **Step 2: Build to verify compilation**

Run: `cd backend && dotnet build`
Expected: Build succeeded

- [ ] **Step 3: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/
git commit -m "feat: add CancellationToken to all controller action methods"
```

---

## Chunk 3: URL Prefix Versioning

### Task 7: Backend Controller Route Updates

**Files:**
- Modify: All 7 controllers in `backend/AGDevX.Cart.Api/Controllers/`

- [ ] **Step 1: Update Route attributes on all controllers**

For each controller, change the `[Route]` attribute:

| File | Change |
|------|--------|
| `AuthController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `HouseholdController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `HouseholdController.cs` | `[HttpPost("/api/households/join")]` → `[HttpPost("/api/v1/households/join")]` |
| `StoreController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `InventoryController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `TripController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `TripItemController.cs` | `[Route("api/[controller]")]` → `[Route("api/v1/[controller]")]` |
| `TripEventsController.cs` | `[Route("api/trips/{tripId}/events")]` → `[Route("api/v1/trips/{tripId}/events")]` |

- [ ] **Step 2: Build to verify compilation**

Run: `cd backend && dotnet build`
Expected: Build succeeded

- [ ] **Step 3: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: All tests PASS (unit tests mock services, don't hit real routes)

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/
git commit -m "feat: migrate all API routes to /api/v1/ prefix"
```

---

### Task 8: Frontend API Path Updates

**Files:**
- Modify: All files in `frontend/src/apis/agdevx-cart-api/` containing `/api/`
- Modify: `frontend/src/auth/auth-provider.tsx`
- Modify: `frontend/src/auth/use-auth.ts`
- Modify: `frontend/src/pages/active-trip-page.tsx`

- [ ] **Step 1: Find all frontend files with `/api/` paths**

Run: `cd frontend && grep -rn "'/api/" src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.'`

This confirms the exact file list from the spec.

- [ ] **Step 2: Update all endpoint paths from `/api/` to `/api/v1/`**

In every file found, replace `/api/` with `/api/v1/` in endpoint path strings. Examples:

- `'/api/auth/login'` → `'/api/v1/auth/login'`
- `'/api/household'` → `'/api/v1/household'`
- `` `/api/tripitem/trip/${tripId}` `` → `` `/api/v1/tripitem/trip/${tripId}` ``
- `` `/api/trips/${tripId}/events` `` → `` `/api/v1/trips/${tripId}/events` `` (in active-trip-page.tsx)

**Do NOT change:**
- Test files (updated in Task 9)
- The Vite proxy config (still matches on `/api` which catches `/api/v1/`)
- `agdevx-cart-api-config.ts` (no base URL to change — just verify)

- [ ] **Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 4: Update Vitest test files that assert on `/api/` paths**

Run: `cd frontend && grep -rn "'/api/" src/ --include='*.test.*' | grep -v node_modules`

Many test files assert on exact URL strings in `apiFetch` mock calls (e.g., `expect(apiFetch).toHaveBeenCalledWith('/api/household/h1', ...)`). Update all `/api/` to `/api/v1/` in these test files too. Files expected in:
- `frontend/src/apis/agdevx-cart-api/auth/tests/`
- `frontend/src/apis/agdevx-cart-api/household/tests/`
- `frontend/src/apis/agdevx-cart-api/inventory/tests/`
- `frontend/src/apis/agdevx-cart-api/store/tests/`
- `frontend/src/apis/agdevx-cart-api/trip/tests/`
- `frontend/src/auth/tests/use-auth.test.ts`
- `frontend/src/auth/tests/auth-provider.test.tsx`

**Do NOT change** `frontend/src/libs/sse-client.test.ts` — it uses generic test URLs, not real endpoint paths.

- [ ] **Step 5: Run frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Run ESLint**

Run: `cd frontend && npx eslint src/`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: update all frontend API paths to /api/v1/"
```

---

### Task 9: Playwright and E2E Test Path Updates

**Files (confirm via grep — only files that actually contain `/api/` paths):**
- Modify: `frontend/e2e/auth.spec.ts` (route mocks with `**/api/auth/login`)
- Modify: `frontend/e2e-integration/auth.integration.spec.ts` (full URLs)
- Modify: `frontend/e2e-integration/helpers/auth-helper.ts` (full URLs)

Note: `e2e/navigation.spec.ts`, `e2e/pwa.spec.ts`, and other e2e-integration files do NOT contain `/api/` paths — skip them.

- [ ] **Step 1: Find all E2E files with `/api/` paths**

Run: `cd frontend && grep -rn "/api/" e2e/ e2e-integration/ --include='*.ts'`

Confirm only the 3 files listed above need changes.

- [ ] **Step 2: Update paths in confirmed files**

Replace `/api/` with `/api/v1/` in the files found. Both patterns:
- Route mocks: `page.route('**/api/auth/login', ...)` → `page.route('**/api/v1/auth/login', ...)`
- Full URLs: `http://localhost:5000/api/auth/register` → `http://localhost:5000/api/v1/auth/register`

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/ frontend/e2e-integration/
git commit -m "feat: update Playwright test API paths to /api/v1/"
```

---

## Final Verification

### Task 10: Full Stack Verification

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: All tests PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 4: Run ESLint**

Run: `cd frontend && npx eslint src/`
Expected: No errors

- [ ] **Step 5: Manual smoke test**

Start both servers:
- Backend: `cd backend && dotnet run --project AGDevX.Cart.Api`
- Frontend: `cd frontend && npm run dev`

Verify:
- Login works at new `/api/v1/auth/login` endpoint
- All CRUD operations work (create household, add items, trips)
- SSE real-time updates work on active trip page
- Scalar docs at `/scalar/v1` show `/api/v1/` routes
- Old `/api/auth/login` returns 404
