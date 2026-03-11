# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden AGDevX.Cart against OWASP top 10 threats with rate limiting, security headers, global exception handling, DTO validation, production CORS config, frontend request timeouts, and security audit logging.

**Architecture:** Individual middleware files per concern in `backend/AGDevX.Cart.Api/Middleware/`. New request DTOs in `backend/AGDevX.Cart.Shared/DTOs/`. Configuration classes in `backend/AGDevX.Cart.Shared/Configuration/`. Security audit logger in `backend/AGDevX.Cart.Shared/Security/`. Frontend timeout in `apiFetch()` wrapper.

**Tech Stack:** ASP.NET Core 10 (rate limiting, middleware), EF Core, System.ComponentModel.DataAnnotations, React/TypeScript, TanStack Query, Vitest

**Spec:** `docs/superpowers/specs/2026-03-10-security-hardening-design.md`

---

## Chunk 1: Backend Middleware & Pipeline

### Task 1: Global Exception Handler Middleware

**Files:**
- Create: `backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs`
- Test: `backend/AGDevX.Cart.Api.Tests/Middleware/GlobalExceptionMiddlewareTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
// backend/AGDevX.Cart.Api.Tests/Middleware/GlobalExceptionMiddlewareTests.cs
// ABOUTME: Tests for global exception handler middleware
// ABOUTME: Verifies unhandled exceptions return safe 500 responses without leaking details

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using AGDevX.Cart.Api.Middleware;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class GlobalExceptionMiddlewareTests
{
    [Fact]
    public async Task Should_return_500_with_generic_message_when_unhandled_exception_occurs()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            next: _ => throw new InvalidOperationException("Secret database error details"),
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(500, context.Response.StatusCode);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var json = JsonDocument.Parse(body);
        Assert.Equal("SERVER_ERROR", json.RootElement.GetProperty("errorCode").GetString());
        Assert.Equal("An unexpected error occurred.", json.RootElement.GetProperty("message").GetString());
        Assert.False(body.Contains("Secret database error details"));
    }

    [Fact]
    public async Task Should_pass_through_when_no_exception()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            next: ctx => { ctx.Response.StatusCode = 200; return Task.CompletedTask; },
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(200, context.Response.StatusCode);
    }

    [Fact]
    public async Task Should_log_the_exception()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var exception = new InvalidOperationException("Test error");
        var middleware = new GlobalExceptionMiddleware(
            next: _ => throw exception,
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        logger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => true),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "GlobalExceptionMiddlewareTests" -v n`
Expected: Build error — `GlobalExceptionMiddleware` does not exist

- [ ] **Step 3: Write the implementation**

```csharp
// backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs
// ABOUTME: Catches unhandled exceptions and returns a safe 500 response
// ABOUTME: Logs the full exception for debugging without leaking details to the client

using System.Text.Json;

namespace AGDevX.Cart.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new { errorCode = "SERVER_ERROR", message = "An unexpected error occurred." };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionMiddleware>();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "GlobalExceptionMiddlewareTests" -v n`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Middleware/GlobalExceptionMiddleware.cs backend/AGDevX.Cart.Api.Tests/Middleware/GlobalExceptionMiddlewareTests.cs
git commit -m "feat: add global exception handler middleware"
```

---

### Task 2: Security Headers Middleware

**Files:**
- Create: `backend/AGDevX.Cart.Api/Middleware/SecurityHeadersMiddleware.cs`
- Test: `backend/AGDevX.Cart.Api.Tests/Middleware/SecurityHeadersMiddlewareTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
// backend/AGDevX.Cart.Api.Tests/Middleware/SecurityHeadersMiddlewareTests.cs
// ABOUTME: Tests for security headers middleware
// ABOUTME: Verifies all required security headers are added to responses

