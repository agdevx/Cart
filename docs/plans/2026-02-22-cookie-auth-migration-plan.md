# Cookie Auth Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JWT Bearer token auth with ASP.NET cookie auth so EventSource/SSE works with authenticated requests.

**Architecture:** Backend switches from `AddJwtBearer()` to `AddCookie()` with `HttpContext.SignInAsync()`. Frontend removes all Bearer token injection and relies on browser cookies sent automatically via `credentials: 'include'`. Vite proxy routes `/api` to backend.

**Tech Stack:** ASP.NET Core Cookie Authentication, Vite proxy, React (Jotai state management)

---

### Task 1: Backend — Replace JWT config with cookie auth config

**Files:**
- Modify: `backend/AGDevX.Cart.Shared/Configuration/IJwtSettings.cs`
- Modify: `backend/AGDevX.Cart.Shared/Configuration/JwtSettings.cs`
- Modify: `backend/AGDevX.Cart.Api/appsettings.json`
- Modify: `backend/AGDevX.Cart.Api/appsettings.Development.json`

**Step 1: Rename IJwtSettings to ICookieSettings**

Replace `backend/AGDevX.Cart.Shared/Configuration/IJwtSettings.cs` entirely:

```csharp
// ABOUTME: Interface defining cookie authentication configuration settings.
// ABOUTME: Used for dependency injection and configuration binding throughout the application.

namespace AGDevX.Cart.Shared.Configuration;

public interface ICookieSettings
{
    int SessionTimeoutMinutes { get; }
}
```

**Step 2: Rename JwtSettings to CookieSettings**

Replace `backend/AGDevX.Cart.Shared/Configuration/JwtSettings.cs` entirely:

```csharp
// ABOUTME: Implementation of cookie authentication configuration settings bound from appSettings.json.
// ABOUTME: Provides default values for session timeout.

namespace AGDevX.Cart.Shared.Configuration;

public class CookieSettings : ICookieSettings
{
    public int SessionTimeoutMinutes { get; set; } = 30;
}
```

**Step 3: Update appsettings.json**

Replace the `"JwtSettings"` section with:

```json
"CookieSettings": {
  "SessionTimeoutMinutes": 30
}
```

Remove the entire `JwtSettings` block (Secret, AccessTokenExpirationMinutes, RefreshTokenExpirationDays, Issuer, Audience).

**Step 4: Update appsettings.Development.json**

Remove the `"JwtSettings"` section entirely. No dev-specific cookie settings needed.

**Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Shared/Configuration/ backend/AGDevX.Cart.Api/appsettings.json backend/AGDevX.Cart.Api/appsettings.Development.json
git commit -m "refactor: Replace JwtSettings with CookieSettings configuration"
```

---

### Task 2: Backend — Replace JWT Bearer auth middleware with cookie auth in Program.cs

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs`

**Step 1: Replace JWT auth setup with cookie auth**

In `Program.cs`, replace the JWT configuration block (lines 36-59) and update using statements:

Remove these lines:
```csharp
using AGDevX.Cart.Shared.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
```

```csharp
//== JWT Configuration
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings not configured");
builder.Services.AddSingleton<IJwtSettings>(jwtSettings);

//== Authentication Configuration
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
        ClockSkew = TimeSpan.Zero
    };
});
```

Replace with:
```csharp
using AGDevX.Cart.Shared.Configuration;
using Microsoft.AspNetCore.Authentication.Cookies;
```

```csharp
//== Cookie Configuration
var cookieSettings = builder.Configuration.GetSection("CookieSettings").Get<CookieSettings>()
    ?? new CookieSettings();
builder.Services.AddSingleton<ICookieSettings>(cookieSettings);

//== Authentication Configuration
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = ".Cart.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(cookieSettings.SessionTimeoutMinutes);

        //== Return 401/403 JSON for SPA instead of redirect
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
```

Also remove `using System.Text;` (no longer needed for SymmetricSecurityKey).

**Step 2: Remove HTTPS redirect in development**

Replace `app.UseHttpsRedirection();` with:

```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
```

