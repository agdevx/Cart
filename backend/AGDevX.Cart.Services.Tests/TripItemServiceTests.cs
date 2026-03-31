// ABOUTME: Unit tests for TripItemService covering trip item operations (add, check/uncheck)
// ABOUTME: with scope-based authorization checks ensuring users have trip access
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class TripItemServiceTests
{
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<ITripEventService> _mockTripEventService;
    private readonly Mock<IInventoryRepository> _mockInventoryRepository;
    private readonly Mock<IStoreRepository> _mockStoreRepository;
    private readonly CartDbContext _dbContext;
    private readonly TripItemService _tripItemService;

    public TripItemServiceTests()
    {
        _mockTripItemRepository = new Mock<ITripItemRepository>();
        _mockTripRepository = new Mock<ITripRepository>();
        _mockTripEventService = new Mock<ITripEventService>();
        _mockInventoryRepository = new Mock<IInventoryRepository>();
        _mockStoreRepository = new Mock<IStoreRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _tripItemService = new TripItemService(
            _mockTripItemRepository.Object,
            _mockTripRepository.Object,
            _mockTripEventService.Object,
            _mockInventoryRepository.Object,
            _mockStoreRepository.Object,
            _dbContext);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_AddItemToTrip_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var quantity = 2;
        var notes = "Get the organic brand";
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockInventoryRepository.Setup(x => x.GetById(inventoryItemId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(new InventoryItem { Id = inventoryItemId, Name = "Milk" });
        _mockTripItemRepository.Setup(x => x.Create(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.AddTripItem(tripId, inventoryItemId, quantity, userId, notes, null);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(tripId, result.TripId);
        Assert.Equal(inventoryItemId, result.InventoryItemId);
        Assert.Equal("Milk", result.ItemName);
        Assert.Equal(quantity, result.Quantity);
        Assert.Equal(notes, result.Notes);
        Assert.False(result.IsChecked);
        Assert.Null(result.CheckedAt);
    }

    [Fact]
    public async Task Should_CheckItem_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            ItemName = "Test Item",
            Quantity = 1,
            IsChecked = false,
            CheckedAt = null,
        };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.CheckItem(tripItemId, true, userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsChecked);
        Assert.NotNull(result.CheckedAt);
    }

    [Fact]
    public async Task Should_UncheckItem_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            ItemName = "Test Item",
            Quantity = 1,
            IsChecked = true,
            CheckedAt = DateTime.UtcNow,
        };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.CheckItem(tripItemId, false, userId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsChecked);
        Assert.Null(result.CheckedAt);
    }

    [Fact]
    public async Task Should_ThrowException_When_AddingItemWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripItemService.AddTripItem(tripId, inventoryItemId, 1, userId, null, null));
    }

    [Fact]
    public async Task Should_ThrowException_When_CheckingItemWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = tripId,
            InventoryItemId = Guid.NewGuid(),
            ItemName = "Test Item",
            Quantity = 1,
            IsChecked = false,
        };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _tripItemService.CheckItem(tripItemId, true, userId));
    }

    [Fact]
    public async Task Should_PublishItemAddedEvent_When_AddingTripItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockInventoryRepository.Setup(x => x.GetById(inventoryItemId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(new InventoryItem { Id = inventoryItemId, Name = "Milk" });
        _mockTripItemRepository.Setup(x => x.Create(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => { ti.Id = itemId; return ti; });

        // Act
        await _tripItemService.AddTripItem(tripId, inventoryItemId, 2, userId, null, null);

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
        await SeedUser(userId);

        var tripItem = new TripItem { Id = tripItemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Test Item", Quantity = 1 };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        await _tripItemService.UpdateTripItem(tripItemId, 5, userId, "Updated notes", null);

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
        await SeedUser(userId);

        var tripItem = new TripItem { Id = tripItemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Test Item", Quantity = 1, IsChecked = false, CheckedAt = null };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        await _tripItemService.CheckItem(tripItemId, true, userId);

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
        await SeedUser(userId);

        var tripItem = new TripItem { Id = tripItemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Test Item", Quantity = 1 };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Delete(tripItemId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        await _tripItemService.DeleteTripItem(tripItemId, userId);

        // Assert
        _mockTripEventService.Verify(x => x.PublishEvent(
            It.Is<TripEvent>(e => e.TripId == tripId && e.EventType == "ItemRemoved" && e.TripItemId == tripItemId)),
            Times.Once);
    }

    [Fact]
    public async Task Should_ReturnItems_When_GetTripItemsWithAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        var items = new List<TripItem> { new() { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", Quantity = 1, IsHouseholdItem = false, CreatedBy = userId } };
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(r => r.GetTripItems(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(items);
        _mockTripRepository.Setup(r => r.GetById(tripId, It.IsAny<CancellationToken>())).ReturnsAsync(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });

        // Act
        var result = await _tripItemService.GetTripItems(tripId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetTripItemsWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripItemService.GetTripItems(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdWithAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", Quantity = 2 };
        _mockTripItemRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _tripItemService.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((TripItem?)null);

        // Act
        var result = await _tripItemService.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", Quantity = 1 };
        _mockTripItemRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripItemService.GetById(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_UpdatingNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((TripItem?)null);

        // Act
        var act = () => _tripItemService.UpdateTripItem(Guid.NewGuid(), 1, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_DeleteTripItem_When_UserHasAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", Quantity = 1 };
        _mockTripItemRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(r => r.Delete(itemId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        await _tripItemService.DeleteTripItem(itemId, userId);

        // Assert
        _mockTripItemRepository.Verify(r => r.Delete(itemId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingTripItemWithoutAccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", Quantity = 1 };
        _mockTripItemRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var act = () => _tripItemService.DeleteTripItem(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_DeletingNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((TripItem?)null);

        // Act
        var act = () => _tripItemService.DeleteTripItem(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddTripItem_PopulatesItemNameFromInventoryItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockInventoryRepository.Setup(x => x.GetById(inventoryItemId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(new InventoryItem { Id = inventoryItemId, Name = "Organic Eggs" });
        _mockTripItemRepository.Setup(x => x.Create(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.AddTripItem(tripId, inventoryItemId, 1, userId);

        // Assert
        result.ItemName.Should().Be("Organic Eggs");
        result.InventoryItemId.Should().Be(inventoryItemId);
    }

    [Fact]
    public async Task UpdateTripItem_UpdatesStoreNameWhenStoreChanges()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var newStoreId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = tripItemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", StoreName = "Costco", StoreId = Guid.NewGuid(), Quantity = 1 };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockStoreRepository.Setup(x => x.GetById(newStoreId, It.IsAny<CancellationToken>()))
                            .ReturnsAsync(new Store { Id = newStoreId, Name = "Walmart" });
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.UpdateTripItem(tripItemId, 2, userId, null, newStoreId);

        // Assert
        result.StoreName.Should().Be("Walmart");
        result.StoreId.Should().Be(newStoreId);
    }

    [Fact]
    public async Task UpdateTripItem_ClearsStoreNameWhenStoreRemoved()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        await SeedUser(userId);

        var tripItem = new TripItem { Id = tripItemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), ItemName = "Milk", StoreName = "Costco", StoreId = Guid.NewGuid(), Quantity = 1 };

        _mockTripItemRepository.Setup(x => x.GetById(tripItemId, It.IsAny<CancellationToken>())).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.Update(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.UpdateTripItem(tripItemId, 2, userId, null, null);

        // Assert
        result.StoreName.Should().BeNull();
        result.StoreId.Should().BeNull();
    }

    [Fact]
    public async Task AddTripItem_PopulatesStoreNameWhenStoreProvided()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockInventoryRepository.Setup(x => x.GetById(inventoryItemId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(new InventoryItem { Id = inventoryItemId, Name = "Milk" });
        _mockStoreRepository.Setup(x => x.GetById(storeId, It.IsAny<CancellationToken>()))
                            .ReturnsAsync(new Store { Id = storeId, Name = "Costco" });
        _mockTripItemRepository.Setup(x => x.Create(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.AddTripItem(tripId, inventoryItemId, 1, userId, null, storeId);

        // Assert
        result.ItemName.Should().Be("Milk");
        result.StoreName.Should().Be("Costco");
        result.StoreId.Should().Be(storeId);
    }

    [Fact]
    public async Task AddTripItem_StoreNameIsNullWhenNoStoreProvided()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(tripId, userId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _mockInventoryRepository.Setup(x => x.GetById(inventoryItemId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(new InventoryItem { Id = inventoryItemId, Name = "Bread" });
        _mockTripItemRepository.Setup(x => x.Create(It.IsAny<TripItem>(), It.IsAny<CancellationToken>()))
                               .ReturnsAsync((TripItem ti, CancellationToken _) => ti);

        // Act
        var result = await _tripItemService.AddTripItem(tripId, inventoryItemId, 1, userId, null, null);

        // Assert
        result.StoreName.Should().BeNull();
    }
}