using AGDevX.Cart.Api.Middleware;
using Microsoft.AspNetCore.Http;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task Should_add_all_security_headers()
    {
        var middleware = new SecurityHeadersMiddleware(
            next: ctx => Task.CompletedTask);

        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"]);
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("0", context.Response.Headers["X-XSS-Protection"]);
        Assert.Contains("default-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("script-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("font-src 'self' https://fonts.gstatic.com", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("img-src 'self' data:", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("connect-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
    }

    [Fact]
    public async Task Should_call_next_middleware()
    {
        var nextCalled = false;
        var middleware = new SecurityHeadersMiddleware(
            next: ctx => { nextCalled = true; return Task.CompletedTask; });

        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "SecurityHeadersMiddlewareTests" -v n`
Expected: Build error — `SecurityHeadersMiddleware` does not exist

- [ ] **Step 3: Write the implementation**

```csharp
// backend/AGDevX.Cart.Api/Middleware/SecurityHeadersMiddleware.cs
// ABOUTME: Adds security headers to all HTTP responses
// ABOUTME: Includes CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and X-XSS-Protection

namespace AGDevX.Cart.Api.Middleware;

public class SecurityHeadersMiddleware(RequestDelegate next)
{
    private const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data:; " +
        "connect-src 'self'";

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        context.Response.Headers["X-XSS-Protection"] = "0";
        context.Response.Headers["Content-Security-Policy"] = ContentSecurityPolicy;

        await next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.UseMiddleware<SecurityHeadersMiddleware>();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "SecurityHeadersMiddlewareTests" -v n`
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Middleware/SecurityHeadersMiddleware.cs backend/AGDevX.Cart.Api.Tests/Middleware/SecurityHeadersMiddlewareTests.cs
git commit -m "feat: add security headers middleware"
```

---

### Task 3: Rate Limiting Configuration

**Files:**
- Create: `backend/AGDevX.Cart.Api/Middleware/RateLimitingExtensions.cs`
- Test: `backend/AGDevX.Cart.Api.Tests/Middleware/RateLimitingExtensionsTests.cs`
- Modify: `backend/AGDevX.Cart.Api/Controllers/AuthController.cs:15-17` — add `[EnableRateLimiting("auth")]` to register, login, password endpoints

- [ ] **Step 1: Write the failing test**

```csharp
// backend/AGDevX.Cart.Api.Tests/Middleware/RateLimitingExtensionsTests.cs
// ABOUTME: Tests for rate limiting configuration
// ABOUTME: Verifies rate limit policies are registered and enforce correct limits

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AGDevX.Cart.Api.Middleware;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class RateLimitingExtensionsTests
{
    private static async Task<IHost> CreateTestHost()
    {
        return await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder.UseTestServer();
                webBuilder.ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddRateLimiting();
                });
                webBuilder.Configure(app =>
                {
                    app.UseRouting();
                    app.UseRateLimiter();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapGet("/auth-test", async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        }).RequireRateLimiting("auth");

                        endpoints.MapGet("/general-test", async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        });

                        endpoints.MapMethods("/options-test", new[] { "OPTIONS" }, async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        });
                    });
                });
            })
            .StartAsync();
    }

    [Fact]
    public async Task Auth_policy_should_return_429_after_exceeding_limit()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Auth policy allows 5 requests per minute per IP
        for (var i = 0; i < 5; i++)
        {
            var response = await client.GetAsync("/auth-test");
            Assert.Equal(200, (int)response.StatusCode);
        }

        // 6th request should be rate limited
        var limitedResponse = await client.GetAsync("/auth-test");
        Assert.Equal(429, (int)limitedResponse.StatusCode);
    }

    [Fact]
    public async Task General_policy_should_return_429_after_exceeding_limit()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Global limiter allows 30 requests per minute per IP
        for (var i = 0; i < 30; i++)
        {
            var response = await client.GetAsync("/general-test");
            Assert.Equal(200, (int)response.StatusCode);
        }

        // 31st request should be rate limited
        var limitedResponse = await client.GetAsync("/general-test");
        Assert.Equal(429, (int)limitedResponse.StatusCode);
    }

    [Fact]
    public async Task Options_preflight_should_not_be_rate_limited()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Send more than 30 OPTIONS requests — none should be rate limited
        for (var i = 0; i < 35; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Options, "/options-test");
            var response = await client.SendAsync(request);
            Assert.Equal(200, (int)response.StatusCode);
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "RateLimitingExtensionsTests" -v n`
Expected: Build error — `AddRateLimiting` does not exist

- [ ] **Step 3: Write the implementation**

```csharp
// backend/AGDevX.Cart.Api/Middleware/RateLimitingExtensions.cs
// ABOUTME: Configures rate limiting with auth and general policies
// ABOUTME: Auth: 5 req/min per IP for login/register. General: 30 req/min per IP for all endpoints.

using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace AGDevX.Cart.Api.Middleware;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.Headers["Retry-After"] = "60";
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { errorCode = "RATE_LIMITED", message = "Too many requests. Please try again later." },
                    cancellationToken);
            };

            //== Auth endpoints: 5 requests per minute per IP
            options.AddPolicy("auth", context =>
            {
                var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"auth_{remoteIp}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });

            //== General: 30 requests per minute per IP (default policy)
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                //== Exclude CORS preflight requests from rate limiting
                if (context.Request.Method == HttpMethods.Options)
                {
                    return RateLimitPartition.GetNoLimiter("options");
                }

                var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(remoteIp, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 30,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });
        });

        return services;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "RateLimitingExtensionsTests" -v n`
Expected: 3 tests pass

- [ ] **Step 5: Add `[EnableRateLimiting("auth")]` to AuthController**

Modify `backend/AGDevX.Cart.Api/Controllers/AuthController.cs`:
- Add `using Microsoft.AspNetCore.RateLimiting;` to imports
- Add `[EnableRateLimiting("auth")]` attribute to `Register`, `Login`, and `ChangePassword` methods

- [ ] **Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Api/Middleware/RateLimitingExtensions.cs backend/AGDevX.Cart.Api.Tests/Middleware/RateLimitingExtensionsTests.cs backend/AGDevX.Cart.Api/Controllers/AuthController.cs
git commit -m "feat: add rate limiting with auth and general policies"
```

---

### Task 4: Production CORS Configuration

**Files:**
- Create: `backend/AGDevX.Cart.Shared/Configuration/ICorsSettings.cs`
- Create: `backend/AGDevX.Cart.Shared/Configuration/CorsSettings.cs`
- Modify: `backend/AGDevX.Cart.Api/Program.cs:22-31` — use config-driven origins
- Modify: `backend/AGDevX.Cart.Api/appsettings.json` — add CorsSettings section
- Modify: `backend/AGDevX.Cart.Api/appsettings.Development.json` — add CorsSettings with localhost

- [ ] **Step 1: Create ICorsSettings interface**

```csharp
// backend/AGDevX.Cart.Shared/Configuration/ICorsSettings.cs
// ABOUTME: Interface defining CORS configuration settings.
// ABOUTME: Used for dependency injection and configuration binding.

namespace AGDevX.Cart.Shared.Configuration;

public interface ICorsSettings
{
    string[] AllowedOrigins { get; }
}
```

- [ ] **Step 2: Create CorsSettings implementation**

```csharp
// backend/AGDevX.Cart.Shared/Configuration/CorsSettings.cs
// ABOUTME: Implementation of CORS configuration settings bound from appSettings.json.
// ABOUTME: Provides empty default for fail-closed behavior in production.

namespace AGDevX.Cart.Shared.Configuration;

public class CorsSettings : ICorsSettings
{
    public string[] AllowedOrigins { get; set; } = [];
}
```

- [ ] **Step 3: Update appsettings.json**

Add to `backend/AGDevX.Cart.Api/appsettings.json`:
```json
"CorsSettings": {
  "AllowedOrigins": []
}
```

- [ ] **Step 4: Update appsettings.Development.json**

Add to `backend/AGDevX.Cart.Api/appsettings.Development.json`:
```json
"CorsSettings": {
  "AllowedOrigins": ["http://localhost:5173"]
}
```

- [ ] **Step 5: Update Program.cs CORS configuration**

Replace the hardcoded CORS block (lines 22-31) in `backend/AGDevX.Cart.Api/Program.cs` with:
```csharp
//== CORS Configuration
var corsSettings = builder.Configuration.GetSection("CorsSettings").Get<CorsSettings>()
    ?? new CorsSettings();
builder.Services.AddSingleton<ICorsSettings>(corsSettings);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsSettings.AllowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

Add `using AGDevX.Cart.Shared.Configuration;` if not already present (it is — for `CookieSettings`).

- [ ] **Step 6: Write a test for CorsSettings configuration binding**

```csharp
// backend/AGDevX.Cart.Api.Tests/Configuration/CorsSettingsTests.cs
// ABOUTME: Tests for CORS settings configuration binding
// ABOUTME: Verifies CorsSettings binds correctly from configuration

using AGDevX.Cart.Shared.Configuration;
using Microsoft.Extensions.Configuration;

namespace AGDevX.Cart.Api.Tests.Configuration;

public class CorsSettingsTests
{
    [Fact]
    public void Should_bind_allowed_origins_from_configuration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CorsSettings:AllowedOrigins:0"] = "http://localhost:5173",
                ["CorsSettings:AllowedOrigins:1"] = "https://example.com",
            })
            .Build();

        var settings = config.GetSection("CorsSettings").Get<CorsSettings>()!;

        Assert.Equal(2, settings.AllowedOrigins.Length);
        Assert.Equal("http://localhost:5173", settings.AllowedOrigins[0]);
        Assert.Equal("https://example.com", settings.AllowedOrigins[1]);
    }

    [Fact]
    public void Should_default_to_empty_array()
    {
        var settings = new CorsSettings();
        Assert.Empty(settings.AllowedOrigins);
    }
}
```

- [ ] **Step 7: Run CORS tests**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "CorsSettingsTests" -v n`
Expected: 2 tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/AGDevX.Cart.Shared/Configuration/ICorsSettings.cs backend/AGDevX.Cart.Shared/Configuration/CorsSettings.cs backend/AGDevX.Cart.Api/appsettings.json backend/AGDevX.Cart.Api/appsettings.Development.json backend/AGDevX.Cart.Api/Program.cs backend/AGDevX.Cart.Api.Tests/Configuration/CorsSettingsTests.cs
git commit -m "feat: make CORS configuration environment-driven"
```

---

### Task 5: Wire Middleware into Program.cs Pipeline

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs:85-111` — add service registrations and pipeline ordering

- [ ] **Step 1: Add rate limiting service registration**

In `backend/AGDevX.Cart.Api/Program.cs`, after the CORS configuration block, add:
```csharp
//== Rate Limiting Configuration
builder.Services.AddRateLimiting();
```

Add `using AGDevX.Cart.Api.Middleware;` to imports.

- [ ] **Step 2: Reorder the HTTP pipeline**

Replace the pipeline section (lines 94-109) with:
```csharp
//== HTTP Pipeline Configuration

//== Global exception handler (catches everything — must be first)
app.UseGlobalExceptionHandler();

//== Security headers on all responses
app.UseSecurityHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

//== CORS before rate limiter so 429 responses include CORS headers
app.UseCors();

//== Rate limiting
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

//== API Endpoints
app.MapControllers();

app.Run();
```

Note: `app.Run()` must remain at the end — do not accidentally delete it when replacing the pipeline.

- [ ] **Step 3: Verify the app builds**

Run: `cd backend && dotnet build`
Expected: Build succeeds

- [ ] **Step 4: Run existing test suite to check for regressions**

Run: `cd backend && dotnet test -v n`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Program.cs
git commit -m "feat: wire security middleware into HTTP pipeline"
```

---

## Chunk 2: DTO Validation & Controller Updates

### Task 6: Add Validation Attributes to Existing DTOs

**Files:**
- Modify: `backend/AGDevX.Cart.Shared/DTOs/LoginRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/RegisterRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/ChangePasswordRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateProfileRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/AddCollaboratorRequest.cs`

- [ ] **Step 1: Update LoginRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/LoginRequest.cs
// ABOUTME: This file defines the LoginRequest DTO used for user authentication.
// ABOUTME: Contains Email and Password properties for login operations.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Update RegisterRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/RegisterRequest.cs
// ABOUTME: This file defines the RegisterRequest DTO used for user registration.
// ABOUTME: Contains Email, Password, and Name properties for creating new user accounts.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;
}
```

- [ ] **Step 3: Update ChangePasswordRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/ChangePasswordRequest.cs
// ABOUTME: DTO for changing a user's password.
// ABOUTME: Requires current password verification before accepting the new password.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
}
```

- [ ] **Step 4: Update UpdateProfileRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateProfileRequest.cs
// ABOUTME: DTO for updating user profile (name and email).
// ABOUTME: CurrentPassword is required only when email is being changed.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateProfileRequest
{
    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    // Nullable — required only when email changes, validated in service layer
    public string? CurrentPassword { get; set; }
}
```

- [ ] **Step 5: Update CreateTripRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs
// ABOUTME: This file defines the CreateTripRequest DTO used for creating new trips.
// ABOUTME: Contains Name and optional HouseholdId properties for trip creation operations.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    // Intentionally optional — null means personal trip
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 6: Update UpdateTripRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs
// ABOUTME: DTO for updating trip properties
// ABOUTME: Supports renaming trips and changing scope (personal/household)
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    // Intentionally optional — null means personal trip
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 7: Update AddCollaboratorRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/AddCollaboratorRequest.cs
// ABOUTME: This file defines the AddCollaboratorRequest DTO used for adding collaborators to trips.
// ABOUTME: Contains UserId property to specify the user being added as a collaborator.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class AddCollaboratorRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? UserId { get; set; }
}
```

**Note:** The `Guid` → `Guid?` change on `AddCollaboratorRequest.UserId` requires updating `TripController` where it accesses `request.UserId` — it will now need `request.UserId.Value` or a null check. Find and update all usages.

- [ ] **Step 8: Verify the backend builds**

Run: `cd backend && dotnet build`
Expected: Build succeeds (may need to fix `UserId` usage in TripController)

- [ ] **Step 9: Commit**

```bash
git add backend/AGDevX.Cart.Shared/DTOs/
git commit -m "feat: add validation attributes to existing DTOs"
```

---

### Task 7: Create New Request DTOs (Store, Inventory, Household)

**Files:**
- Create: `backend/AGDevX.Cart.Shared/DTOs/CreateStoreRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateStoreRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/CreateInventoryItemRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateInventoryItemRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/CreateHouseholdRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateHouseholdRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/JoinHouseholdRequest.cs` (moved from HouseholdController inline)
- Modify: `backend/AGDevX.Cart.Shared/DTOs/TransferOwnershipRequest.cs` (moved from HouseholdController inline)

- [ ] **Step 1: Create CreateStoreRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/CreateStoreRequest.cs
// ABOUTME: DTO for creating a new store.
// ABOUTME: Contains Name and optional HouseholdId for personal or household scope.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateStoreRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Null means personal store
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 2: Create UpdateStoreRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateStoreRequest.cs
// ABOUTME: DTO for updating an existing store.
// ABOUTME: Contains Name and optional HouseholdId for scope changes.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateStoreRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Null means personal store
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 3: Create CreateInventoryItemRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/CreateInventoryItemRequest.cs
// ABOUTME: DTO for creating a new inventory item.
// ABOUTME: Contains Name and optional HouseholdId for personal or household scope.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Null means personal item
    public Guid? HouseholdId { get; set; }

    public Guid? DefaultStoreId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
```

- [ ] **Step 4: Create UpdateInventoryItemRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateInventoryItemRequest.cs
// ABOUTME: DTO for updating an existing inventory item.
// ABOUTME: Contains fields that the client can modify on an inventory item.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Null means personal item
    public Guid? HouseholdId { get; set; }

    public Guid? DefaultStoreId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
```

- [ ] **Step 5: Create CreateHouseholdRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/CreateHouseholdRequest.cs
// ABOUTME: DTO for creating a new household.
// ABOUTME: Contains Name for the household.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateHouseholdRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
```

- [ ] **Step 6: Create UpdateHouseholdRequest**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateHouseholdRequest.cs
// ABOUTME: DTO for updating an existing household.
// ABOUTME: Contains Name for renaming the household.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateHouseholdRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
```

- [ ] **Step 7: Move JoinHouseholdRequest to shared DTOs**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/JoinHouseholdRequest.cs
// ABOUTME: DTO for joining a household via invite code.
// ABOUTME: Contains InviteCode for household membership.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class JoinHouseholdRequest
{
    [Required]
    [MaxLength(8)]
    public string InviteCode { get; set; } = string.Empty;
}
```

- [ ] **Step 8: Move TransferOwnershipRequest to shared DTOs**

```csharp
// backend/AGDevX.Cart.Shared/DTOs/TransferOwnershipRequest.cs
// ABOUTME: DTO for transferring household ownership to another member.
// ABOUTME: Contains UserId of the new owner.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class TransferOwnershipRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? UserId { get; set; }
}
```

- [ ] **Step 9: Verify the backend builds**

Run: `cd backend && dotnet build`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add backend/AGDevX.Cart.Shared/DTOs/
git commit -m "feat: create request DTOs for stores, inventory, households, and trip items"
```

---

### Task 8: Update Controllers to Use New DTOs

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/StoreController.cs:72-113` — use CreateStoreRequest/UpdateStoreRequest
- Modify: `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs:104-137` — use CreateInventoryItemRequest/UpdateInventoryItemRequest
- Modify: `backend/AGDevX.Cart.Api/Controllers/HouseholdController.cs:1-20,67-99,122-143,187-203` — remove inline DTOs, use shared DTOs
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripItemController.cs:55-101` — use AddTripItemRequest/UpdateTripItemRequest with [FromBody]

- [ ] **Step 1: Update StoreController**

In `backend/AGDevX.Cart.Api/Controllers/StoreController.cs`:
- Add `using AGDevX.Cart.Shared.DTOs;` import
- Change `Create([FromBody] Store store)` to `Create([FromBody] CreateStoreRequest request)` and map fields to a `Store` entity
- Change `Update(Guid id, [FromBody] Store store)` to `Update(Guid id, [FromBody] UpdateStoreRequest request)` and update `storeService.UpdateStore(id, request.Name, request.HouseholdId, userId)`
- Remove `using AGDevX.Cart.Data.Models;` if no longer needed (still needed for `Store` return type from service)

```csharp
//== Create a new store
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateStoreRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var store = new Store { Name = request.Name, HouseholdId = request.HouseholdId };
        var created = await storeService.CreateStore(store, userId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
    }
}

//== Update an existing store
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStoreRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await storeService.UpdateStore(id, request.Name, request.HouseholdId, userId);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

- [ ] **Step 2: Update InventoryController**

In `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs`:
- Add `using AGDevX.Cart.Shared.DTOs;` import
- Change `Create([FromBody] InventoryItem item)` to `Create([FromBody] CreateInventoryItemRequest request)` and map to `InventoryItem`
- Change `Update(Guid id, [FromBody] InventoryItem item)` to `Update(Guid id, [FromBody] UpdateInventoryItemRequest request)` and map to `InventoryItem`

```csharp
//== Create a new inventory item
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateInventoryItemRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var item = new InventoryItem
        {
            Name = request.Name,
            HouseholdId = request.HouseholdId,
            DefaultStoreId = request.DefaultStoreId,
            Notes = request.Notes,
        };
        var created = await inventoryService.CreateInventoryItem(item, userId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
}

//== Update an existing inventory item
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInventoryItemRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var item = new InventoryItem
        {
            Id = id,
            Name = request.Name,
            HouseholdId = request.HouseholdId,
            DefaultStoreId = request.DefaultStoreId,
            Notes = request.Notes,
        };
        await inventoryService.UpdateInventoryItem(item, userId);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

- [ ] **Step 3: Update HouseholdController**

In `backend/AGDevX.Cart.Api/Controllers/HouseholdController.cs`:
- Remove the inline `JoinHouseholdRequest` and `TransferOwnershipRequest` records (lines 12-20)
- Add `using AGDevX.Cart.Shared.DTOs;` import
- Update method signatures and usages as shown below:

```csharp
//== Create a new household
[HttpPost]
public async Task<IActionResult> CreateHousehold([FromBody] CreateHouseholdRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var created = await householdService.CreateHousehold(userId, request.Name);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
}

//== Update an existing household
[HttpPut("{id}")]
public async Task<IActionResult> UpdateHousehold(Guid id, [FromBody] UpdateHouseholdRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await householdService.UpdateHousehold(userId, id, request.Name);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}

//== Transfer household ownership
[HttpPut("{id}/owner")]
public async Task<IActionResult> TransferOwnership(Guid id, [FromBody] TransferOwnershipRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await householdService.TransferOwnership(userId, id, request.UserId!.Value);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { errorCode = "INVALID_REQUEST", message = ex.Message });
    }
}
```

The `JoinHousehold` method's signature stays the same (it already uses `JoinHouseholdRequest`) — just update the import to pull from `AGDevX.Cart.Shared.DTOs` instead of the inline record.

- [ ] **Step 4: Update TripItemController — breaking API change**

In `backend/AGDevX.Cart.Api/Controllers/TripItemController.cs`:
- Add `using AGDevX.Cart.Shared.DTOs;` import
- Change `Add` from `[HttpPost]` with `[FromQuery]` params to `[HttpPost("trip/{tripId}")]` with `[FromBody] AddTripItemRequest request`
- Change `Update` from `[HttpPut("{id}")]` with `[FromQuery]` params to `[HttpPut("{id}")]` with `[FromBody] UpdateTripItemRequest request`

Create `AddTripItemRequest` and `UpdateTripItemRequest` DTOs first:

```csharp
// backend/AGDevX.Cart.Shared/DTOs/AddTripItemRequest.cs
// ABOUTME: DTO for adding an item to a trip.
// ABOUTME: TripId comes from the route; this contains item details.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class AddTripItemRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? InventoryItemId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid? StoreId { get; set; }
}
```

```csharp
// backend/AGDevX.Cart.Shared/DTOs/UpdateTripItemRequest.cs
// ABOUTME: DTO for updating trip item details.
// ABOUTME: Contains quantity, notes, and optional store assignment.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripItemRequest
{
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid? StoreId { get; set; }
}
```

Updated controller methods:
```csharp
//== Add a new item to a trip
[HttpPost("trip/{tripId}")]
public async Task<IActionResult> Add(Guid tripId, [FromBody] AddTripItemRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var tripItem = await tripItemService.AddTripItem(tripId, request.InventoryItemId!.Value, request.Quantity, userId, request.Notes, request.StoreId);
        return CreatedAtAction(nameof(GetById), new { id = tripItem.Id }, tripItem);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}

//== Update an existing trip item
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTripItemRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await tripItemService.UpdateTripItem(id, request.Quantity, userId, request.Notes, request.StoreId);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

- [ ] **Step 5: Verify the backend builds**

Run: `cd backend && dotnet build`
Expected: Build succeeds

- [ ] **Step 6: Run all existing backend tests to check for regressions**

Run: `cd backend && dotnet test -v n`
Expected: All existing tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/ backend/AGDevX.Cart.Shared/DTOs/
git commit -m "feat: update controllers to use request DTOs instead of entity models"
```

---

## Chunk 3: Security Audit Logging

### Task 9: Security Audit Logger

**Files:**
- Create: `backend/AGDevX.Cart.Shared/Security/ISecurityAuditLogger.cs`
- Create: `backend/AGDevX.Cart.Shared/Security/SecurityAuditLogger.cs`
- Test: `backend/AGDevX.Cart.Api.Tests/Security/SecurityAuditLoggerTests.cs`
- Modify: `backend/AGDevX.Cart.Auth/AuthService.cs` — add logging calls
- Modify: `backend/AGDevX.Cart.Api/Program.cs` — register service

- [ ] **Step 1: Write the failing test**

```csharp
// backend/AGDevX.Cart.Api.Tests/Security/SecurityAuditLoggerTests.cs
// ABOUTME: Tests for security audit logger
// ABOUTME: Verifies security events are logged with correct level and masked data

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using AGDevX.Cart.Shared.Security;

namespace AGDevX.Cart.Api.Tests.Security;

public class SecurityAuditLoggerTests
{
    private readonly Mock<ILogger<SecurityAuditLogger>> _logger = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new();
    private SecurityAuditLogger CreateLogger()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.168.1.1");
        _httpContextAccessor.Setup(x => x.HttpContext).Returns(context);
        return new SecurityAuditLogger(_logger.Object, _httpContextAccessor.Object);
    }

    [Fact]
    public void LogFailedLogin_should_log_warning_with_masked_email()
    {
        var logger = CreateLogger();

        logger.LogFailedLogin("august@example.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("a****@example.com") && o.ToString()!.Contains("192.168.1.1")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogRegistration_should_log_information()
    {
        var logger = CreateLogger();

        logger.LogRegistration("newuser@test.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("n****@test.com")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogPasswordChange_should_log_information_with_userId()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogPasswordChange(userId);

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString())),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogEmailChange_should_log_information_with_masked_old_email()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogEmailChange(userId, "old@example.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString()) && o.ToString()!.Contains("o****@example.com")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogFailedAuthorization_should_log_warning_with_resource_type()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogFailedAuthorization(userId, "Household");

        _logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString()) && o.ToString()!.Contains("Household")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void MaskEmail_should_mask_correctly()
    {
        Assert.Equal("a****@example.com", SecurityAuditLogger.MaskEmail("august@example.com"));
        Assert.Equal("a****@test.com", SecurityAuditLogger.MaskEmail("a@test.com"));
        Assert.Equal("****", SecurityAuditLogger.MaskEmail("invalid"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "SecurityAuditLoggerTests" -v n`
Expected: Build error — `SecurityAuditLogger` does not exist

- [ ] **Step 3: Create ISecurityAuditLogger interface**

```csharp
// backend/AGDevX.Cart.Shared/Security/ISecurityAuditLogger.cs
// ABOUTME: Interface for security audit logging.
// ABOUTME: Provides methods for logging security-relevant events.

namespace AGDevX.Cart.Shared.Security;

public interface ISecurityAuditLogger
{
    void LogFailedLogin(string email);
    void LogRegistration(string email);
    void LogPasswordChange(Guid userId);
    void LogEmailChange(Guid userId, string oldEmail);
    void LogFailedAuthorization(Guid userId, string resourceType);
}
```

- [ ] **Step 4: Create SecurityAuditLogger implementation**

```csharp
// backend/AGDevX.Cart.Shared/Security/SecurityAuditLogger.cs
// ABOUTME: Logs security-relevant events with consistent formatting and masked PII.
// ABOUTME: Captures IP address from HttpContext for audit trail.

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace AGDevX.Cart.Shared.Security;

public class SecurityAuditLogger(ILogger<SecurityAuditLogger> logger, IHttpContextAccessor httpContextAccessor) : ISecurityAuditLogger
{
    private string GetClientIp()
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return "unknown";

        // Check X-Forwarded-For for reverse proxy scenarios
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    public static string MaskEmail(string email)
    {
        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "****";
        return $"{email[0]}****{email[atIndex..]}";
    }

    public void LogFailedLogin(string email)
    {
        logger.LogWarning("Security: Failed login attempt for {Email} from {IP}",
            MaskEmail(email), GetClientIp());
    }

    public void LogRegistration(string email)
    {
        logger.LogInformation("Security: Account created for {Email} from {IP}",
            MaskEmail(email), GetClientIp());
    }

    public void LogPasswordChange(Guid userId)
    {
        logger.LogInformation("Security: Password changed for user {UserId} from {IP}",
            userId, GetClientIp());
    }

    public void LogEmailChange(Guid userId, string oldEmail)
    {
        logger.LogInformation("Security: Email changed for user {UserId} from {OldEmail} from {IP}",
            userId, MaskEmail(oldEmail), GetClientIp());
    }

    public void LogFailedAuthorization(Guid userId, string resourceType)
    {
        logger.LogWarning("Security: Failed authorization for user {UserId} on {ResourceType} from {IP}",
            userId, resourceType, GetClientIp());
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests --filter "SecurityAuditLoggerTests" -v n`
Expected: 6 tests pass

- [ ] **Step 6: Register SecurityAuditLogger in Program.cs**

Add to `backend/AGDevX.Cart.Api/Program.cs` in the service registrations section:
```csharp
//== Security audit logging
builder.Services.AddScoped<ISecurityAuditLogger, SecurityAuditLogger>();
```

Add `using AGDevX.Cart.Shared.Security;` to imports.

- [ ] **Step 7: Add logging calls to AuthService**

Modify `backend/AGDevX.Cart.Auth/AuthService.cs`:
- Add `ISecurityAuditLogger` to constructor: `public class AuthService(CartDbContext context, ISecurityAuditLogger securityAuditLogger) : IAuthService`
- In `Register()`: after `await context.SaveChangesAsync()` add `securityAuditLogger.LogRegistration(request.Email);`
- In `Login()`: in the catch for invalid password, before re-throwing, add `securityAuditLogger.LogFailedLogin(request.Email);`. Also add it when user is not found.
- In `ChangePassword()`: after `await context.SaveChangesAsync()` add `securityAuditLogger.LogPasswordChange(userId);`
- In `UpdateProfile()`: when email changes, after `user.Email = request.Email;` add `securityAuditLogger.LogEmailChange(userId, oldEmail);` (capture old email before the change)

Note: The `Login()` method needs restructuring — currently it throws directly. Change the user-not-found path to also log:
```csharp
public async Task<AuthResponse> Login(LoginRequest request)
{
    var user = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

    if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
    {
        securityAuditLogger.LogFailedLogin(request.Email);
        throw new UnauthorizedAccessException("Invalid email or password.");
    }

    return new AuthResponse
    {
        UserId = user.Id,
        Email = user.Email ?? string.Empty,
        Name = user.Name ?? string.Empty
    };
}
```

- [ ] **Step 8: Verify all backend tests still pass**

Run: `cd backend && dotnet test -v n`
Expected: All tests pass (AuthService tests may need `ISecurityAuditLogger` mock added to their setup)

- [ ] **Step 9: Fix AuthService test setup if needed**

If `AuthServiceTests` fail due to missing constructor parameter, add a `Mock<ISecurityAuditLogger>()` to the test setup and pass it to `AuthService` constructor.

- [ ] **Step 10: Commit**

```bash
git add backend/AGDevX.Cart.Shared/Security/ backend/AGDevX.Cart.Api.Tests/Security/ backend/AGDevX.Cart.Auth/AuthService.cs backend/AGDevX.Cart.Api/Program.cs
git commit -m "feat: add security audit logging for auth events"
```

---

## Chunk 4: Frontend Changes

### Task 10: Frontend Request Timeout

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`:

```typescript
it('should abort request after 15 second timeout', async () => {
  vi.useFakeTimers();

  const mockFetch = vi.fn().mockImplementation(
    (_url: string, options: RequestInit) =>
      new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }),
  );
  globalThis.fetch = mockFetch;

  const fetchPromise = apiFetch('/slow-endpoint', { method: 'GET' });

  vi.advanceTimersByTime(15000);

  await expect(fetchPromise).rejects.toThrow('Request timed out');

  vi.useRealTimers();
});

it('should clean up timeout on successful response', async () => {
  vi.useFakeTimers();
  const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  globalThis.fetch = mockFetch;

  await apiFetch('/test-endpoint', { method: 'GET' });

  expect(clearTimeoutSpy).toHaveBeenCalled();
  clearTimeoutSpy.mockRestore();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`
Expected: New tests fail

- [ ] **Step 3: Update apiFetch with timeout**

Replace `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts` content:

```typescript
// ABOUTME: API configuration and base fetch wrapper for AGDevX Cart API
// ABOUTME: Provides request handling with automatic cookie-based authentication via credentials: 'include'

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Base fetch wrapper that includes credentials for cookie-based auth
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the fetch Response
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {};

  // Copy existing headers if they exist
  if (options.headers) {
    const existingHeaders = options.headers;
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.entries(existingHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });
    }
  }

  // Set Content-Type to application/json if body is present and Content-Type not already set
  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 4: Run all apiFetch tests**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`
Expected: All tests pass (existing + new)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
git commit -m "feat: add 15-second request timeout to apiFetch"
```

---

### Task 11: Update Frontend Mutations for New API Contracts

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/trip/add-trip-item.mutation.ts` — send JSON body instead of query params
- Modify: `frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts` — send JSON body instead of query params
- Modify: `frontend/src/apis/agdevx-cart-api/household/create-household.mutation.ts` — send `{ name }` object instead of raw string
- Modify: `frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts` — send `{ name }` object instead of raw string

- [ ] **Step 1: Update add-trip-item mutation**

The route changes from `POST /api/tripitem?tripId=...&inventoryItemId=...&quantity=...` to `POST /api/tripitem/trip/{tripId}` with JSON body.

```typescript
// frontend/src/apis/agdevx-cart-api/trip/add-trip-item.mutation.ts
// ABOUTME: Mutation hook for adding items to a trip
// ABOUTME: Adds inventory item to trip with quantity and invalidates trip cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'

interface AddTripItemRequest {
  tripId: string
  inventoryItemId: string
  quantity: number
  storeId?: string | null
  notes?: string | null
}

export const useAddTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: AddTripItemRequest): Promise<TripItem> => {
      const { tripId, inventoryItemId, quantity, storeId, notes } = request
      const response = await apiFetch(`/api/tripitem/trip/${tripId}`, {
        method: 'POST',
        body: JSON.stringify({ inventoryItemId, quantity, storeId, notes }),
      })
      if (!response.ok) {
        throw new Error('Failed to add trip item')
      }
      return response.json() as Promise<TripItem>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
```

- [ ] **Step 2: Update update-trip-item mutation**

The route stays `PUT /api/tripitem/{id}` but switches from query params to JSON body.

```typescript
// frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts
// ABOUTME: Mutation hook for updating trip item details
// ABOUTME: Sends PUT request with JSON body for quantity, notes, and storeId

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
      const { tripItemId, quantity, notes, storeId } = request
      const response = await apiFetch(`/api/tripitem/${tripItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity, notes, storeId }),
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

- [ ] **Step 3: Update create-household mutation**

Changes from `JSON.stringify(request.name)` (raw string) to `JSON.stringify({ name: request.name })` (object).

```typescript
// frontend/src/apis/agdevx-cart-api/household/create-household.mutation.ts
// ABOUTME: Mutation hook for creating household
// ABOUTME: Creates new household and returns it with invite code

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

interface CreateHouseholdRequest {
  name: string
}

export const useCreateHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateHouseholdRequest): Promise<Household> => {
      const response = await apiFetch('/api/household', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        throw new Error('Failed to create household')
      }
      return response.json() as Promise<Household>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
```

- [ ] **Step 4: Update update-household mutation**

Changes from `JSON.stringify(request.name)` (raw string) to `JSON.stringify({ name: request.name })` (object).

```typescript
// frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts
// ABOUTME: Mutation hook for renaming a household
// ABOUTME: Sends PUT request with JSON object body

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
        body: JSON.stringify({ name: request.name }),
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

- [ ] **Step 5: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 6: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/add-trip-item.mutation.ts frontend/src/apis/agdevx-cart-api/trip/update-trip-item.mutation.ts frontend/src/apis/agdevx-cart-api/household/create-household.mutation.ts frontend/src/apis/agdevx-cart-api/household/update-household.mutation.ts
git commit -m "feat: update frontend mutations for new backend DTO contracts"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full backend test suite**

Run: `cd backend && dotnet test -v n`
Expected: All tests pass

- [ ] **Step 2: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 4: Verify backend builds and starts**

Run: `cd backend && dotnet build`
Expected: Build succeeds

- [ ] **Step 5: Commit any remaining fixes**

If any fixes were needed during verification, commit them.
