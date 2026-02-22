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
    private readonly Mock<ITripEventService> _mockTripEventService;
    private readonly TripItemService _tripItemService;

    public TripItemServiceTests()
    {
        _mockTripItemRepository = new Mock<ITripItemRepository>();
        _mockTripRepository = new Mock<ITripRepository>();
        _mockTripEventService = new Mock<ITripEventService>();
        _tripItemService = new TripItemService(_mockTripItemRepository.Object, _mockTripRepository.Object, _mockTripEventService.Object);
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

    [Fact]
    public async Task Should_PublishItemAddedEvent_When_AddingTripItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var quantity = 2;

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripItemRepository
            .Setup(x => x.CreateAsync(It.IsAny<TripItem>()))
            .ReturnsAsync((TripItem ti) => { ti.Id = itemId; return ti; });

        // Act
        await _tripItemService.AddTripItemAsync(tripId, inventoryItemId, quantity, userId, null, null);

        // Assert
        _mockTripEventService.Verify(x => x.PublishEvent(
            It.Is<TripEvent>(e => e.TripId == tripId && e.EventType == "ItemAdded" && e.TripItemId == itemId)),
            Times.Once);
    }

    [Fact]
    public async Task Should_PublishItemUpdatedEvent_When_UpdatingTripItem()
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
        await _tripItemService.UpdateTripItemAsync(tripItemId, 5, userId, "Updated notes", null);

        // Assert
        _mockTripEventService.Verify(x => x.PublishEvent(
            It.Is<TripEvent>(e => e.TripId == tripId && e.EventType == "ItemUpdated" && e.TripItemId == tripItemId)),
            Times.Once);
    }

    [Fact]
    public async Task Should_PublishItemCheckedEvent_When_CheckingItem()
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
        await _tripItemService.CheckItemAsync(tripItemId, true, userId);

        // Assert
        _mockTripEventService.Verify(x => x.PublishEvent(
            It.Is<TripEvent>(e => e.TripId == tripId && e.EventType == "ItemChecked" && e.TripItemId == tripItemId)),
            Times.Once);
    }

    [Fact]
    public async Task Should_PublishItemRemovedEvent_When_DeletingTripItem()
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
        };

        _mockTripItemRepository
            .Setup(x => x.GetByIdAsync(tripItemId))
            .ReturnsAsync(tripItem);

        _mockTripRepository
            .Setup(x => x.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        _mockTripItemRepository
            .Setup(x => x.DeleteAsync(tripItemId))
            .Returns(Task.CompletedTask);

        // Act
        await _tripItemService.DeleteTripItemAsync(tripItemId, userId);

        // Assert
        _mockTripEventService.Verify(x => x.PublishEvent(
            It.Is<TripEvent>(e => e.TripId == tripId && e.EventType == "ItemRemoved" && e.TripItemId == tripItemId)),
            Times.Once);
    }
}
