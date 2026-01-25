// ABOUTME: Unit tests for TripItemService covering trip item operations (add, check/uncheck)
// ABOUTME: with authorization checks ensuring users are collaborators on the trip
using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class TripItemServiceTests
{
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly TripItemService _tripItemService;

    public TripItemServiceTests()
    {
        _mockTripItemRepository = new Mock<ITripItemRepository>();
        _mockTripRepository = new Mock<ITripRepository>();
        _tripItemService = new TripItemService(_mockTripItemRepository.Object, _mockTripRepository.Object);
    }

    [Fact]
    public async Task Should_AddItemToTrip_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var quantity = 2;
        var notes = "Get the organic brand";

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripItemRepository
            .Setup(x => x.CreateAsync(It.IsAny<TripItem>()))
            .ReturnsAsync((TripItem ti) => ti);

        // Act
        var result = await _tripItemService.AddTripItemAsync(tripId, inventoryItemId, quantity, userId, notes, null);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(tripId, result.TripId);
        Assert.Equal(inventoryItemId, result.InventoryItemId);
        Assert.Equal(quantity, result.Quantity);
        Assert.Equal(notes, result.Notes);
        Assert.False(result.IsChecked);
        Assert.Null(result.CheckedAt);
    }

    [Fact]
    public async Task Should_CheckItem_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            Quantity = 1,
            IsChecked = false,
            CheckedAt = null,
            Trip = null!,
            InventoryItem = null!
        };

        _mockTripItemRepository
            .Setup(x => x.GetByIdAsync(tripItemId))
            .ReturnsAsync(tripItem);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripItemRepository
            .Setup(x => x.UpdateAsync(It.IsAny<TripItem>()))
            .ReturnsAsync((TripItem ti) => ti);

        // Act
        var result = await _tripItemService.CheckItemAsync(tripItemId, true, userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsChecked);
        Assert.NotNull(result.CheckedAt);
    }

    [Fact]
    public async Task Should_UncheckItem_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            Quantity = 1,
            IsChecked = true,
            CheckedAt = DateTime.UtcNow,
            Trip = null!,
            InventoryItem = null!
        };

        _mockTripItemRepository
            .Setup(x => x.GetByIdAsync(tripItemId))
            .ReturnsAsync(tripItem);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripItemRepository
            .Setup(x => x.UpdateAsync(It.IsAny<TripItem>()))
            .ReturnsAsync((TripItem ti) => ti);

        // Act
        var result = await _tripItemService.CheckItemAsync(tripItemId, false, userId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsChecked);
        Assert.Null(result.CheckedAt);
    }

    [Fact]
    public async Task Should_ThrowException_When_AddingItemAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripItemService.AddTripItemAsync(tripId, inventoryItemId, 1, userId, null, null));
    }

    [Fact]
    public async Task Should_ThrowException_When_CheckingItemAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            Quantity = 1,
            IsChecked = false,
            Trip = null!,
            InventoryItem = null!
        };

        _mockTripItemRepository
            .Setup(x => x.GetByIdAsync(tripItemId))
            .ReturnsAsync(tripItem);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripItemService.CheckItemAsync(tripItemId, true, userId));
    }
}