**Step 3: Verify it compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeds (AuthService will have errors — that's Task 3)

Note: The build will fail because AuthService still references IJwtSettings. That's expected and fixed in Task 3.

**Step 4: Commit (if build passes, otherwise combine with Task 3)**

```bash
git add backend/AGDevX.Cart.Api/Program.cs
git commit -m "refactor: Replace JWT Bearer auth with cookie authentication middleware"
```

---

### Task 3: Backend — Simplify AuthService to remove JWT token generation

**Files:**
- Modify: `backend/AGDevX.Cart.Auth/IAuthService.cs`
- Modify: `backend/AGDevX.Cart.Auth/AuthService.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/AuthResponse.cs`
- Delete: `backend/AGDevX.Cart.Shared/DTOs/RefreshTokenRequest.cs`

**Step 1: Simplify AuthResponse DTO**

Replace `backend/AGDevX.Cart.Shared/DTOs/AuthResponse.cs`:

```csharp
// ABOUTME: DTO returned after successful authentication.
// ABOUTME: Contains user identity fields for the authenticated user.
namespace AGDevX.Cart.Shared.DTOs;

public class AuthResponse
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
```

**Step 2: Delete RefreshTokenRequest DTO**

Delete the file `backend/AGDevX.Cart.Shared/DTOs/RefreshTokenRequest.cs`.

**Step 3: Simplify IAuthService**

Replace `backend/AGDevX.Cart.Auth/IAuthService.cs`:

```csharp
// ABOUTME: Interface for authentication operations (user registration and login).
// ABOUTME: Designed for easy migration to Auth0 by swapping implementation while keeping interface contract.
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}
```

**Step 4: Simplify AuthService**

Replace `backend/AGDevX.Cart.Auth/AuthService.cs`:

```csharp
// ABOUTME: Authentication service handling user registration and login.
// ABOUTME: Uses BCrypt for password hashing. Cookie session management is handled by the controller.
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Auth;

public class AuthService(CartDbContext context) : IAuthService
{
    //== Public authentication methods

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        //== Check for duplicate email
        var existingUser = await context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser != null)
        {
            throw new InvalidOperationException("User with this email already exists.");
        }

        //== Hash password with BCrypt
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        //== Create User with system user (Guid.Empty) as creator
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            CreatedBy = Guid.Empty.ToString(),
            CreatedDate = DateTime.UtcNow
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName ?? string.Empty
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        //== Find user by email
        var user = await context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        //== Verify password with BCrypt
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName ?? string.Empty
        };
    }
}
```

**Step 5: Remove unused NuGet packages from Auth project**

In `backend/AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj`, remove:

```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.2" />
<PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.15.0" />
```

Keep only `BCrypt.Net-Next`.

**Step 6: Verify it compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeds (AuthController will need updating too — see Step 7)

Note: AuthController still calls `Refresh()` and references old types. The build may fail here. If so, continue to Task 4 before committing.

**Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Auth/ backend/AGDevX.Cart.Shared/DTOs/ backend/AGDevX.Cart.Shared/Configuration/
git rm backend/AGDevX.Cart.Shared/DTOs/RefreshTokenRequest.cs
git commit -m "refactor: Simplify AuthService - remove JWT token generation"
```

---

### Task 4: Backend — Update AuthController to use cookie SignIn/SignOut

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/AuthController.cs`

**Step 1: Rewrite AuthController with cookie auth**

Replace `backend/AGDevX.Cart.Api/Controllers/AuthController.cs`:

```csharp
// ABOUTME: Controller for authentication operations including user registration, login, logout, and session check
// ABOUTME: Uses HttpContext.SignInAsync/SignOutAsync for cookie-based session management

using System.Security.Claims;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await authService.RegisterAsync(request);
            await SignInUser(response);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await authService.LoginAsync(request);
            await SignInUser(response);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var displayName = User.FindFirst(ClaimTypes.Name)?.Value;

        if (userId == null)
        {
            return Unauthorized();
        }

        return Ok(new AuthResponse
        {
            UserId = Guid.Parse(userId),
            Email = email ?? string.Empty,
            DisplayName = displayName ?? string.Empty
        });
    }

    //== Private helper to create cookie session from auth response
    private async Task SignInUser(AuthResponse response)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, response.UserId.ToString()),
            new Claim(ClaimTypes.Email, response.Email),
            new Claim(ClaimTypes.Name, response.DisplayName)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);
    }
}
```

**Step 2: Build the full solution**

Run: `cd backend && dotnet build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/AuthController.cs
git commit -m "refactor: Update AuthController to use cookie SignIn/SignOut"
```

---

### Task 5: Backend — Update tests for cookie auth

**Files:**
- Modify: `backend/AGDevX.Cart.Api.Tests/Controllers/AuthControllerTests.cs`
- Modify: `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`

**Step 1: Rewrite AuthControllerTests**

The controller now calls `HttpContext.SignInAsync()` which requires mocking. Since the controller tests mock `IAuthService`, we need to set up a mock `HttpContext` with authentication service.

Replace `backend/AGDevX.Cart.Api.Tests/Controllers/AuthControllerTests.cs`:

```csharp
// ABOUTME: Tests for AuthController endpoints including register, login, logout, and session check
// ABOUTME: Validates controller behavior with mocked IAuthService and HttpContext for cookie auth

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<IAuthenticationService> _authenticationServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _authenticationServiceMock = new Mock<IAuthenticationService>();

        _authenticationServiceMock
            .Setup(x => x.SignInAsync(
                It.IsAny<HttpContext>(),
                It.IsAny<string>(),
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<AuthenticationProperties>()))
            .Returns(Task.CompletedTask);

        _authenticationServiceMock
            .Setup(x => x.SignOutAsync(
                It.IsAny<HttpContext>(),
                It.IsAny<string>(),
                It.IsAny<AuthenticationProperties>()))
            .Returns(Task.CompletedTask);

        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider
            .Setup(x => x.GetService(typeof(IAuthenticationService)))
            .Returns(_authenticationServiceMock.Object);

        _controller = new AuthController(_authServiceMock.Object);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                RequestServices = serviceProvider.Object
            }
        };
    }

    [Fact]
    public async Task Should_ReturnOk_When_RegisteringWithValidRequest()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "Password123!",
            DisplayName = "Test User"
        };

        var expectedResponse = new AuthResponse
        {
            UserId = Guid.NewGuid(),
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        _authServiceMock
            .Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Register(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().BeEquivalentTo(expectedResponse);

        _authenticationServiceMock.Verify(x => x.SignInAsync(
            It.IsAny<HttpContext>(),
            It.IsAny<string>(),
            It.IsAny<ClaimsPrincipal>(),
            It.IsAny<AuthenticationProperties>()), Times.Once);
    }

    [Fact]
    public async Task Should_ReturnOk_When_LoginWithValidCredentials()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "Password123!"
        };

        var expectedResponse = new AuthResponse
        {
            UserId = Guid.NewGuid(),
            Email = request.Email,
            DisplayName = "Test User"
        };

        _authServiceMock
            .Setup(x => x.LoginAsync(request))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Login(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().BeEquivalentTo(expectedResponse);

        _authenticationServiceMock.Verify(x => x.SignInAsync(
            It.IsAny<HttpContext>(),
            It.IsAny<string>(),
            It.IsAny<ClaimsPrincipal>(),
            It.IsAny<AuthenticationProperties>()), Times.Once);
    }

    [Fact]
    public async Task Should_ReturnBadRequest_When_RegisteringWithDuplicateEmail()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "duplicate@example.com",
            Password = "Password123!",
            DisplayName = "Test User"
        };

        _authServiceMock
            .Setup(x => x.RegisterAsync(request))
            .ThrowsAsync(new InvalidOperationException("Email already exists"));

        // Act
        var result = await _controller.Register(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = (BadRequestObjectResult)result;
        var errorResponse = badRequestResult.Value;
        errorResponse.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_LoginWithInvalidCredentials()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "WrongPassword"
        };

        _authServiceMock
            .Setup(x => x.LoginAsync(request))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid credentials"));

        // Act
        var result = await _controller.Login(request);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnOk_When_LoggingOut()
    {
        // Act
        var result = await _controller.Logout();

        // Assert
        result.Should().BeOfType<OkResult>();

        _authenticationServiceMock.Verify(x => x.SignOutAsync(
            It.IsAny<HttpContext>(),
            It.IsAny<string>(),
            It.IsAny<AuthenticationProperties>()), Times.Once);
    }

    [Fact]
    public void Should_ReturnUserInfo_When_CallingMe()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Name, "Test User")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        _controller.HttpContext.User = new ClaimsPrincipal(identity);

        // Act
        var result = _controller.Me();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value as AuthResponse;
        response.Should().NotBeNull();
        response!.UserId.Should().Be(userId);
        response.Email.Should().Be("test@example.com");
        response.DisplayName.Should().Be("Test User");
    }
}
```

**Step 2: Rewrite AuthServiceTests**

Replace `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`:

```csharp
// ABOUTME: Tests for the AuthService implementation.
// ABOUTME: Tests cover user registration and login using InMemoryDatabase.
using AGDevX.Cart.Auth;
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Auth.Tests;

public class AuthServiceTests
{
    [Fact]
    public async Task Should_CreateNewUser_When_RegisteringWithValidData()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new CartDbContext(options);
        var authService = new AuthService(context);

        var registerRequest = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!",
            DisplayName = "Test User"
        };

        // Act
        var result = await authService.RegisterAsync(registerRequest);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.Equal(registerRequest.Email, result.Email);
        Assert.Equal(registerRequest.DisplayName, result.DisplayName);
    }

    [Fact]
    public async Task Should_ReturnUserInfo_When_LoginWithValidCredentials()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new CartDbContext(options);
        var authService = new AuthService(context);

        var registerRequest = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!",
            DisplayName = "Test User"
        };

        await authService.RegisterAsync(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await authService.LoginAsync(loginRequest);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.Equal(loginRequest.Email, result.Email);
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_RegisteringDuplicateEmail()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new CartDbContext(options);
        var authService = new AuthService(context);

        var registerRequest = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!",
            DisplayName = "Test User"
        };

        await authService.RegisterAsync(registerRequest);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => authService.RegisterAsync(registerRequest));
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_When_LoginWithWrongPassword()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new CartDbContext(options);
        var authService = new AuthService(context);

        await authService.RegisterAsync(new RegisterRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!",
            DisplayName = "Test User"
        });

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => authService.LoginAsync(new LoginRequest
            {
                Email = "test@example.com",
                Password = "WrongPassword"
            }));
    }
}
```

**Step 3: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api.Tests/ backend/AGDevX.Cart.Auth.Tests/
git commit -m "test: Update backend auth tests for cookie-based authentication"
```

---

### Task 6: Frontend — Update apiFetch to use credentials instead of Bearer tokens

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`

**Step 1: Simplify apiFetch**

Replace `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`:

```typescript
// ABOUTME: API configuration and base fetch wrapper for AGDevX Cart API
// ABOUTME: Provides request handling with automatic cookie-based authentication via credentials: 'include'

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

  return fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });
}
```

Note: The URL is now just `endpoint` (relative), not `${API_BASE_URL}${endpoint}`. The Vite proxy (Task 10) will route `/api/*` to the backend.

**Step 2: Update apiFetch tests**

Replace `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`:

```typescript
// ABOUTME: Tests for apiFetch configuration
// ABOUTME: Verifies credential inclusion and header handling

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from './agdevx-cart-api-config';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as typeof fetch;
  });

  it('should include credentials in all requests', async () => {
    await apiFetch('/api/test');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
      })
    );
  });

  it('should use relative URL without base URL prefix', async () => {
    await apiFetch('/api/household');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/household',
      expect.any(Object)
    );
  });

  it('should set Content-Type to application/json when body is present', async () => {
    await apiFetch('/api/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should not override existing Content-Type header', async () => {
    await apiFetch('/api/test', {
      method: 'POST',
      body: 'plain text',
      headers: { 'Content-Type': 'text/plain' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'text/plain',
        }),
      })
    );
  });
});
```

**Step 3: Run frontend tests (just this file)**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
git commit -m "refactor: Replace Bearer token injection with credentials: include in apiFetch"
```

---

### Task 7: Frontend — Update auth state management (atoms, hook, provider)

**Files:**
- Modify: `frontend/src/state/auth-atoms.ts`
- Modify: `frontend/src/auth/use-auth.ts`
- Modify: `frontend/src/auth/auth-provider.tsx`
- Modify: `frontend/src/auth/use-auth.test.ts`
- Modify: `frontend/src/auth/auth-provider.test.tsx`
- Modify: `frontend/src/state/auth-atoms.test.ts`

**Step 1: Remove authTokenAtom from atoms**

Replace `frontend/src/state/auth-atoms.ts`:

```typescript
// ABOUTME: Global authentication state atoms using Jotai
// ABOUTME: Manages current user state, initialized from localStorage by AuthProvider

import { atom } from 'jotai';
import type { User } from '@/apis/agdevx-cart-api/models/user';

/**
 * Atom storing the currently authenticated user
 * Should be initialized by AuthProvider on mount
 */
export const currentUserAtom = atom<User | null>(null);
```

**Step 2: Update useAuth hook — remove token management**

Replace `frontend/src/auth/use-auth.ts`:

```typescript
// ABOUTME: useAuth hook for managing authentication state
// ABOUTME: Provides methods to set/clear auth state and persist user to localStorage

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/state/auth-atoms';
import type { User } from '@/apis/agdevx-cart-api/models/user';
import { apiFetch } from '@/apis/agdevx-cart-api/agdevx-cart-api-config';

const AUTH_USER_STORAGE_KEY = 'authUser';

/**
 * Hook for managing authentication state
 * @returns Auth state and methods for login/logout
 */
export function useAuth() {
  const [user, setUser] = useAtom(currentUserAtom);

  /**
   * Sets the authenticated user
   * Persists to localStorage for fast initial render
   */
  const setAuth = useCallback((user: User) => {
    setUser(user);

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [setUser]);

  /**
   * Clears the authenticated user and calls logout API to clear cookie
   * Removes user from localStorage
   */
  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort logout — clear local state regardless
    }

    setUser(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }, [setUser]);

  return {
    user,
    isAuthenticated: user !== null,
    setAuth,
    logout,
  };
}
```

**Step 3: Update AuthProvider — validate session on mount**

Replace `frontend/src/auth/auth-provider.tsx`:

```typescript
// ABOUTME: Authentication provider component
// ABOUTME: Wraps app and restores auth state from cookie session on mount

