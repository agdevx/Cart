# Security Hardening Design

## Overview

Harden the AGDevX.Cart application against OWASP top 10 and common web security threats. This covers rate limiting, security headers, global exception handling, DTO validation, production CORS configuration, frontend request timeouts, and security audit logging.

## Current Security Posture

### Already Solid

- **Authentication**: BCrypt password hashing, HttpOnly cookies, SameSite=Lax, 30-min sliding expiration
- **Authorization**: Layered checks at controller and service levels with proper scope validation
- **SQL Injection**: Zero risk — all EF Core parameterized LINQ, no raw SQL
- **XSS**: No `dangerouslySetInnerHTML`, all user input rendered as text via React
- **Data Access**: Full audit trail via BaseEntity, proper cascade rules
- **Dependencies**: All current, no known vulnerabilities
- **Sensitive Data**: No tokens or passwords in localStorage, only user metadata
- **HTTPS**: Enforced in production, development allows HTTP

### Gaps Identified

| Gap | Severity | Status |
|-----|----------|--------|
| No rate limiting | High | Missing |
| No security headers | High | Missing |
| No global exception handler | High | Missing |
| No DTO validation attributes | Medium | Partial |
| CORS hardcoded to localhost | Medium | Partial |
| No frontend request timeout | Medium | Missing |
| No security audit logging | Medium | Missing |

## Design Decisions

- **User enumeration (registration)**: Keep the "email already registered" message for UX. Rate limiting mitigates bulk enumeration.
- **Rate limiting strategy**: Fixed window per IP. Simple, sufficient for this app's threat model.
- **CSRF**: SameSite=Lax + JSON-only APIs provides adequate protection. No explicit CSRF tokens needed.
- **Middleware organization**: Individual files per concern (Approach B) — single responsibility, each file small and focused.

## Component Designs

### 1. Rate Limiting Middleware

**New file:** `backend/AGDevX.Cart.Api/Middleware/RateLimitingExtensions.cs`

Uses ASP.NET Core's built-in `Microsoft.AspNetCore.RateLimiting` with fixed window strategy. Two named policies:

- **`"auth"`** — 5 requests/minute per IP. Applied to auth endpoints (login, register, password change).
- **`"general"`** — 30 requests/minute per IP. Applied globally as the default policy.

When a client exceeds the limit, they receive a `429 Too Many Requests` response with a `Retry-After` header.

**Registration in Program.cs:**

- Custom extension method `builder.Services.AddRateLimiting()` wraps the built-in `AddRateLimiter()` to encapsulate policy configuration
- `app.UseRateLimiter()` placed before auth middleware in the pipeline
- Auth controller endpoints decorated with `[EnableRateLimiting("auth")]`
- **CORS preflight**: OPTIONS requests are excluded from rate limiting to prevent browsers from seeing CORS errors instead of 429 responses

### 2. Security Headers Middleware

**New file:** `backend/AGDevX.Cart.Api/Middleware/SecurityHeadersMiddleware.cs`

Adds headers to every response:

- `X-Content-Type-Options: nosniff` — prevents MIME type sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'` — restricts resource loading. `'unsafe-inline'` for styles is required because Tailwind CSS injects inline styles for utility classes.
- `X-XSS-Protection: 0` — disabled (modern browsers handle this via CSP; the old header can introduce vulnerabilities)

Includes an extension method `app.UseSecurityHeaders()` for clean registration.

**Development mode**: Security headers are applied in all environments. CSP `connect-src 'self'` works correctly in development because the Vite proxy forwards `/api` requests to the backend on the same origin — the browser never makes cross-origin API calls. Note: Vite's HMR WebSocket connection (`ws://localhost:*`) will trigger CSP violations in the browser console during development. These are harmless — HMR still works because WebSocket connections are already established before CSP headers arrive from the backend. No development-specific CSP relaxation is needed.

**HSTS** uses ASP.NET Core's built-in `app.UseHsts()`, added to the non-development pipeline block alongside the existing `UseHttpsRedirection()`.

**Registration in Program.cs:**

- `app.UseSecurityHeaders()` placed early in the pipeline (before routing)
- `app.UseHsts()` added in the production block

### 3. Global Exception Handler Middleware

**New file:** `backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs`

Wraps the entire pipeline in a try-catch. If an unhandled exception escapes all controller-level catches:

- Logs the full exception via `ILogger`
- Returns a generic `500` response: `{ "errorCode": "SERVER_ERROR", "message": "An unexpected error occurred." }`
- Never leaks stack traces, exception types, or internal details to the client

Matches the existing error response format used across all controllers (`errorCode` + `message`).

**Registration in Program.cs:**

- `app.UseGlobalExceptionHandler()` placed first in the pipeline — before security headers, rate limiting, and everything else

### 4. DTO Validation Attributes

#### Existing DTOs — Add Validation Attributes

