// ABOUTME: Unit tests for TripService covering trip lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership
using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class TripServiceTests
{
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<IHouseholdRepository> _mockHouseholdRepository;
    private readonly TripService _tripService;

    public TripServiceTests()
    {
        _mockTripRepository = new Mock<ITripRepository>();
        _mockHouseholdRepository = new Mock<IHouseholdRepository>();
        _tripService = new TripService(_mockTripRepository.Object, _mockHouseholdRepository.Object);
    }

    [Fact]
    public async Task Should_CreateTrip_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var tripName = "Weekly Grocery Run";

        _mockHouseholdRepository
            .Setup(x => x.IsUserMemberAsync(householdId, userId))
            .ReturnsAsync(true);

        _mockTripRepository
            .Setup(x => x.CreateAsync(It.IsAny<Trip>()))
            .ReturnsAsync((Trip t) => t);

        // Act
        var result = await _tripService.CreateTripAsync(tripName, userId, householdId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(tripName, result.Name);
        Assert.Equal(userId, result.CreatedByUserId);
        Assert.Equal(householdId, result.HouseholdId);
        Assert.False(result.IsCompleted);
        Assert.Null(result.CompletedAt);
    }

    [Fact]
    public async Task Should_CompleteTrip_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip
        {
            Id = tripId,
            Name = "Test Trip",
            CreatedByUserId = Guid.NewGuid(),
            IsCompleted = false
        };

        _mockTripRepository
            .Setup(x => x.GetByIdAsync(tripId))
            .ReturnsAsync(trip);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripRepository
            .Setup(x => x.UpdateAsync(It.IsAny<Trip>()))
            .ReturnsAsync((Trip t) => t);

        // Act
        var result = await _tripService.CompleteTripAsync(tripId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCompleted);
        Assert.NotNull(result.CompletedAt);
    }

    [Fact]
    public async Task Should_ThrowException_When_CreatingTripForNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var tripName = "Weekly Grocery Run";

        _mockHouseholdRepository
            .Setup(x => x.IsUserMemberAsync(householdId, userId))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripService.CreateTripAsync(tripName, userId, householdId));
    }

    [Fact]
    public async Task Should_ThrowException_When_CompletingTripAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip
        {
            Id = tripId,
            Name = "Test Trip",
            CreatedByUserId = Guid.NewGuid(),
            IsCompleted = false
        };

        _mockTripRepository
            .Setup(x => x.GetByIdAsync(tripId))
            .ReturnsAsync(trip);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripService.CompleteTripAsync(tripId, userId));
    }
}
