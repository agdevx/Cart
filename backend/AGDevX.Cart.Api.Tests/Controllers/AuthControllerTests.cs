// ABOUTME: Tests for AuthController endpoints including register, login, and refresh token operations
// ABOUTME: Validates controller behavior with mocked IAuthService and proper HTTP response handling

using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _controller = new AuthController(_authServiceMock.Object);
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
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
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
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
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
        var unauthorizedResult = (UnauthorizedObjectResult)result;
        var errorResponse = unauthorizedResult.Value;
        errorResponse.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_ReturnOk_When_RefreshingWithValidToken()
    {
        // Arrange
        var request = new RefreshTokenRequest
        {
            RefreshToken = "valid-refresh-token"
        };

        var expectedResponse = new AuthResponse
        {
            AccessToken = "new-access-token",
            RefreshToken = "new-refresh-token",
            Email = "test@example.com",
            DisplayName = "Test User"
        };

        _authServiceMock
            .Setup(x => x.RefreshTokenAsync(request.RefreshToken))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Refresh(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().BeEquivalentTo(expectedResponse);
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_RefreshingWithInvalidToken()
    {
        // Arrange
        var request = new RefreshTokenRequest
        {
            RefreshToken = "invalid-refresh-token"
        };

        _authServiceMock
            .Setup(x => x.RefreshTokenAsync(request.RefreshToken))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid refresh token"));

        // Act
        var result = await _controller.Refresh(request);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
        var unauthorizedResult = (UnauthorizedObjectResult)result;
        var errorResponse = unauthorizedResult.Value;
        errorResponse.Should().NotBeNull();
    }
}
