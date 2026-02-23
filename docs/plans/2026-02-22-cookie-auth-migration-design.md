# Cookie Auth Migration Design

## Context

The app uses JWT Bearer tokens for authentication. This works for REST API calls but breaks Server-Sent Events (SSE) because the browser's `EventSource` API cannot send custom `Authorization` headers. Converting to cookie-based auth solves this — cookies are sent automatically on all requests, including `EventSource`.

## Approach

Use ASP.NET's built-in `CookieAuthenticationDefaults` scheme. On login/register, call `HttpContext.SignInAsync()` with a `ClaimsPrincipal` containing the same claims used today. The framework handles cookie encryption, signing, and validation automatically.

## CSRF Protection

- `SameSite=Lax` on auth cookie — prevents cross-site POST/PUT/DELETE from including the cookie
- CORS locked to `http://localhost:5173` with `AllowCredentials()` — blocks cross-origin JS requests
- These two layers cover the attack surface for a same-origin SPA

## Backend Changes

### Program.cs

Replace `AddJwtBearer()` with `AddCookie()`:
- `Cookie.Name = ".Cart.Auth"`
- `Cookie.HttpOnly = true`
- `Cookie.SameSite = Lax`
- `Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest` (HTTP in dev, HTTPS in prod)
- `SlidingExpiration = true`
- `ExpireTimeSpan = 30 minutes`
- Return 401 JSON on auth failures (override default redirect behavior for SPA)
- Remove HTTPS redirect in development

### AuthController.cs

- **Login/Register**: Build `ClaimsPrincipal`, call `HttpContext.SignInAsync()`, return user info only (no tokens)
- **Add** `POST /api/auth/logout` → `HttpContext.SignOutAsync()`
- **Add** `GET /api/auth/me` → returns current user from cookie session (for page refresh restoration)
- **Remove** refresh endpoint

### AuthService.cs

- Keep `RegisterAsync` and `LoginAsync` — return user info DTO (no tokens)
- Remove `GenerateToken()`, `ValidateToken()`, `GenerateAuthResponse()`, `RefreshTokenAsync()`
- Service becomes: user lookup + password verification only

### Configuration

Replace `JwtSettings` / `IJwtSettings` with `CookieSettings` / `ICookieSettings`:
- `SessionTimeoutMinutes` (default 30)

### No Changes Required

- `ClaimsPrincipalExtensions.GetUserId()` — works identically with cookie claims
- All `[Authorize]` attributes on controllers
- All repository and service code
- SSE controller — cookie sent automatically by EventSource

## Frontend Changes

### apiFetch()

- Remove `Authorization: Bearer` header injection
- Add `credentials: 'include'` to all fetch calls
- Remove `token` parameter
- Use relative URLs (Vite proxy handles routing)

### sse-client.ts

No change. Already has `withCredentials: true`.

### use-sse.ts

Remove `token` parameter. Simplify signature to `(url, onMessage, enabled)`.

### Auth State (auth-provider, use-auth, auth-atoms)

- Remove `authTokenAtom`
- On mount, call `GET /api/auth/me` to validate session. Populate user state on success, clear on 401.
- `isAuthenticated` checks `currentUserAtom !== null`
- Keep localStorage for user info as fast initial render hint

### Login/Register

- Mutations return user info only (no tokens)
- `setAuth(user)` — no token to store

### Logout

Call `POST /api/auth/logout` (clears cookie server-side), then clear local user state.

### All Query/Mutation Hooks

Remove token passing — `credentials: 'include'` handles auth automatically.

## Integration / Dev Setup

### Vite Proxy

Add proxy config: `/api` → `http://localhost:5000`. This makes all requests same-origin from the browser's perspective, avoiding CORS cookie issues in dev.

### CORS

Keep existing config as fallback for production where frontend/backend may be on different origins.

## Deleted Code

- `GenerateToken()`, `ValidateToken()`, `RefreshTokenAsync()` in AuthService
- `JwtSettings.cs`, `IJwtSettings.cs`
- `authTokenAtom`
- localStorage `authToken` key
- All `Authorization: Bearer` header logic
- `RefreshTokenRequest` DTO
- Refresh endpoint in AuthController
- JWT NuGet references (optional cleanup)

## Test Updates

- Backend: mock `HttpContext.SignInAsync` instead of asserting on token response fields
- Frontend: mock fetch with `credentials: 'include'` instead of Bearer headers
