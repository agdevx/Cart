// ABOUTME: Tests for AuthController endpoints including register, login, logout, and session check operations
// ABOUTME: Validates controller behavior with mocked IAuthService and proper HTTP context for cookie auth

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
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

        //== Set up HttpContext with mocked authentication service for cookie SignIn/SignOut
        var authServiceMock = new Mock<IAuthenticationService>();
        authServiceMock
            .Setup(x => x.SignInAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<System.Security.Claims.ClaimsPrincipal>(), It.IsAny<AuthenticationProperties>()))
            .Returns(Task.CompletedTask);
        authServiceMock
            .Setup(x => x.SignOutAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<AuthenticationProperties>()))
            .Returns(Task.CompletedTask);

        var serviceProviderMock = new Mock<IServiceProvider>();
        serviceProviderMock
            .Setup(x => x.GetService(typeof(IAuthenticationService)))
            .Returns(authServiceMock.Object);

        var httpContext = new DefaultHttpContext
        {
            RequestServices = serviceProviderMock.Object
        };

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
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
    public async Task Should_ReturnOk_When_LoggingOut()
    {
        // Act
        var result = await _controller.Logout();

        // Assert
        result.Should().BeOfType<OkResult>();
    }

    [Fact]
    public void Should_ReturnAuthResponse_When_MeCalledWithAuthenticatedUser()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "me@example.com";
        var displayName = "Me User";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name, displayName)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext.HttpContext.User = principal;

        // Act
        var result = _controller.Me();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var authResponse = okResult.Value as AuthResponse;
        authResponse.Should().NotBeNull();
        authResponse!.UserId.Should().Be(userId);
        authResponse.Email.Should().Be(email);
        authResponse.DisplayName.Should().Be(displayName);
    }
}