import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { currentUserAtom } from '@/state/auth-atoms'
import { apiFetch } from '@/apis/agdevx-cart-api/agdevx-cart-api-config'
import type { User } from '@/apis/agdevx-cart-api/models/user'

const AUTH_USER_STORAGE_KEY = 'authUser'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const setUser = useSetAtom(currentUserAtom)

  useEffect(() => {
    if (typeof window === 'undefined') return

    //== Optimistic: restore user from localStorage for fast render
    try {
      const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY)
      if (storedUser) {
        setUser(JSON.parse(storedUser) as User)
      }
    } catch {
      // Invalid stored data, ignore
    }

    //== Validate session with backend (cookie is sent automatically)
    const validateSession = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          const user: User = {
            id: userData.userId,
            email: userData.email,
            displayName: userData.displayName,
            createdBy: null,
            createdDate: new Date().toISOString(),
            modifiedBy: null,
            modifiedDate: null,
          }
          setUser(user)
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
        } else {
          //== Cookie expired or invalid — clear local state
          setUser(null)
          localStorage.removeItem(AUTH_USER_STORAGE_KEY)
        }
      } catch {
        //== Network error — keep optimistic local state
      }
    }

    validateSession()
  }, [setUser])

  return <>{children}</>
}
```

**Step 4: Update auth-atoms test**

Check `frontend/src/state/auth-atoms.test.ts` and remove any references to `authTokenAtom`. If the test only tests `authTokenAtom`, replace with a test for `currentUserAtom`.

**Step 5: Update use-auth tests**

Replace `frontend/src/auth/use-auth.test.ts`:

```typescript
// ABOUTME: Tests for useAuth hook
// ABOUTME: Verifies authentication hook behavior including setAuth, logout, and localStorage

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { Provider } from 'jotai';
import { useAuth } from './use-auth';
import type { User } from '@/apis/agdevx-cart-api/models/user';

