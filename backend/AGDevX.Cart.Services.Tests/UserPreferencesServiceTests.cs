// ABOUTME: Unit tests for UserPreferencesService covering get and update preferences scenarios.
// ABOUTME: Validates default/empty responses for new users and correct mapping on create/update.

using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class UserPreferencesServiceTests
{
    private readonly Mock<IUserPreferencesRepository> _mockRepository;
    private readonly UserPreferencesService _service;

    public UserPreferencesServiceTests()
    {
        _mockRepository = new Mock<IUserPreferencesRepository>();
        _service = new UserPreferencesService(_mockRepository.Object);
    }

    [Fact]
    public async Task Should_ReturnEmptyResponse_When_NoPreferencesExist()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(r => r.GetByUserId(userId, It.IsAny<CancellationToken>()))
                       .ReturnsAsync((UserPreferences?)null);

        // Act
        var result = await _service.GetPreferences(userId);

        // Assert
        result.Should().NotBeNull();
        result.DefaultPage.Should().BeNull();
        result.LocationLatitude.Should().BeNull();
        result.LocationLongitude.Should().BeNull();
        result.LocationDisplayName.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReturnPopulatedResponse_When_PreferencesExist()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var prefs = new UserPreferences
        {
            UserId = userId,
            DefaultPage = "home",
            LocationLatitude = 47.6062,
            LocationLongitude = -122.3321,
            LocationDisplayName = "Seattle, WA",
        };

        _mockRepository.Setup(r => r.GetByUserId(userId, It.IsAny<CancellationToken>()))
                       .ReturnsAsync(prefs);

        // Act
        var result = await _service.GetPreferences(userId);

        // Assert
        result.Should().NotBeNull();
        result.DefaultPage.Should().Be("home");
        result.LocationLatitude.Should().Be(47.6062);
        result.LocationLongitude.Should().Be(-122.3321);
        result.LocationDisplayName.Should().Be("Seattle, WA");
    }

    [Fact]
    public async Task Should_CreatePreferences_When_NoneExist()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest
        {
            DefaultPage = "shopping",
            LocationLatitude = 40.7128,
            LocationLongitude = -74.0060,
            LocationDisplayName = "New York, NY",
        };

        _mockRepository.Setup(r => r.CreateOrUpdate(It.IsAny<UserPreferences>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((UserPreferences p, CancellationToken _) => p);

        // Act
        var result = await _service.UpdatePreferences(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DefaultPage.Should().Be("shopping");
        result.LocationLatitude.Should().Be(40.7128);
        result.LocationLongitude.Should().Be(-74.0060);
        result.LocationDisplayName.Should().Be("New York, NY");

        _mockRepository.Verify(r => r.CreateOrUpdate(
            It.Is<UserPreferences>(p => p.UserId == userId && p.DefaultPage == "shopping"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_UpdatePreferences_When_PreferencesAlreadyExist()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest
        {
            DefaultPage = "pantry",
            LocationLatitude = 34.0522,
            LocationLongitude = -118.2437,
            LocationDisplayName = "Los Angeles, CA",
        };

        var updated = new UserPreferences
        {
            UserId = userId,
            DefaultPage = request.DefaultPage,
            LocationLatitude = request.LocationLatitude,
            LocationLongitude = request.LocationLongitude,
            LocationDisplayName = request.LocationDisplayName,
        };

        _mockRepository.Setup(r => r.CreateOrUpdate(It.IsAny<UserPreferences>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync(updated);

        // Act
        var result = await _service.UpdatePreferences(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DefaultPage.Should().Be("pantry");
        result.LocationLatitude.Should().Be(34.0522);
        result.LocationLongitude.Should().Be(-118.2437);
        result.LocationDisplayName.Should().Be("Los Angeles, CA");

        _mockRepository.Verify(r => r.CreateOrUpdate(
            It.Is<UserPreferences>(p => p.UserId == userId),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
