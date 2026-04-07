// ABOUTME: Unit tests for TripService covering trip lifecycle management (create, complete, reopen)
// ABOUTME: and scope-based authorization with personal and household trips
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class TripServiceTests
{
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly CartDbContext _dbContext;
    private readonly TripService _tripService;

    public TripServiceTests()
    {
        _mockTripRepository = new Mock<ITripRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _tripService = new TripService(_mockTripRepository.Object, _dbContext, _mockTripItemRepository.Object);
    }

    [Fact]
    public async Task Should_CreateTrip_WithNameAndDefaults()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CreateTrip("Weekly Grocery Run", null, null, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Weekly Grocery Run", result.Name);
        Assert.False(result.IsCompleted);
        Assert.Null(result.CompletedAt);
    }

    [Fact]
    public async Task Should_CompleteTrip_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Test Trip", IsCompleted = false };

        _mockTripRepository.Setup(x => x.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(x => x.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CompleteTrip(tripId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCompleted);
        Assert.NotNull(result.CompletedAt);
    }

    [Fact]
    public async Task Should_ThrowException_When_CompletingTripWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripService.CompleteTrip(tripId, userId));
    }

    [Fact]
    public async Task Should_ReturnTrips_When_GetUserTrips()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trips = new List<Trip> { new() { Id = Guid.NewGuid(), Name = "Trip 1", IsCompleted = false } };
        _mockTripRepository.Setup(r => r.GetUserTrips(userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(trips);

        // Act
        var result = await _tripService.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTrip_When_GetById()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "My Trip", IsCompleted = false };
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _tripService.GetById(tripId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_UpdateTripName_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Old Name", IsCompleted = false };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.UpdateTrip(tripId, "New Name", null, userId);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingTripWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripService.UpdateTrip(tripId, "New Name", null, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_UpdatingNonExistingTrip()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync((Trip?)null);

        // Act
        var act = () => _tripService.UpdateTrip(tripId, "New Name", null, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_DeleteTrip_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.Delete(tripId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        await _tripService.DeleteTrip(tripId, userId);

        // Assert
        _mockTripRepository.Verify(r => r.Delete(tripId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingTripWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripService.DeleteTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReopenTrip_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Completed", IsCompleted = true, CompletedAt = DateTime.UtcNow };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.ReopenTrip(tripId, userId);

        // Assert
        result.IsCompleted.Should().BeFalse();
        result.CompletedAt.Should().NotBeNull("CompletedAt is a historical record and is preserved on reopen");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_ReopeningTripWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripService.ReopenTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_StartTrip_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Planning Trip", IsCompleted = false, IsStarted = false };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.StartTrip(tripId, userId);

        // Assert
        result.IsStarted.Should().BeTrue();
        result.StartedAt.Should().NotBeNull();
        result.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_StartingTripWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripService.StartTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_StartingNonExistingTrip()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync((Trip?)null);

        // Act
        var act = () => _tripService.StartTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_ResetIsStarted_When_ReopeningTrip()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip
        {
            Id = tripId,
            Name = "Started Trip",
            IsCompleted = true,
            CompletedAt = DateTime.UtcNow,
            IsStarted = true,
            StartedAt = DateTime.UtcNow.AddHours(-1)
        };

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.ReopenTrip(tripId, userId);

        // Assert
        result.IsStarted.Should().BeFalse();
        result.StartedAt.Should().NotBeNull("StartedAt is a historical record and is preserved on reopen");
        result.IsCompleted.Should().BeFalse();
        result.CompletedAt.Should().NotBeNull("CompletedAt is a historical record and is preserved on reopen");
    }

    [Fact]
    public async Task Should_InitializeIsStartedFalse_When_CreatingTrip()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CreateTrip("New Trip", null, null, userId);

        // Assert
        result.IsStarted.Should().BeFalse();
        result.StartedAt.Should().BeNull();
    }

    [Fact]
    public async Task Should_SetTripDate_When_CreatingTripWithNonNullDate()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripDate = new DateOnly(2025, 6, 15);
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CreateTrip("Trip With Date", tripDate, null, userId);

        // Assert
        result.TripDate.Should().Be(tripDate);
    }

    [Fact]
    public async Task Should_LeaveTripDateNull_When_CreatingTripWithNullDate()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CreateTrip("Trip Without Date", null, null, userId);

        // Assert
        result.TripDate.Should().BeNull();
    }

    [Fact]
    public async Task Should_UpdateTripDate_When_UpdatingTripWithNonNullDate()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var tripDate = new DateOnly(2025, 8, 20);
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.UpdateTrip(tripId, "Trip", tripDate, userId);

        // Assert
        result.TripDate.Should().Be(tripDate);
    }

    [Fact]
    public async Task Should_PreserveExistingTripDate_When_UpdatingTripWithNullDate()
    {
        /*
         * Null means "don't change" — the service's null-check guard ensures
         * passing null does not clear a previously-set TripDate.
         */
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var existingDate = new DateOnly(2025, 5, 1);
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false, TripDate = existingDate };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>(), It.IsAny<CancellationToken>())).ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.UpdateTrip(tripId, "Trip", null, userId);

        // Assert
        result.TripDate.Should().Be(existingDate, "null tripDate should not overwrite an existing value");
    }

    [Fact]
    public async Task CreateTrip_WithHouseholdId_SetsTripHouseholdId()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        _mockTripRepository.Setup(x => x.Create(It.IsAny<Trip>(), It.IsAny<CancellationToken>()))
                           .ReturnsAsync((Trip t, CancellationToken _) => t);

        // Act
        var result = await _tripService.CreateTrip("Household Trip", null, householdId, userId);

        // Assert
        result.HouseholdId.Should().Be(householdId);
    }
}
