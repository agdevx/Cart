// ABOUTME: Tests for the ImportInventoryItems service method
// ABOUTME: Validates item creation, store auto-creation, duplicate skipping, household validation, and row validation

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class InventoryImportServiceTests
{
    private readonly Mock<IInventoryRepository> _mockInventoryRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly Mock<IStoreRepository> _mockStoreRepository;
    private readonly CartDbContext _dbContext;
    private readonly InventoryService _inventoryService;

    public InventoryImportServiceTests()
    {
        _mockInventoryRepository = new Mock<IInventoryRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();
        _mockStoreRepository = new Mock<IStoreRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _inventoryService = new InventoryService(
            _mockInventoryRepository.Object,
            _dbContext,
            _mockTripItemRepository.Object,
            _mockStoreRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_ImportPersonalItems_When_ValidInput()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "Bread", Notes = "Whole wheat", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(2);
        result.HouseholdItemsImported.Should().Be(0);
        result.DuplicatesSkipped.Should().Be(0);
        result.HouseholdItemsSkipped.Should().Be(0);
        result.InvalidRowsSkipped.Should().Be(0);
    }

    [Fact]
    public async Task Should_ImportHouseholdItems_When_UserHasHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "household" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsImported.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipHouseholdItems_When_UserHasNoHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "household" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipDuplicates_AgainstExistingItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem> { new() { Name = "Milk", OwnerUserId = userId } });
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "milk", Scope = "personal" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipDuplicates_WithinCsv()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "milk", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_AllowSameNameInDifferentScopes()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "Milk", Scope = "household" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(0);
    }

    [Fact]
    public async Task Should_SkipInvalidRows()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "", Scope = "personal" },
            new() { Name = "  ", Scope = "personal" },
            new() { Name = "Valid", Scope = "badscope" },
            new() { Name = "Good Item", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.InvalidRowsSkipped.Should().Be(3);
    }

    [Fact]
    public async Task Should_AutoCreateStores_WhenNotExisting()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "Costco", Scope = "personal" },
            new() { Name = "Bread", DefaultStore = "Costco", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(2);

        //== Verify only one store was created for both items referencing "Costco"
        _dbContext.ChangeTracker.Entries<Store>().Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_AutoCreateHouseholdStore_WhenNotExisting()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "Costco", Scope = "household" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.HouseholdItemsImported.Should().Be(1);

        var createdStore = _dbContext.ChangeTracker.Entries<Store>().Single().Entity;
        createdStore.HouseholdId.Should().Be(householdId);
        createdStore.UserId.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReuseExistingStore_CaseInsensitive()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var existingStore = new Store { Id = Guid.NewGuid(), Name = "COSTCO", UserId = userId };
        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store> { existingStore });

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "costco", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);

        //== No new stores should be created — existing "COSTCO" matches "costco"
        _dbContext.ChangeTracker.Entries<Store>().Should().HaveCount(0);
    }

    [Fact]
    public async Task Should_Reject_WhenOverRowLimit()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var items = Enumerable.Range(0, 501)
            .Select(i => new ImportInventoryItemRequest { Name = $"Item {i}", Scope = "personal" })
            .ToList();

        //== Act
        var act = () => _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*500*");
    }
}
