# User Profile Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ability for users to change their name, email address, and password from the Settings page.

**Architecture:** Two new backend endpoints (`PUT /api/auth/profile` and `PUT /api/auth/password`) extend the existing AuthService. The frontend settings page is redesigned as an iOS-style grouped list with view/edit modes for Profile and Security sections. Only one section can be in edit mode at a time.

**Tech Stack:** .NET 9 / EF Core (backend), React / TypeScript / Tailwind CSS / Tanstack Query / Jotai (frontend), xUnit (backend tests), Vitest + React Testing Library (frontend tests)

**Spec:** `docs/superpowers/specs/2026-03-10-user-profile-management-design.md`

---

## File Structure

### Backend — New Files
- `backend/AGDevX.Cart.Shared/DTOs/UpdateProfileRequest.cs` — DTO for profile update
- `backend/AGDevX.Cart.Shared/DTOs/ChangePasswordRequest.cs` — DTO for password change

### Backend — Modified Files
- `backend/AGDevX.Cart.Auth/IAuthService.cs` — add UpdateProfile + ChangePassword to interface
- `backend/AGDevX.Cart.Auth/AuthService.cs` — implement UpdateProfile + ChangePassword
- `backend/AGDevX.Cart.Api/Controllers/AuthController.cs` — add PUT profile + PUT password endpoints
- `backend/AGDevX.Cart.Data/CartDbContext.cs` — add HasMaxLength constraints to User entity
- `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs` — add tests for new methods

### Frontend — New Files
- `frontend/src/apis/agdevx-cart-api/auth/update-profile.mutation.ts` — profile update mutation
- `frontend/src/apis/agdevx-cart-api/auth/change-password.mutation.ts` — password change mutation
- `frontend/src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts` — mutation tests
- `frontend/src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts` — mutation tests
- `frontend/src/pages/components/profile-section.tsx` — profile view/edit component
- `frontend/src/pages/components/security-section.tsx` — security view/change-password component
- `frontend/src/pages/components/tests/profile-section.test.tsx` — component tests
- `frontend/src/pages/components/tests/security-section.test.tsx` — component tests

### Frontend — Modified Files
- `frontend/src/pages/settings-page.tsx` — redesign to grouped-list layout with section state
- `frontend/src/pages/tests/settings-page.test.tsx` — update tests for new layout
- `frontend/src/pages/register-page.tsx` — add maxLength attributes
- `frontend/src/pages/login-page.tsx` — add maxLength attributes

---

## Chunk 1: Database & Backend

### Task 1: Database Migration — Add MaxLength Constraints

**Files:**
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs:62-65`

- [ ] **Step 1: Add HasMaxLength constraints to User entity config**

In `backend/AGDevX.Cart.Data/CartDbContext.cs`, update the User entity configuration:

```csharp
//== Configure User unique index on Email
modelBuilder.Entity<User>(entity =>
{
    entity.HasIndex(u => u.Email).IsUnique();
    entity.Property(u => u.Name).HasMaxLength(64);
    entity.Property(u => u.Email).HasMaxLength(254);
    entity.Property(u => u.PasswordHash).HasMaxLength(256);
});
```

- [ ] **Step 2: Create the EF Core migration**

Run from `backend/`:
```bash
dotnet ef migrations add AddUserFieldMaxLengths --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

Expected: Migration files created in `backend/AGDevX.Cart.Data/Migrations/`

- [ ] **Step 3: Verify the migration looks correct**

Read the generated migration file. The `Up()` method should contain `AlterColumn` calls setting `maxLength` for Name (64), Email (254), and PasswordHash (256). The `Down()` method should reverse them.

- [ ] **Step 4: Apply the migration**

Run from `backend/`:
```bash
dotnet ef database update --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

Expected: Database updated successfully.

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Data/CartDbContext.cs backend/AGDevX.Cart.Data/Migrations/
git commit -m "feat: add max length constraints to User entity (Name 64, Email 254, PasswordHash 256)"
```

---

### Task 2: Backend DTOs

**Files:**
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateProfileRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/ChangePasswordRequest.cs`

- [ ] **Step 1: Create UpdateProfileRequest DTO**

```csharp
// ABOUTME: DTO for updating user profile (name and email).
// ABOUTME: CurrentPassword is required only when email is being changed.
namespace AGDevX.Cart.Shared.DTOs;