| DTO | Field | Validations |
|-----|-------|-------------|
| `LoginRequest` | Email | `[Required]`, `[EmailAddress]` |
| `LoginRequest` | Password | `[Required]` |
| `RegisterRequest` | Email | `[Required]`, `[EmailAddress]`, `[MaxLength(254)]` |
| `RegisterRequest` | Password | `[Required]`, `[MinLength(8)]`, `[MaxLength(128)]` |
| `RegisterRequest` | Name | `[Required]`, `[MaxLength(64)]` |
| `ChangePasswordRequest` | CurrentPassword | `[Required]` |
| `ChangePasswordRequest` | NewPassword | `[Required]`, `[MinLength(8)]`, `[MaxLength(128)]` |
| `UpdateProfileRequest` | Name | `[Required]`, `[MaxLength(64)]` |
| `UpdateProfileRequest` | Email | `[Required]`, `[EmailAddress]`, `[MaxLength(254)]` |
| `UpdateProfileRequest` | CurrentPassword | No attributes (nullable — required only when email changes, validated in service layer) |
| `CreateTripRequest` | Name | `[Required]` |
| `CreateTripRequest` | HouseholdId | No attributes (intentionally optional — `Guid?`, null means personal trip) |
| `UpdateTripRequest` | Name | `[Required]` |
| `UpdateTripRequest` | HouseholdId | No attributes (intentionally optional — `Guid?`, null means personal trip) |
| `AddCollaboratorRequest` | UserId | Change to `Guid?` with `[Required]` (non-nullable `Guid` defaults to `Guid.Empty`, making `[Required]` ineffective) |

#### New Request DTOs

Controllers currently accepting entity models, raw values, or query parameters directly need proper request DTOs:

- **`CreateStoreRequest`** — `Name` (`[Required]`, `[MaxLength(100)]`), `HouseholdId` (`Guid?`, optional). Replaces `[FromBody] Store` in StoreController.
- **`UpdateStoreRequest`** — `Name` (`[Required]`, `[MaxLength(100)]`), `HouseholdId` (`Guid?`, optional). Replaces `[FromBody] Store` in StoreController.
- **`CreateInventoryItemRequest`** — `Name` (`[Required]`, `[MaxLength(200)]`), `HouseholdId` (`Guid?`, optional). Replaces `[FromBody] InventoryItem` in InventoryController.
- **`UpdateInventoryItemRequest`** — `Name` (`[Required]`, `[MaxLength(200)]`), `HouseholdId` (`Guid?`, optional). Replaces `[FromBody] InventoryItem` in InventoryController.
- **`CreateHouseholdRequest`** — `Name` (`[Required]`, `[MaxLength(100)]`). Replaces `[FromBody] string` in HouseholdController.
- **`UpdateHouseholdRequest`** — `Name` (`[Required]`, `[MaxLength(100)]`). Replaces `[FromBody] string` in HouseholdController.
- **`AddTripItemRequest`** — `InventoryItemId` (`Guid`, `[Required]`), `Quantity` (`int`, `[Range(1, int.MaxValue)]`), `Notes` (`string?`, `[MaxLength(500)]`), `StoreId` (`Guid?`, optional). The `TripId` moves to a route parameter (`[HttpPost("trip/{tripId}")]`) following REST convention — resource identifiers belong in the URL, not the body. Replaces `[FromQuery]` parameters in TripItemController. **Note:** This is a breaking API change. The frontend mutation must be updated to send a JSON body instead of query parameters.
- **`UpdateTripItemRequest`** — `Quantity` (`int`, `[Range(1, int.MaxValue)]`), `Notes` (`string?`, `[MaxLength(500)]`), `StoreId` (`Guid?`, optional). Replaces `[FromQuery]` parameters in TripItemController. Same `[FromBody]` breaking change as above. **Note:** The frontend's `UpdateTripItemRequest` interface retains `tripId` for TanStack Query cache invalidation in `onSuccess` — this is a frontend-only field, not sent to the backend.

**Existing inline DTOs in HouseholdController** (`JoinHouseholdRequest`, `TransferOwnershipRequest`): Move from inline records to classes in the shared DTOs folder for consistency with other DTOs, and add validation attributes:
- `JoinHouseholdRequest` — `InviteCode` (`[Required]`, `[MaxLength(8)]`)
- `TransferOwnershipRequest` — `UserId` (change to `Guid?` with `[Required]`, same pattern as `AddCollaboratorRequest`)

**Note on `AddCollaboratorRequest`**: This DTO already exists in `AGDevX.Cart.Shared/DTOs/`. Only the type change (`Guid` → `Guid?`) and `[Required]` attribute are needed — no new file.

Controllers map from DTOs to domain models. All new DTOs use `[FromBody]`.

#### Validation Error Response Format

ASP.NET Core's `[ApiController]` attribute (already on all controllers) automatically returns `400 Bad Request` with a `ValidationProblemDetails` response for invalid model state — this fires before the action method executes. This format differs from the `{ errorCode, message }` pattern used in service-level error responses. **Design decision:** Accept this difference. Validation errors (malformed input) and business errors (duplicate name, unauthorized) are fundamentally different categories. `ValidationProblemDetails` is a standard format that includes per-field error details, which is more useful for form validation. The frontend should handle both response shapes — `ValidationProblemDetails` for 400s from model validation, and `{ errorCode, message }` for 4xx/5xx from business logic.

