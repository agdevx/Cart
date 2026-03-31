// ABOUTME: Tests for InventoryService verifying privacy enforcement and authorization for inventory items
// ABOUTME: Validates household membership checks via User.HouseholdId and user ownership

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class InventoryServiceTests
{
    private readonly Mock<IInventoryRepository> _mockInventoryRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly CartDbContext _dbContext;
    private readonly InventoryService _inventoryService;

    public InventoryServiceTests()
    {
        _mockInventoryRepository = new Mock<IInventoryRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _inventoryService = new InventoryService(_mockInventoryRepository.Object, _dbContext, _mockTripItemRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_CreateHouseholdItem_When_UserIsMember()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var inventoryItem = new InventoryItem { Name = "Milk", HouseholdId = householdId };

        _mockInventoryRepository.Setup(r => r.Create(It.IsAny<InventoryItem>(), It.IsAny<CancellationToken>()))
                                .ReturnsAsync((InventoryItem item, CancellationToken _) => { item.Id = Guid.NewGuid(); return item; });

        //== Act
        var result = await _inventoryService.CreateInventoryItem(inventoryItem, userId);

        //== Assert
        Assert.NotNull(result);
        Assert.Equal("Milk", result.Name);
        Assert.Equal(householdId, result.HouseholdId);
        _mockInventoryRepository.Verify(r => r.Create(It.IsAny<InventoryItem>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_OnlyReturnUserItems_When_GettingPersonalInventory()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var personalItems = new List<InventoryItem>
        {
            new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Item 1", OwnerUserId = userId },
            new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Item 2", OwnerUserId = userId }
        };

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
                                .ReturnsAsync(personalItems);

        //== Act
        var result = await _inventoryService.GetPersonalInventory(userId);

        //== Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
        Assert.All(result, item => Assert.Equal(userId, item.OwnerUserId));
        _mockInventoryRepository.Verify(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_SetOwnerUserId_When_CreatingPersonalItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Snack" };

        _mockInventoryRepository.Setup(r => r.Create(It.IsAny<InventoryItem>(), It.IsAny<CancellationToken>()))
                                .ReturnsAsync((InventoryItem i, CancellationToken _) => i);

        // Act
        var result = await _inventoryService.CreateInventoryItem(item, userId);

        // Assert
        result.OwnerUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdItemAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        //== User belongs to a different household
        await SeedUser(userId, Guid.NewGuid());

        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Milk", HouseholdId = householdId };

        // Act
        var act = () => _inventoryService.CreateInventoryItem(item, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_AggregatePersonalAndHouseholdItems_When_GetAllUserInventory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var personalItems = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Personal", OwnerUserId = userId } };
        var householdItems = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Shared", HouseholdId = householdId } };

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>())).ReturnsAsync(personalItems);
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(householdItems);

        // Act
        var result = await _inventoryService.GetAllUserInventory(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(i => i.Name).Should().Contain("Personal").And.Contain("Shared");
    }

    [Fact]
    public async Task Should_ReturnHouseholdItems_When_GetHouseholdInventoryAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var items = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Milk", HouseholdId = householdId } };
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(items);

        // Act
        var result = await _inventoryService.GetHouseholdInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetHouseholdInventoryAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId); // No household

        // Act
        var act = () => _inventoryService.GetHouseholdInventory(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnMergedItems_When_GetMergedInventoryAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var items = new List<InventoryItem>
        {
            new() { Id = Guid.NewGuid(), Name = "Shared", HouseholdId = householdId },
            new() { Id = Guid.NewGuid(), Name = "Personal", OwnerUserId = userId }
        };

        _mockInventoryRepository.Setup(r => r.GetMergedInventory(householdId, userId, It.IsAny<CancellationToken>())).ReturnsAsync(items);

        // Act
        var result = await _inventoryService.GetMergedInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetMergedInventoryAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId); // No household

        // Act
        var act = () => _inventoryService.GetMergedInventory(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdForHouseholdItemAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var item = new InventoryItem { Id = itemId, Name = "Milk", HouseholdId = householdId };
        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(item);

        // Act
        var result = await _inventoryService.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdForPersonalItemAsOwner()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var item = new InventoryItem { Id = itemId, Name = "My Snack", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(item);

        // Act
        var result = await _inventoryService.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Snack");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((InventoryItem?)null);

        // Act
        var result = await _inventoryService.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdForOtherUsersPersonalItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var item = new InventoryItem { Id = itemId, Name = "Not Yours", OwnerUserId = Guid.NewGuid() };

        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(item);

        // Act
        var act = () => _inventoryService.GetById(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_UpdateItem_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new InventoryItem { Id = itemId, Name = "Old", OwnerUserId = userId };
        var updated = new InventoryItem { Id = itemId, Name = "New", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockInventoryRepository.Setup(r => r.Update(It.IsAny<InventoryItem>(), It.IsAny<CancellationToken>()))
                                .ReturnsAsync((InventoryItem i, CancellationToken _) => i);

        // Act
        var result = await _inventoryService.UpdateInventoryItem(updated, userId);

        // Assert
        result.Name.Should().Be("New");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((InventoryItem?)null);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Ghost" };

        // Act
        var act = () => _inventoryService.UpdateInventoryItem(item, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_DeleteItem_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var existing = new InventoryItem { Id = itemId, Name = "Doomed", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockInventoryRepository.Setup(r => r.Delete(itemId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        await _inventoryService.DeleteInventoryItem(itemId, userId);

        // Assert
        _mockInventoryRepository.Verify(r => r.Delete(itemId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((InventoryItem?)null);

        // Act
        var act = () => _inventoryService.DeleteInventoryItem(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateInventoryItem_UpdatesItemNameOnRelatedTripItems()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new InventoryItem { Id = itemId, Name = "Old Name", OwnerUserId = userId };
        var updated = new InventoryItem { Id = itemId, Name = "Renamed Item", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockInventoryRepository.Setup(r => r.Update(It.IsAny<InventoryItem>(), It.IsAny<CancellationToken>()))
                                .ReturnsAsync((InventoryItem i, CancellationToken _) => i);
        _mockTripItemRepository.Setup(r => r.UpdateItemNameByInventoryItemId(itemId, "Renamed Item", It.IsAny<CancellationToken>()))
                               .Returns(Task.CompletedTask);

        // Act
        var result = await _inventoryService.UpdateInventoryItem(updated, userId);

        // Assert
        result.Name.Should().Be("Renamed Item");
        _mockTripItemRepository.Verify(r => r.UpdateItemNameByInventoryItemId(itemId, "Renamed Item", It.IsAny<CancellationToken>()), Times.Once);
    }
}