public class UpdateProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? CurrentPassword { get; set; }
}
```

- [ ] **Step 2: Create ChangePasswordRequest DTO**

```csharp
// ABOUTME: DTO for changing a user's password.
// ABOUTME: Requires current password verification before accepting the new password.
namespace AGDevX.Cart.Shared.DTOs;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
```

- [ ] **Step 3: Verify project builds**

Run from `backend/`:
```bash
dotnet build
```

Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Shared/DTOs/UpdateProfileRequest.cs backend/AGDevX.Cart.Shared/DTOs/ChangePasswordRequest.cs
git commit -m "feat: add UpdateProfileRequest and ChangePasswordRequest DTOs"
```

---

### Task 3: AuthService — UpdateProfile

**Files:**
- Modify: `backend/AGDevX.Cart.Auth/IAuthService.cs`
- Modify: `backend/AGDevX.Cart.Auth/AuthService.cs`
- Modify: `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`

- [ ] **Step 1: Write failing tests for UpdateProfile**

Add these tests to `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`:

```csharp
[Fact]
public async Task Should_UpdateName_When_ProfileUpdatedWithSameEmail()
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
        Name = "Original Name"
    };

    var registered = await authService.Register(registerRequest);

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Updated Name",
        Email = "test@example.com"
    };

    // Act
    var result = await authService.UpdateProfile(registered.UserId, updateRequest);

    // Assert
    Assert.Equal("Updated Name", result.Name);
    Assert.Equal("test@example.com", result.Email);
}

[Fact]
public async Task Should_UpdateEmail_When_CorrectPasswordProvided()
{
    // Arrange
    var options = new DbContextOptionsBuilder<CartDbContext>()
                  .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                  .Options;

    using var context = new CartDbContext(options);
    var authService = new AuthService(context);

    var registerRequest = new RegisterRequest
    {
        Email = "old@example.com",
        Password = "SecurePassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Test User",
        Email = "new@example.com",
        CurrentPassword = "SecurePassword123!"
    };

    // Act
    var result = await authService.UpdateProfile(registered.UserId, updateRequest);

    // Assert
    Assert.Equal("new@example.com", result.Email);
}

[Fact]
public async Task Should_ThrowUnauthorized_When_EmailChangedWithWrongPassword()
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
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Test User",
        Email = "new@example.com",
        CurrentPassword = "WrongPassword456!"
    };

    // Act & Assert
    await Assert.ThrowsAsync<UnauthorizedAccessException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}

[Fact]
public async Task Should_ThrowUnauthorized_When_EmailChangedWithNoPassword()
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
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Test User",
        Email = "new@example.com"
    };

    // Act & Assert
    await Assert.ThrowsAsync<UnauthorizedAccessException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}

[Fact]
public async Task Should_ThrowInvalidOperation_When_ProfileEmailAlreadyTaken()
{
    // Arrange
    var options = new DbContextOptionsBuilder<CartDbContext>()
                  .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                  .Options;

    using var context = new CartDbContext(options);
    var authService = new AuthService(context);

    await authService.Register(new RegisterRequest
    {
        Email = "taken@example.com",
        Password = "SecurePassword123!",
        Name = "Other User"
    });

    var registered = await authService.Register(new RegisterRequest
    {
        Email = "test@example.com",
        Password = "SecurePassword123!",
        Name = "Test User"
    });

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Test User",
        Email = "taken@example.com",
        CurrentPassword = "SecurePassword123!"
    };

    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}
```