### 5. Production CORS Configuration

**New files:** `backend/AGDevX.Cart.Shared/Configuration/CorsSettings.cs` and `backend/AGDevX.Cart.Shared/Configuration/ICorsSettings.cs`

Follows the existing `ICookieSettings` / `CookieSettings` pattern with an interface and implementation class.

**Changes:**

- **`appsettings.Development.json`** — `"CorsSettings": { "AllowedOrigins": ["http://localhost:5173"] }`
- **`appsettings.json`** — `"CorsSettings": { "AllowedOrigins": [] }` (empty default — intentionally fail-closed. Production deployments must populate this via environment-specific config or environment variables, otherwise all cross-origin requests will be silently rejected.)
- **Program.cs** — reads `CorsSettings` from config and uses `policy.WithOrigins(corsSettings.AllowedOrigins)`

### 6. Frontend Request Timeout

**Changes to:** `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`

Adds an `AbortController` with a 15-second timeout to `apiFetch()`:

- Creates an `AbortController` and `setTimeout` to abort after 15 seconds
- Passes `signal` to the `fetch` call
- Cleans up the timeout on completion (success or failure)
- Throws `"Request timed out"` on abort — distinct from network errors

No conflict with TanStack Query — the timeout lives inside `apiFetch()`. From TQ's perspective, a timeout is just a rejected promise that triggers its retry logic. A stalled query would: attempt (15s) → fail → retry (15s) → fail → surface error (30s worst case).

TanStack Query's own `AbortSignal` (for cancellation on unmount/key change) is a separate concern that can be combined with this timeout in a future TQ resilience pass.

### 7. Security Audit Logging

**New file:** `backend/AGDevX.Cart.Shared/Security/SecurityAuditLogger.cs`

Lives in the Shared project so it can be injected into both the Auth service layer and API controllers. Registered as a scoped service (must match the scoped lifetime of services like `AuthService` that depend on it). Uses `IHttpContextAccessor` (already registered as singleton) for IP extraction.

A thin wrapper around `ILogger` that standardizes security event logging.

**Events logged (Moderate tier):**

| Event | Log Level | Data Captured |
|-------|-----------|---------------|
| Failed login attempt | Warning | Email (masked), IP, timestamp |
| Successful account creation | Information | Email (masked), IP, timestamp |
| Password change | Information | UserId, IP, timestamp |
| Email change | Information | UserId, old email (masked), IP, timestamp |
| Failed authorization | Warning | UserId, resource type, IP, timestamp |

**Email masking:** `a****@example.com` — enough to identify patterns without exposing full addresses in logs.

**IP extraction:** From `HttpContext.Connection.RemoteIpAddress`, with `X-Forwarded-For` awareness for reverse proxy scenarios.

**Where the logging calls go:**

- `AuthService` — login failures, registrations, password/email changes (injected via constructor)
- All controllers that catch `UnauthorizedAccessException` — failed authorization (injected via constructor). These catch blocks currently return `401 Unauthorized`. The "Failed authorization" event covers both 401 (identity-level) and any future 403 (permission-level) responses from controller catch blocks.

No changes to existing error responses or control flow — logging statements added alongside existing logic.

## Pipeline Order

The final HTTP pipeline in Program.cs:

```
1. GlobalExceptionHandler  (catches everything)
2. SecurityHeaders          (adds headers to all responses)
3. HSTS + HttpsRedirection  (production only)
4. CORS                     (must come before RateLimiter so 429 responses include CORS headers)
5. RateLimiter              (before auth to protect login)
6. Authentication           (existing)
7. Authorization            (existing)
8. Controllers              (existing)
```

**Why CORS before RateLimiter:** If rate limiting returns a 429 without CORS headers, browsers will report a network/CORS error instead of exposing the 429 status to JavaScript. Placing CORS first ensures all responses — including 429s — have proper `Access-Control-Allow-Origin` headers.

## Testing Strategy

- **Rate limiting**: Integration tests verifying 429 responses after exceeding limits
- **Security headers**: Integration test verifying all expected headers present on responses
- **Global exception handler**: Unit test verifying generic 500 response and no info leakage
- **DTO validation**: Unit tests for each DTO's validation rules; integration tests verifying 400 responses for invalid input
- **CORS**: Integration test verifying correct origins in different configurations
- **Frontend timeout**: Unit test mocking a slow fetch and verifying abort behavior
- **Audit logging**: Unit tests verifying log output for each event type

## Out of Scope

- CSRF token implementation (SameSite + JSON APIs is sufficient)
- OAuth2 / API key support
- Web Application Firewall (WAF)
- Penetration testing
- Encrypted localStorage (not needed — no sensitive data stored)