vi.mock('@/apis/agdevx-cart-api/agdevx-cart-api-config', () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(Provider, {}, children);

describe('useAuth', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();

    localStorageMock = {};

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;
  });

  it('should initialize with no user and not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user when setAuth is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should persist user to localStorage when setAuth is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser);
    });

    expect(localStorageMock['authUser']).toBe(JSON.stringify(mockUser));
  });

  it('should clear user when logout is called', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should remove user from localStorage when logout is called', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorageMock['authUser']).toBeUndefined();
  });
});
```

**Step 6: Update auth-provider tests**

Replace `frontend/src/auth/auth-provider.test.tsx`:

```typescript
// ABOUTME: Tests for AuthProvider component
// ABOUTME: Verifies session restoration from localStorage and /api/auth/me validation

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './auth-provider'
import { useAuth } from './use-auth'
import { createElement } from 'react'

vi.mock('@/apis/agdevx-cart-api/agdevx-cart-api-config', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: false,
  }),
}));

const TestComponent = () => {
  const { isAuthenticated, user } = useAuth()
  return createElement('div', null,
    `Auth: ${isAuthenticated}, User: ${user?.displayName || 'none'}`
  )
}

describe('AuthProvider', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    vi.clearAllMocks()

    localStorageMock = {}

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    } as Storage
  })

  it('provides auth context to children', () => {
    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )
    expect(screen.getByText(/Auth: false/)).toBeInTheDocument()
  })

  it('restores user from localStorage on mount', async () => {
    localStorageMock['authUser'] = JSON.stringify({
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    })

    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )

    await waitFor(() => {
      expect(screen.getByText(/User: Test User/)).toBeInTheDocument()
    })
  })
})
```

**Step 7: Run auth-related tests**

Run: `cd frontend && npx vitest run src/auth/ src/state/auth-atoms.test.ts`
Expected: All tests pass

**Step 8: Commit**

```bash
git add frontend/src/state/auth-atoms.ts frontend/src/auth/ frontend/src/state/auth-atoms.test.ts
git commit -m "refactor: Remove token from auth state, use cookie-based session"
```

---

### Task 8: Frontend — Update login/register mutations and pages

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/auth/login.mutation.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/auth/login.mutation.test.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/auth/register.mutation.test.ts`
- Modify: `frontend/src/pages/login-page.tsx`
- Modify: `frontend/src/pages/register-page.tsx`
- Modify: `frontend/src/pages/login-page.test.tsx`
- Modify: `frontend/src/pages/household-page.tsx`