[Fact]
public async Task Should_ThrowArgumentException_When_ProfileNameIsEmpty()
{
    // Arrange
    var options = new DbContextOptionsBuilder<CartDbContext>()
                  .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                  .Options;

    using var context = new CartDbContext(options);
    var authService = new AuthService(context);

    var registered = await authService.Register(new RegisterRequest
    {
        Email = "test@example.com",
        Password = "SecurePassword123!",
        Name = "Test User"
    });

    var updateRequest = new UpdateProfileRequest
    {
        Name = "",
        Email = "test@example.com"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_ProfileNameExceeds64Characters()
{
    // Arrange
    var options = new DbContextOptionsBuilder<CartDbContext>()
                  .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                  .Options;

    using var context = new CartDbContext(options);
    var authService = new AuthService(context);

    var registered = await authService.Register(new RegisterRequest
    {
        Email = "test@example.com",
        Password = "SecurePassword123!",
        Name = "Test User"
    });

    var updateRequest = new UpdateProfileRequest
    {
        Name = new string('A', 65),
        Email = "test@example.com"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_ProfileEmailFormatInvalid()
{
    // Arrange
    var options = new DbContextOptionsBuilder<CartDbContext>()
                  .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                  .Options;

    using var context = new CartDbContext(options);
    var authService = new AuthService(context);

    var registered = await authService.Register(new RegisterRequest
    {
        Email = "test@example.com",
        Password = "SecurePassword123!",
        Name = "Test User"
    });

    var updateRequest = new UpdateProfileRequest
    {
        Name = "Test User",
        Email = "not-a-valid-email"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.UpdateProfile(registered.UserId, updateRequest));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj --filter "UpdateProfile|ProfileName|ProfileEmail"
```

Expected: FAIL — `UpdateProfile` does not exist on `IAuthService`.

- [ ] **Step 3: Add UpdateProfile to IAuthService interface**

In `backend/AGDevX.Cart.Auth/IAuthService.cs`, add:

```csharp
Task<AuthResponse> UpdateProfile(Guid userId, UpdateProfileRequest request);
```

Add the using statement: `using AGDevX.Cart.Shared.DTOs;` (already present).

- [ ] **Step 4: Implement UpdateProfile in AuthService**

In `backend/AGDevX.Cart.Auth/AuthService.cs`, add this method:

```csharp
public async Task<AuthResponse> UpdateProfile(Guid userId, UpdateProfileRequest request)
{
    var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId)
                    ?? throw new UnauthorizedAccessException("User not found.");

    //== Validate name
    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 64)
    {
        throw new ArgumentException("Name is required and must be 64 characters or fewer.");
    }

    //== Validate email format and length
    if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Length > 254)
    {
        throw new ArgumentException("A valid email is required (max 254 characters).");
    }

    if (!System.Text.RegularExpressions.Regex.IsMatch(request.Email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
    {
        throw new ArgumentException("Please enter a valid email address.");
    }

    var emailChanged = !string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase);

    if (emailChanged)
    {
        //== Require current password for email changes
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new UnauthorizedAccessException("Current password is required to change email.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Incorrect password.");
        }

        //== Check for duplicate email
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.Id != userId);
        if (existingUser != null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        user.Email = request.Email;
    }

    user.Name = request.Name.Trim();
    await context.SaveChangesAsync();

    return new AuthResponse
    {
        UserId = user.Id,
        Email = user.Email ?? string.Empty,
        Name = user.Name ?? string.Empty
    };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj --filter "Should_UpdateName_When_ProfileUpdatedWithSameEmail|Should_UpdateEmail_When_CorrectPasswordProvided|Should_ThrowUnauthorized_When_EmailChangedWithWrongPassword|Should_ThrowUnauthorized_When_EmailChangedWithNoPassword|Should_ThrowInvalidOperation_When_ProfileEmailAlreadyTaken"
```

Expected: All 8 tests PASS.

- [ ] **Step 6: Run all existing tests to verify no regressions**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj
```

Expected: All tests PASS (existing 4 + new 8 = 12 total).

- [ ] **Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Auth/IAuthService.cs backend/AGDevX.Cart.Auth/AuthService.cs backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs
git commit -m "feat: add UpdateProfile to AuthService with password-protected email changes"
```

---

### Task 4: AuthService — ChangePassword

**Files:**
- Modify: `backend/AGDevX.Cart.Auth/IAuthService.cs`
- Modify: `backend/AGDevX.Cart.Auth/AuthService.cs`
- Modify: `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`

- [ ] **Step 1: Write failing tests for ChangePassword**

Add these tests to `backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`:

```csharp
[Fact]
public async Task Should_ChangePassword_When_CurrentPasswordIsCorrect()
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
        Password = "OldPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "OldPassword123!",
        NewPassword = "NewPassword456!"
    };

    // Act
    await authService.ChangePassword(registered.UserId, changeRequest);

    // Assert — verify new password works for login
    var loginResult = await authService.Login(new LoginRequest
    {
        Email = "test@example.com",
        Password = "NewPassword456!"
    });
    Assert.NotNull(loginResult);
}

[Fact]
public async Task Should_ThrowUnauthorized_When_CurrentPasswordIsWrong()
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
        Password = "CorrectPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "WrongPassword456!",
        NewPassword = "NewPassword789!"
    };

    // Act & Assert
    await Assert.ThrowsAsync<UnauthorizedAccessException>(
        () => authService.ChangePassword(registered.UserId, changeRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_NewPasswordTooShort()
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
        Password = "CorrectPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "CorrectPassword123!",
        NewPassword = "Short1!"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.ChangePassword(registered.UserId, changeRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_NewPasswordMissingUppercase()
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
        Password = "CorrectPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "CorrectPassword123!",
        NewPassword = "alllowercase123"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.ChangePassword(registered.UserId, changeRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_NewPasswordMissingNumber()
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
        Password = "CorrectPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "CorrectPassword123!",
        NewPassword = "NoNumbersHere!"
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.ChangePassword(registered.UserId, changeRequest));
}

[Fact]
public async Task Should_ThrowArgumentException_When_NewPasswordExceeds128Characters()
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
        Password = "CorrectPassword123!",
        Name = "Test User"
    };

    var registered = await authService.Register(registerRequest);

    var changeRequest = new ChangePasswordRequest
    {
        CurrentPassword = "CorrectPassword123!",
        NewPassword = "A1" + new string('a', 127)
    };

    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => authService.ChangePassword(registered.UserId, changeRequest));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj --filter "Should_ChangePassword|Should_ThrowUnauthorized_When_CurrentPasswordIsWrong|Should_ThrowArgumentException_When_NewPassword"
