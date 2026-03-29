// ABOUTME: Tests for the UserPreferences API controller endpoints.
// ABOUTME: Validates GET and PUT preferences return correct results and error handling.

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class UserPreferencesControllerTests
{
    private static (UserPreferencesController controller, Mock<IUserPreferencesService> mockService) BuildController(Guid userId)
    {
        var mockService = new Mock<IUserPreferencesService>();
        var controller = new UserPreferencesController(mockService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return (controller, mockService);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetPreferencesSuccessful()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var (controller, mockService) = BuildController(userId);

        var preferences = new UserPreferencesResponse
        {
            DefaultPage = "home",
            LocationLatitude = 47.6062,
            LocationLongitude = -122.3321,
            LocationDisplayName = "Seattle, WA",
        };

        mockService.Setup(s => s.GetPreferences(userId, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(preferences);

        // Act
        var result = await controller.GetPreferences(CancellationToken.None);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(preferences);
    }

    [Fact]
    public async Task Should_ReturnInternalServerError_When_GetPreferencesThrows()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var (controller, mockService) = BuildController(userId);

        mockService.Setup(s => s.GetPreferences(userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new Exception("Database unavailable"));

        // Act
        var result = await controller.GetPreferences(CancellationToken.None);

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task Should_ReturnOk_When_UpdatePreferencesSuccessful()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var (controller, mockService) = BuildController(userId);

        var request = new UpdateUserPreferencesRequest
        {
            DefaultPage = "shopping",
            LocationLatitude = 40.7128,
            LocationLongitude = -74.0060,
            LocationDisplayName = "New York, NY",
        };

        var updatedPreferences = new UserPreferencesResponse
        {
            DefaultPage = request.DefaultPage,
            LocationLatitude = request.LocationLatitude,
            LocationLongitude = request.LocationLongitude,
            LocationDisplayName = request.LocationDisplayName,
        };

        mockService.Setup(s => s.UpdatePreferences(userId, request, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(updatedPreferences);

        // Act
        var result = await controller.UpdatePreferences(request, CancellationToken.None);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(updatedPreferences);
    }

    [Fact]
    public async Task Should_ReturnInternalServerError_When_UpdatePreferencesThrows()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var (controller, mockService) = BuildController(userId);

        var request = new UpdateUserPreferencesRequest { DefaultPage = "pantry" };

        mockService.Setup(s => s.UpdatePreferences(userId, request, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new Exception("Database unavailable"));

        // Act
        var result = await controller.UpdatePreferences(request, CancellationToken.None);

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }
}