**Step 1: Update LoginResponse — remove token fields**

In `frontend/src/apis/agdevx-cart-api/auth/login.mutation.ts`, change `LoginResponse`:

```typescript
export interface LoginResponse {
  userId: string;
  email: string;
  displayName: string;
}
```

Remove `accessToken` and `refreshToken` fields. The rest of the file stays the same.

**Step 2: Update RegisterResponse — remove token fields**

In `frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts`, change `RegisterResponse`:

```typescript
export interface RegisterResponse {
  userId: string;
  email: string;
  displayName: string;
}
```

Remove `accessToken` and `refreshToken` fields. The rest of the file stays the same.

**Step 3: Update login page — remove token from setAuth call**

In `frontend/src/pages/login-page.tsx`, change the `setAuth` call (line 22-33) to:

```typescript
      const response = await loginMutation.mutateAsync({ email, password })
      setAuth({
        id: response.userId,
        email: response.email,
        displayName: response.displayName,
        createdBy: null,
        createdDate: new Date().toISOString(),
        modifiedBy: null,
        modifiedDate: null,
      })
```

Remove the second argument (`response.accessToken`) from the `setAuth()` call.

**Step 4: Update register page — remove token from setAuth call**

In `frontend/src/pages/register-page.tsx`, change the `setAuth` call (lines 90-101) to remove the second argument `response.accessToken`:

```typescript
      setAuth({
        id: response.userId,
        email: response.email,
        displayName: response.displayName,
        createdBy: null,
        createdDate: new Date().toISOString(),
        modifiedBy: null,
        modifiedDate: null,
      })
```

**Step 5: Update household page — make logout async**

In `frontend/src/pages/household-page.tsx`, the `logout` function is now async. Update the logout button onClick:

```typescript
<button
  onClick={() => { logout() }}
  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
>
  Logout
</button>
```

This already works since the void return is fine in an onClick handler.

**Step 6: Update login mutation test — remove token fields from mock response**

In `frontend/src/apis/agdevx-cart-api/auth/login.mutation.test.ts`, update the mock response to remove `accessToken` and `refreshToken`.

**Step 7: Update register mutation test** similarly.

**Step 8: Run tests**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/auth/ src/pages/login-page.test.tsx src/pages/register-page.test.tsx`
Expected: All tests pass

**Step 9: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/auth/ frontend/src/pages/login-page.tsx frontend/src/pages/register-page.tsx frontend/src/pages/household-page.tsx frontend/src/pages/login-page.test.tsx frontend/src/pages/register-page.test.tsx
git commit -m "refactor: Update login/register to use cookie auth responses"
```

---

### Task 9: Frontend — Remove token from all query and mutation hooks

**Files (queries — remove token):**
- `frontend/src/apis/agdevx-cart-api/household/use-households.query.ts`
- `frontend/src/apis/agdevx-cart-api/household/use-household-members.query.ts`
- `frontend/src/apis/agdevx-cart-api/household/use-invite-code.query.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/use-inventory.query.ts`
- `frontend/src/apis/agdevx-cart-api/trip/use-trips.query.ts`
- `frontend/src/apis/agdevx-cart-api/trip/use-trip.query.ts`
- `frontend/src/apis/agdevx-cart-api/trip/use-trip-items.query.ts`

