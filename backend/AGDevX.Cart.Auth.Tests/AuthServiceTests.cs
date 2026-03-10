// ABOUTME: This file contains tests for the AuthService implementation.
// ABOUTME: Tests cover user registration and login using InMemoryDatabase.
using AGDevX.Cart.Auth;
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.EntityFrameworkCore;
using Xunit;

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
            Name = "Test User"
        };

        // Act
        var result = await authService.Register(registerRequest);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.Equal(registerRequest.Email, result.Email);
        Assert.Equal(registerRequest.Name, result.Name);
    }

    [Fact]
    public async Task Should_ReturnAuthResponse_When_LoginWithValidCredentials()
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

        await authService.Register(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "test@example.com",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await authService.Login(loginRequest);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.Equal(loginRequest.Email, result.Email);
    }

    [Fact]
    public async Task Should_ThrowInvalidOperationException_When_RegisteringDuplicateEmail()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;

        using var context = new CartDbContext(options);
        var authService = new AuthService(context);

        var registerRequest = new RegisterRequest
        {
            Email = "duplicate@example.com",
            Password = "SecurePassword123!",
            Name = "First User"
        };

        await authService.Register(registerRequest);

        var duplicateRequest = new RegisterRequest
        {
            Email = "duplicate@example.com",
            Password = "AnotherPassword456!",
            Name = "Second User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => authService.Register(duplicateRequest));
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_LoginWithWrongPassword()
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

        await authService.Register(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "test@example.com",
            Password = "WrongPassword456!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => authService.Login(loginRequest));
    }

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
}
