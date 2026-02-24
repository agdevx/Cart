// ABOUTME: Unit tests for TripService covering trip lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
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

        _mockHouseholdRepository.Setup(x => x.IsUserMember(householdId, userId))
                                .ReturnsAsync(true);

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>()))
                           .ReturnsAsync((Trip t) => t);

        // Act
        var result = await _tripService.CreateTrip(tripName, userId, householdId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(tripName, result.Name);
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
            IsCompleted = false
        };

        _mockTripRepository.Setup(x => x.GetById(tripId))
                           .ReturnsAsync(trip);

        _mockTripRepository.Setup(x => x.IsUserCollaborator(tripId, userId))
                           .ReturnsAsync(true);

        _mockTripRepository.Setup(x => x.Update(It.IsAny<Trip>()))
                           .ReturnsAsync((Trip t) => t);

        // Act
        var result = await _tripService.CompleteTrip(tripId, userId);

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

        _mockHouseholdRepository.Setup(x => x.IsUserMember(householdId, userId))
                                .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripService.CreateTrip(tripName, userId, householdId));
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
            IsCompleted = false
        };

        _mockTripRepository.Setup(x => x.GetById(tripId))
                           .ReturnsAsync(trip);

        _mockTripRepository.Setup(x => x.IsUserCollaborator(tripId, userId))
                           .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripService.CompleteTrip(tripId, userId));
    }

    [Fact]
    public async Task Should_ReturnTrips_When_GetUserTrips()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var trips = new List<Trip> { new() { Id = Guid.NewGuid(), Name = "Trip 1", IsCompleted = false } };

        _mockTripRepository.Setup(r => r.GetUserTrips(userId)).ReturnsAsync(trips);

        // Act
        var result = await _tripService.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTrips_When_GetHouseholdTrips()
    {
        // Arrange
        var householdId = Guid.NewGuid();
        var trips = new List<Trip> { new() { Id = Guid.NewGuid(), Name = "Household Trip", IsCompleted = false } };

        _mockTripRepository.Setup(r => r.GetHouseholdTrips(householdId)).ReturnsAsync(trips);

        // Act
        var result = await _tripService.GetHouseholdTrips(householdId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTrip_When_GetById()
    {
        // Arrange
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "My Trip", IsCompleted = false };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);

        // Act
        var result = await _tripService.GetById(tripId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_UpdateTrip_When_ValidTripProvided()
    {
        // Arrange
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Updated", IsCompleted = false };

        _mockTripRepository.Setup(r => r.Update(trip)).ReturnsAsync(trip);

        // Act
        var result = await _tripService.UpdateTrip(trip);

        // Assert
        result.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task Should_DeleteTrip_When_UserIsCreator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Doomed", IsCompleted = false, CreatedBy = userId.ToString() };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Delete(tripId)).Returns(Task.CompletedTask);

        // Act
        await _tripService.DeleteTrip(tripId, userId);

        // Assert
        _mockTripRepository.Verify(r => r.Delete(tripId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingTripAsNonCreator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Not Yours", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);

        // Act
        var act = () => _tripService.DeleteTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_DeletingNonExistingTrip()
    {
        // Arrange
        _mockTripRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Trip?)null);

        // Act
        var act = () => _tripService.DeleteTrip(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_ReopenTrip_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Completed", IsCompleted = true, CompletedAt = DateTime.UtcNow };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>())).ReturnsAsync((Trip t) => t);

        // Act
        var result = await _tripService.ReopenTrip(tripId, userId);

        // Assert
        result.IsCompleted.Should().BeFalse();
        result.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_ReopeningTripAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _tripService.ReopenTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_AddCollaborator_When_UserIsCollaboratorAndTargetIsHouseholdMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false, HouseholdId = householdId };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockHouseholdRepository.Setup(r => r.IsUserMember(householdId, collaboratorUserId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.AddCollaborator(tripId, collaboratorUserId)).Returns(Task.CompletedTask);

        // Act
        await _tripService.AddCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        _mockTripRepository.Verify(r => r.AddCollaborator(tripId, collaboratorUserId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_AddingCollaboratorAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _tripService.AddCollaborator(tripId, userId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_AddingNonHouseholdMemberAsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false, HouseholdId = householdId };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockHouseholdRepository.Setup(r => r.IsUserMember(householdId, collaboratorUserId)).ReturnsAsync(false);

        // Act
        var act = () => _tripService.AddCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_RemoveCollaborator_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.RemoveCollaborator(tripId, collaboratorUserId)).Returns(Task.CompletedTask);

        // Act
        await _tripService.RemoveCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        _mockTripRepository.Verify(r => r.RemoveCollaborator(tripId, collaboratorUserId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_RemovingCollaboratorAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _tripService.RemoveCollaborator(tripId, userId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