**Files (mutations — remove token):**
- `frontend/src/apis/agdevx-cart-api/trip/create-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/add-trip-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/check-trip-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/trip/complete-trip.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/create-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/join-household.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/remove-household-member.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/transfer-household-ownership.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/household/regenerate-invite-code.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/create-inventory-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/update-inventory-item.mutation.ts`
- `frontend/src/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation.ts`

**Pattern for queries** (example: `use-households.query.ts`):

Before:
```typescript
import { useAuth } from '@/auth/use-auth'

export const useHouseholdsQuery = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['households'],
    queryFn: async (): Promise<Household[]> => {
      const response = await apiFetch('/api/household', { token });
      ...
    },
    enabled: !!token,
  })
}
```

After:
```typescript
import { useAuth } from '@/auth/use-auth'

export const useHouseholdsQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['households'],
    queryFn: async (): Promise<Household[]> => {
      const response = await apiFetch('/api/household');
      ...
    },
    enabled: isAuthenticated,
  })
}
```

Changes per query hook:
1. Change `const { token } = useAuth()` → `const { isAuthenticated } = useAuth()`
2. Remove `{ token }` from `apiFetch()` call options (pass empty object `{}` or remove second arg)
3. Change `enabled: !!token` → `enabled: isAuthenticated`

**Pattern for mutations** (example: `create-trip.mutation.ts`):

Before:
```typescript
import { useAuth } from '@/auth/use-auth'

export const useCreateTripMutation = () => {
  const { token } = useAuth()
  ...
  mutationFn: async (request) => {
    const response = await apiFetch('/api/trip', {
      method: 'POST',
      body: JSON.stringify(request),
      token,
    })
```

After:
```typescript
export const useCreateTripMutation = () => {
  const queryClient = useQueryClient()
  ...
  mutationFn: async (request) => {
    const response = await apiFetch('/api/trip', {
      method: 'POST',
      body: JSON.stringify(request),
    })
```

Changes per mutation hook:
1. Remove `const { token } = useAuth()` (and `useAuth` import if not used for anything else)
2. Remove `token,` from `apiFetch()` options

**Step 1: Apply the pattern to all 7 query hooks**

Apply changes listed above to each query file.

**Step 2: Apply the pattern to all 12 mutation hooks**

Apply changes listed above to each mutation file.

**Step 3: Update active-trip-page.tsx — remove token from useSSE**

In `frontend/src/pages/active-trip-page.tsx`:
- Change `const { token } = useAuth()` → remove this line (or remove `token` destructuring)
- Change `useSSE(url, token || '', handleSSEMessage, !!tripId && !!token)` → `useSSE(url, handleSSEMessage, !!tripId)`

**Step 4: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: Many test failures because tests still mock `useAuth` returning `token` and assert `token` in `apiFetch` calls. These get fixed in Task 10.

**Step 5: Commit (with test fixes noted for next task)**

```bash
git add frontend/src/apis/ frontend/src/pages/active-trip-page.tsx
git commit -m "refactor: Remove token from all query and mutation hooks"
```

---

### Task 10: Frontend — Update useSSE hook to remove token parameter

**Files:**
- Modify: `frontend/src/hooks/use-sse.ts`
- Modify: `frontend/src/libs/sse-client.test.ts` (if needed)

**Step 1: Simplify useSSE signature**

Replace `frontend/src/hooks/use-sse.ts`:

```typescript
// ABOUTME: React hook for managing SSE connections
// ABOUTME: Handles lifecycle of SSE client with cleanup on unmount

import { useEffect, useRef } from 'react'
import { createSSEClient } from '@/libs/sse-client'

export const useSSE = (url: string, onMessage: (data: unknown) => void, enabled: boolean = true): void => {
  const clientRef = useRef<ReturnType<typeof createSSEClient> | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const client = createSSEClient(url)
    clientRef.current = client

    const unsubscribe = client.subscribe(onMessage)

    client.onError((error) => {
      console.error('SSE connection error:', error)
    })

    return () => {
      unsubscribe()
      client.close()
      clientRef.current = null
    }
  }, [url, onMessage, enabled])
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/use-sse.ts
git commit -m "refactor: Remove token parameter from useSSE hook"
```

---

### Task 11: Frontend — Update all test files for cookie auth pattern