```

Expected: FAIL — `ChangePassword` does not exist.

- [ ] **Step 3: Add ChangePassword to IAuthService interface**

In `backend/AGDevX.Cart.Auth/IAuthService.cs`, add:

```csharp
Task ChangePassword(Guid userId, ChangePasswordRequest request);
```

- [ ] **Step 4: Implement ChangePassword in AuthService**

In `backend/AGDevX.Cart.Auth/AuthService.cs`, add this method:

```csharp
public async Task ChangePassword(Guid userId, ChangePasswordRequest request)
{
    var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId)
                    ?? throw new UnauthorizedAccessException("User not found.");

    //== Verify current password
    if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
    {
        throw new UnauthorizedAccessException("Incorrect password.");
    }

    //== Validate new password rules
    if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8 || request.NewPassword.Length > 128)
    {
        throw new ArgumentException("Password must be between 8 and 128 characters.");
    }

    if (!request.NewPassword.Any(char.IsUpper))
    {
        throw new ArgumentException("Password must contain at least one uppercase letter.");
    }

    if (!request.NewPassword.Any(char.IsDigit))
    {
        throw new ArgumentException("Password must contain at least one number.");
    }

    //== Hash and save new password
    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
    await context.SaveChangesAsync();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj
```

Expected: All 18 tests PASS (12 from Task 3 + 6 new).

- [ ] **Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Auth/IAuthService.cs backend/AGDevX.Cart.Auth/AuthService.cs backend/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs
git commit -m "feat: add ChangePassword to AuthService with validation rules"
```

---

### Task 5: AuthController — New Endpoints

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/AuthController.cs`

- [ ] **Step 1: Add PUT profile endpoint**

Add this method to `AuthController`:

```csharp
[Authorize]
[HttpPut("profile")]
public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
{
    try
    {
        var userId = User.GetUserId();
        var response = await authService.UpdateProfile(userId, request);
        await SignInUser(response);
        return Ok(response);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Conflict(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { errorCode = "VALIDATION_ERROR", message = ex.Message });
    }
}
```

- [ ] **Step 2: Add PUT password endpoint**

Add this method to `AuthController`:

```csharp
[Authorize]
[HttpPut("password")]
public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await authService.ChangePassword(userId, request);
        return Ok();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { errorCode = "VALIDATION_ERROR", message = ex.Message });
    }
}
```

- [ ] **Step 3: Verify project builds**

Run from `backend/`:
```bash
dotnet build
```

Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/AuthController.cs
git commit -m "feat: add PUT /api/auth/profile and PUT /api/auth/password endpoints"
```

---

## Chunk 2: Frontend Mutations

### Task 6: Update Profile Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/auth/update-profile.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts`

- [ ] **Step 1: Write the mutation test**

