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
            DisplayName = "First User"
        };

        await authService.RegisterAsync(registerRequest);

        var duplicateRequest = new RegisterRequest
        {
            Email = "duplicate@example.com",
            Password = "AnotherPassword456!",
            DisplayName = "Second User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => authService.RegisterAsync(duplicateRequest));
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
            DisplayName = "Test User"
        };

        await authService.RegisterAsync(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "test@example.com",
            Password = "WrongPassword456!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => authService.LoginAsync(loginRequest));
    }
}