**Files (query tests):**
- `frontend/src/apis/agdevx-cart-api/household/use-households.query.test.tsx`
- `frontend/src/apis/agdevx-cart-api/household/use-household-members.query.test.tsx`
- `frontend/src/apis/agdevx-cart-api/household/use-invite-code.query.test.tsx`
- `frontend/src/apis/agdevx-cart-api/inventory/use-inventory.query.test.tsx`
- `frontend/src/apis/agdevx-cart-api/trip/use-trips.query.test.tsx`
- `frontend/src/apis/agdevx-cart-api/trip/use-trip.query.test.tsx`

**Files (mutation tests):**
- All mutation test files listed in the glob output

**Files (integration tests):**
- `frontend/src/integration-tests/auth-flow.integration.test.tsx`
- `frontend/src/integration-tests/household-flow.integration.test.tsx`
- `frontend/src/integration-tests/navigation.integration.test.tsx`

**Files (page tests):**
- `frontend/src/pages/household-detail-page.test.tsx`
- `frontend/src/pages/register-page.test.tsx`

**Pattern for query test updates** (example: `use-households.query.test.tsx`):

Before:
```typescript
vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
  token: 'test-token',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
})
```

After:
```typescript
vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
  isAuthenticated: true,
  user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
  setAuth: vi.fn(),
  logout: vi.fn(),
})
```

Before (assertion):
```typescript
expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household', {
  token: 'test-token',
})
```

After:
```typescript
expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household')
```

Before (disabled test):
```typescript
vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
  token: null,
  isAuthenticated: false,
  ...
})
```

After:
```typescript
vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
  isAuthenticated: false,
  user: null,
  setAuth: vi.fn(),
  logout: vi.fn(),
})
```

**Pattern for mutation test updates**: Same as above for `useAuth` mock, and remove `token: 'test-token'` from `apiFetch` call assertions.

**Step 1: Update all query test files** (7 files)

**Step 2: Update all mutation test files** (12 files)

**Step 3: Update page and integration test files** (5 files)

**Step 4: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "test: Update all frontend tests for cookie-based auth"
```

---

### Task 12: Frontend — Add Vite proxy configuration

**Files:**
- Modify: `frontend/vite.config.ts`

**Step 1: Add proxy to Vite dev server config**

In `frontend/vite.config.ts`, add `proxy` to the `server` block:

```typescript
server: {
  open: true,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

**Step 2: Run frontend dev server to verify proxy works**

Run: `cd frontend && npm run dev`
Expected: Dev server starts without errors. API requests to `/api/*` will be proxied to `localhost:5000`.

**Step 3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat: Add Vite proxy for /api to backend server"
```

---

### Task 13: Run full test suites

**Step 1: Run backend tests**

Run: `cd backend && dotnet test`
Expected: All tests pass

**Step 2: Run frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

**Step 3: Fix any remaining failures**

If tests fail, fix them. Common issues:
- TypeScript errors from `token` references that were missed
- Mock shape mismatches where `useAuth` return type changed

**Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: Resolve remaining test failures from cookie auth migration"
```

---

### Task 14: Manual integration test — verify SSE across two browsers

**Step 1: Delete old SQLite database (fresh start)**

Run: `rm backend/AGDevX.Cart.Api/cart.db` (if it exists)

**Step 2: Start backend**

Run: `cd backend && dotnet run --project AGDevX.Cart.Api`
Expected: Listening on `http://localhost:5000`, database migrated

**Step 3: Start frontend**

Run: `cd frontend && npm run dev`
Expected: Listening on `http://localhost:5173`, browser opens

**Step 4: Register User A in Browser 1**

- Navigate to `http://localhost:5173`
- Click "Sign up"
- Register with email `alice@test.com`, password `Password1`, display name `Alice`
- Should redirect to shopping page

**Step 5: Create a household with User A**

- Go to Households
- Create household "Test House"
- View household detail, copy invite code

**Step 6: Register User B in Browser 2**

- Open a second browser window (or incognito)
- Navigate to `http://localhost:5173`
- Register with email `bob@test.com`, password `Password1`, display name `Bob`
- Join household using the invite code from Step 5

**Step 7: Create a trip with User A**

- In Browser 1, go to Shopping
- Create a new household trip "Grocery Run" for "Test House"

**Step 8: Add inventory items and trip items**

- Add some inventory items first (if needed)
- Add items to the trip

**Step 9: Start the trip and check items**

- In Browser 1, navigate to the active trip
- In Browser 2, navigate to the same trip
- Check/uncheck items in one browser
- Verify the other browser updates in real-time via SSE

**Expected:** When User A checks an item, User B sees it update without refreshing.