Create `frontend/src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts`:

```typescript
// ABOUTME: Tests for update profile mutation hook
// ABOUTME: Verifies useUpdateProfileMutation hook behavior and API integration

import { createElement } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { useUpdateProfileMutation } from '../update-profile.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useUpdateProfileMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should successfully update profile', async () => {
    const mockResponse = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'updated@example.com',
      name: 'Updated Name',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Updated Name',
      email: 'updated@example.com',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/profile'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
      })
    )
  })

  it('should handle duplicate email error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        errorCode: 'DUPLICATE_EMAIL',
        message: 'A user with this email already exists.',
      }),
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Test',
      email: 'taken@example.com',
      currentPassword: 'Password123!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('already exists')
  })

  it('should handle wrong password error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        errorCode: 'UNAUTHORIZED',
        message: 'Incorrect password.',
      }),
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Test',
      email: 'new@example.com',
      currentPassword: 'WrongPassword!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Incorrect password')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the mutation**

Create `frontend/src/apis/agdevx-cart-api/auth/update-profile.mutation.ts`:

```typescript
// ABOUTME: Update profile mutation hook using Tanstack Query
// ABOUTME: Handles name and email updates, with optional password for email changes

import { useMutation } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export interface UpdateProfileRequest {
  name: string
  email: string
  currentPassword?: string
}

export interface UpdateProfileResponse {
  userId: string
  email: string
  name: string
}

async function updateProfile(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const response = await apiFetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Profile update failed')
  }

  return response.json()
}

