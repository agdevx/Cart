// ABOUTME: Tests for InventoryService verifying privacy enforcement and authorization for inventory items
// ABOUTME: Validates household membership checks and user ownership for both household and personal inventory items

using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class InventoryServiceTests
{
    private readonly Mock<IInventoryRepository> _mockInventoryRepository;
    private readonly Mock<IHouseholdRepository> _mockHouseholdRepository;
    private readonly InventoryService _inventoryService;

    public InventoryServiceTests()
    {
        _mockInventoryRepository = new Mock<IInventoryRepository>();
        _mockHouseholdRepository = new Mock<IHouseholdRepository>();
        _inventoryService = new InventoryService(_mockInventoryRepository.Object, _mockHouseholdRepository.Object);
    }

    [Fact]
    public async Task Should_CreateHouseholdItem_When_UserIsMember()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test Household"
        };
        var member = new HouseholdMember
        {
            HouseholdId = householdId,
            UserId = userId,
            Role = "admin"
        };
        household.Members = new List<HouseholdMember> { member };

        var inventoryItem = new InventoryItem
        {
            Name = "Milk",
            HouseholdId = householdId
        };

        _mockHouseholdRepository
            .Setup(r => r.GetById(householdId))
            .ReturnsAsync(household);

        _mockInventoryRepository
            .Setup(r => r.Create(It.IsAny<InventoryItem>()))
            .ReturnsAsync((InventoryItem item) => { item.Id = Guid.NewGuid(); return item; });

        //== Act
        var result = await _inventoryService.CreateInventoryItem(inventoryItem, userId);

        //== Assert
        Assert.NotNull(result);
        Assert.Equal("Milk", result.Name);
        Assert.Equal(householdId, result.HouseholdId);
        _mockInventoryRepository.Verify(r => r.Create(It.IsAny<InventoryItem>()), Times.Once);
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

        _mockInventoryRepository
            .Setup(r => r.GetPersonalItems(userId))
            .ReturnsAsync(personalItems);

        //== Act
        var result = await _inventoryService.GetPersonalInventory(userId);

        //== Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
        Assert.All(result, item => Assert.Equal(userId, item.OwnerUserId));
        _mockInventoryRepository.Verify(r => r.GetPersonalItems(userId), Times.Once);
    }
}