export function useUpdateProfileMutation() {
  return useMutation({
    mutationFn: updateProfile,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/auth/update-profile.mutation.ts frontend/src/apis/agdevx-cart-api/auth/tests/update-profile.mutation.test.ts
git commit -m "feat: add useUpdateProfileMutation hook"
```

---

### Task 7: Change Password Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/auth/change-password.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts`

- [ ] **Step 1: Write the mutation test**

Create `frontend/src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts`:

```typescript
// ABOUTME: Tests for change password mutation hook
// ABOUTME: Verifies useChangePasswordMutation hook behavior and API integration

import { createElement } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { useChangePasswordMutation } from '../change-password.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useChangePasswordMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should successfully change password', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/password'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
      })
    )
  })

  it('should handle wrong current password error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        errorCode: 'UNAUTHORIZED',
        message: 'Incorrect password.',
      }),
    })

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'WrongPassword!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Incorrect password')
  })

  it('should handle network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the mutation**

Create `frontend/src/apis/agdevx-cart-api/auth/change-password.mutation.ts`:

```typescript
// ABOUTME: Change password mutation hook using Tanstack Query
// ABOUTME: Handles password changes with current password verification

import { useMutation } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

async function changePassword(request: ChangePasswordRequest): Promise<void> {
  const response = await apiFetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Password change failed')
  }
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/auth/change-password.mutation.ts frontend/src/apis/agdevx-cart-api/auth/tests/change-password.mutation.test.ts
git commit -m "feat: add useChangePasswordMutation hook"
```

---

## Chunk 3: Frontend Components

### Task 8: ProfileSection Component

**Files:**
- Create: `frontend/src/pages/components/profile-section.tsx`
- Create: `frontend/src/pages/components/tests/profile-section.test.tsx`

- [ ] **Step 1: Write component tests**

Create `frontend/src/pages/components/tests/profile-section.test.tsx`:

```tsx
// ABOUTME: Tests for ProfileSection component
// ABOUTME: Verifies view/edit modes, conditional password field, and form behavior

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { ProfileSection } from '../profile-section'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

const defaultProps = {
  user: { id: '123', email: 'test@example.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
  isEditing: false,
  onStartEdit: vi.fn(),
  onCancel: vi.fn(),
  onSaved: vi.fn(),
}

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders view mode with name and email', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('renders labels above values in view mode', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders edit form when isEditing is true', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('does not show password field when email is unchanged', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('shows password field when email is changed', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByText('Required to change your email')).toBeInTheDocument()
  })

  it('hides password field when email is reverted to original', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('calls onStartEdit when Edit is clicked', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    fireEvent.click(screen.getByText('Edit'))
    expect(defaultProps.onStartEdit).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('enforces maxLength on name input', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const nameInput = screen.getByDisplayValue('Test User')
    expect(nameInput).toHaveAttribute('maxLength', '64')
  })

  it('enforces maxLength on email input', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toHaveAttribute('maxLength', '254')
  })

  it('disables save when name is empty', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: '' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables save when email is invalid', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables save when email changed but password empty', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/components/tests/profile-section.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ProfileSection component**

Create `frontend/src/pages/components/profile-section.tsx`. The component should:

- Accept props: `user`, `isEditing`, `onStartEdit`, `onCancel`, `onSaved`
- **View mode:** Render section label "PROFILE" with "Edit" link, then a card with Name (label above value) and Email (label above value)
- **Edit mode:** Render the card with input fields for Name and Email, pre-populated with current values. If email differs from `user.email`, show a "Current Password" field with dashed border and hint text "Required to change your email". Show Cancel/Save buttons (side-by-side, flex-1).
- Use `useUpdateProfileMutation` for the save action
- On successful save, call `onSaved(response)` so the parent can update auth state
- Handle inline errors: duplicate email on email field, wrong password on password field
- Input constraints: `maxLength={64}` on name, `maxLength={254}` on email, `maxLength={128}` on password
- Match the app's existing input styling: `w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent` with `border-coral` for errors, `border-navy/10` otherwise
- Button styling matches the established pattern: side-by-side flex-1, cancel left, save right

Style reference — view mode rows:
```
<div className="rounded-xl bg-surface">
  <div className="px-4 py-3">
    <div className="text-xs text-text-tertiary">Name</div>
    <div className="text-sm text-navy-soft">August</div>
  </div>
  <div className="border-t border-bg px-4 py-3">
    <div className="text-xs text-text-tertiary">Email</div>
    <div className="text-sm text-navy-soft">august@example.com</div>
  </div>
</div>
```

Style reference — button pair:
```
<div className="flex gap-2 mt-3">
  <button className="flex-1 py-2.5 border-2 border-bg-warm rounded-xl font-display font-bold text-navy-muted">Cancel</button>
  <button className="flex-1 py-2.5 bg-teal text-white rounded-xl font-display font-bold">Save</button>
</div>
```

Style reference — conditional password area (dashed border):
```
<div className="mt-3 border-2 border-dashed border-teal/30 rounded-xl p-3 bg-teal/[0.03]">
  ...password input and hint...
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`:
```bash
npx vitest run src/pages/components/tests/profile-section.test.tsx
```

Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/components/profile-section.tsx frontend/src/pages/components/tests/profile-section.test.tsx
git commit -m "feat: add ProfileSection component with view/edit modes"
```

---

### Task 9: SecuritySection Component

**Files:**
- Create: `frontend/src/pages/components/security-section.tsx`
- Create: `frontend/src/pages/components/tests/security-section.test.tsx`

- [ ] **Step 1: Write component tests**

Create `frontend/src/pages/components/tests/security-section.test.tsx`:

```tsx
// ABOUTME: Tests for SecuritySection component
// ABOUTME: Verifies view/edit modes, password requirements, and form behavior

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { SecuritySection } from '../security-section'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

const defaultProps = {
  isEditing: false,
  onStartEdit: vi.fn(),
  onCancel: vi.fn(),
  onSaved: vi.fn(),
}

describe('SecuritySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders view mode with password placeholder', () => {
    render(createElement(SecuritySection, defaultProps), { wrapper })
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('••••••••')).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
  })

  it('renders edit form when isEditing is true', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows password requirements checklist', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByText(/8\+ characters/)).toBeInTheDocument()
    expect(screen.getByText(/One uppercase letter/)).toBeInTheDocument()
    expect(screen.getByText(/One number/)).toBeInTheDocument()
  })

  it('updates requirement indicators as password changes', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    const newPasswordInput = screen.getByLabelText(/new password/i)
    fireEvent.change(newPasswordInput, { target: { value: 'Abcdefg1' } })
    // All three requirements met — check marks should show
    expect(screen.getByText('✓ 8+ characters')).toBeInTheDocument()
    expect(screen.getByText('✓ One uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('✓ One number')).toBeInTheDocument()
  })

  it('calls onStartEdit when Change is clicked', () => {
    render(createElement(SecuritySection, defaultProps), { wrapper })
    fireEvent.click(screen.getByText('Change'))
    expect(defaultProps.onStartEdit).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('enforces maxLength on password inputs', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByLabelText(/current password/i)).toHaveAttribute('maxLength', '128')
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute('maxLength', '128')
    expect(screen.getByLabelText(/confirm new password/i)).toHaveAttribute('maxLength', '128')
  })

  it('disables save when confirm password does not match', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'OldPass123!' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'NewPass456!' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'Mismatch789!' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('shows success message after password change', () => {
    // SecuritySection accepts an optional successMessage prop for view mode display
    render(createElement(SecuritySection, { ...defaultProps, successMessage: 'Password updated' }), { wrapper })
    expect(screen.getByText('Password updated')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/components/tests/security-section.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SecuritySection component**

Create `frontend/src/pages/components/security-section.tsx`. The component should:

- Accept props: `isEditing`, `onStartEdit`, `onCancel`, `onSaved`, `successMessage?: string`
- **View mode:** Section label "SECURITY", card with "Password" label above "••••••••" and "Change" link. When `successMessage` prop is provided, show the text in teal below the password row (fades after 3 seconds — parent manages the timer via `setTimeout` + state reset).
- **Edit mode:** Card with three password fields (Current Password, New Password, Confirm New Password). New Password shows live requirements checklist (same as registration page). Cancel/Save buttons.
- Use `useChangePasswordMutation` for the save action
- Client-side validation: all three fields required, new password rules (8+ chars, uppercase, number), confirm must match
- Handle inline errors: wrong current password on current password field
- All password inputs: `type="password"`, `maxLength={128}`, `autoComplete` attributes
- On successful save, call `onSaved()` and set `successMessage`
- Reset all form fields when `isEditing` transitions from true to false

Style references: same input/button patterns as ProfileSection (Task 8).

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`:
```bash
npx vitest run src/pages/components/tests/security-section.test.tsx
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/components/security-section.tsx frontend/src/pages/components/tests/security-section.test.tsx
git commit -m "feat: add SecuritySection component with password change form"
```

---

### Task 10: Redesign Settings Page

**Files:**
- Modify: `frontend/src/pages/settings-page.tsx`
- Modify: `frontend/src/pages/tests/settings-page.test.tsx`

- [ ] **Step 1: Update settings page tests**

Replace `frontend/src/pages/tests/settings-page.test.tsx` with:

```tsx
// ABOUTME: Tests for SettingsPage component
// ABOUTME: Verifies grouped-list layout with profile, security, and logout sections

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { SettingsPage } from '../settings-page'

// Mock useAuth to provide a user
vi.mock('@/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: '123', email: 'test@example.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    isAuthenticated: true,
    setAuth: vi.fn(),
    logout: vi.fn(),
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders Settings heading', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders profile section with user data', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders security section', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('collapses profile when security edit is started', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start profile edit
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    // Start security edit — profile should collapse
    fireEvent.click(screen.getByText('Change'))
    expect(screen.queryByDisplayValue('Test User')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })

  it('collapses security when profile edit is started', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start security edit
    fireEvent.click(screen.getByText('Change'))
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    // Start profile edit — security should collapse
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
  })

  it('discards unsaved profile changes when switching to security', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start profile edit and change the name
    fireEvent.click(screen.getByText('Edit'))
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } })
    expect(screen.getByDisplayValue('Changed Name')).toBeInTheDocument()
    // Switch to security — profile collapses
    fireEvent.click(screen.getByText('Change'))
    // Switch back to profile — name should be original, not 'Changed Name'
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/tests/settings-page.test.tsx
```

Expected: FAIL — tests expect new layout that doesn't exist yet.

- [ ] **Step 3: Rewrite settings page**

Replace `frontend/src/pages/settings-page.tsx` with the redesigned grouped-list layout:

- Import `useAuth` and `useState`
- State: `editingSection: 'none' | 'profile' | 'password'`
- Render `PageHeader` → `ProfileSection` → `SecuritySection` → Logout button
- Pass `isEditing={editingSection === 'profile'}` to ProfileSection
- Pass `isEditing={editingSection === 'password'}` to SecuritySection
- `onStartEdit` for profile: sets `editingSection` to `'profile'`
- `onStartEdit` for security: sets `editingSection` to `'password'`
- `onCancel` for both: sets `editingSection` to `'none'`
- `onSaved` for profile: `handleProfileSaved` merges API response into existing user object and calls `setAuth()`:
  ```tsx
  const handleProfileSaved = (response: UpdateProfileResponse) => {
    setAuth({ ...user!, id: response.userId, email: response.email, name: response.name })
    setEditingSection('none')
  }
  ```
- `onSaved` for security: sets `passwordSuccessMessage` state to `'Password updated'`, sets `editingSection` to `'none'`, and starts a `setTimeout` (3 seconds) to clear the message. Pass `successMessage={passwordSuccessMessage}` to SecuritySection.
- Logout button stays at the bottom with existing styling

Layout structure:
```tsx
<div className="pb-4">
  <PageHeader>Settings</PageHeader>
  <div className="px-5 space-y-4">
    <ProfileSection
      user={user}
      isEditing={editingSection === 'profile'}
      onStartEdit={() => setEditingSection('profile')}
      onCancel={() => setEditingSection('none')}
      onSaved={handleProfileSaved}
    />
    <SecuritySection
      isEditing={editingSection === 'password'}
      onStartEdit={() => setEditingSection('password')}
      onCancel={() => setEditingSection('none')}
      onSaved={handlePasswordSaved}
      successMessage={passwordSuccessMessage}
    />
    <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-coral/30 text-coral rounded-xl font-display font-bold hover:bg-coral/8 transition-colors">
      <LogOut className="w-5 h-5" />
      Logout
    </button>
  </div>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`:
```bash
npx vitest run src/pages/tests/settings-page.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Run all frontend tests to check for regressions**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/settings-page.tsx frontend/src/pages/tests/settings-page.test.tsx
git commit -m "feat: redesign settings page with profile and security sections"
```

---

## Chunk 4: Retroactive Fixes & Cleanup

### Task 11: Add maxLength to Login and Register Pages

**Files:**
- Modify: `frontend/src/pages/login-page.tsx`
- Modify: `frontend/src/pages/register-page.tsx`

- [ ] **Step 1: Add maxLength to login page inputs**

In `frontend/src/pages/login-page.tsx`:

- Email input (line 51-59): add `maxLength={254}`
- Password input (line 65-73): add `maxLength={128}`

- [ ] **Step 2: Add maxLength to register page inputs**

In `frontend/src/pages/register-page.tsx`:

- Email input: add `maxLength={254}`
- Password input: add `maxLength={128}`
- Confirm password input: add `maxLength={128}`
- Name input: add `maxLength={64}`

- [ ] **Step 3: Run all frontend tests**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/login-page.tsx frontend/src/pages/register-page.tsx
git commit -m "fix: add maxLength attributes to login and register page inputs"
```

---

### Task 12: Manual Verification

- [ ] **Step 1: Start backend API**

Run from `backend/`:
```bash
dotnet run --project AGDevX.Cart.Api
```

- [ ] **Step 2: Start frontend dev server**

Run from `frontend/`:
```bash
npm run dev
```

- [ ] **Step 3: Test profile name change**

1. Log in and navigate to Settings
2. Verify view mode shows name and email with labels above values
3. Click "Edit" — verify inputs appear pre-populated
4. Change name, leave email the same
5. Verify no password field appears
6. Click Save — verify name updates in the header and view mode

- [ ] **Step 4: Test profile email change**

1. Click "Edit" on profile
2. Change the email address
3. Verify password field appears with "Required to change your email" hint
4. Enter correct current password
5. Click Save — verify email updates
6. Log out and log back in with the new email

- [ ] **Step 5: Test password change**

1. Navigate to Settings
2. Click "Change" on Security
3. Verify profile section collapses if it was in edit mode
4. Enter current password, new password, confirm new password
5. Verify requirements checklist updates in real time
6. Click Save — verify "Password updated" message appears briefly
7. Log out and log back in with the new password

- [ ] **Step 6: Test mutual exclusion**

1. Click "Edit" on profile — verify edit form appears
2. Click "Change" on security — verify profile collapses back to view, security opens
3. Click "Edit" on profile — verify security collapses, profile opens
4. Verify any text entered in the collapsed section is lost

- [ ] **Step 7: Test error states**

1. Try changing email with wrong password — verify inline error
2. Try changing email to one that's already taken — verify inline error
3. Try changing password with wrong current password — verify inline error
