// ABOUTME: Tests for InventoryRepository verifying CRUD operations and privacy filtering.
// ABOUTME: Uses InMemory database provider to test household vs personal inventory queries.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class InventoryRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Milk", OwnerUserId = Guid.NewGuid() };

        // Act
        var result = await repo.Create(item);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Eggs", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(item.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Eggs");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeDefaultStore_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Costco", UserId = Guid.NewGuid() };
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Butter", OwnerUserId = Guid.NewGuid(), DefaultStoreId = store.Id };
        context.Stores.Add(store);
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(item.Id);

        // Assert
        result.Should().NotBeNull();
        result!.DefaultStore.Should().NotBeNull();
        result.DefaultStore!.Name.Should().Be("Costco");
    }

    [Fact]
    public async Task Should_ReturnOnlyHouseholdItems_When_GetHouseholdItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var householdId = Guid.NewGuid();
        var householdItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Shared Milk", HouseholdId = householdId };
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(householdItem, personalItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetHouseholdItems(householdId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Shared Milk");
    }

    [Fact]
    public async Task Should_ReturnOnlyPersonalItems_When_GetPersonalItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var userId = Guid.NewGuid();
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = userId };
        var otherItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Other Snack", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(personalItem, otherItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetPersonalItems(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Snack");
    }

    [Fact]
    public async Task Should_ReturnHouseholdAndPersonalItems_When_GetMergedInventory()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var householdItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Shared Milk", HouseholdId = householdId };
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = userId };
        var unrelatedItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Unrelated", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(householdItem, personalItem, unrelatedItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetMergedInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(i => i.Name).Should().Contain("Shared Milk").And.Contain("My Snack");
    }

    [Fact]
    public async Task Should_UpdateItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Old Name", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        item.Name = "New Name";
        var result = await repo.Update(item);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteItem_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Doomed", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(item.Id);

        // Assert
        var result = await context.InventoryItems.FindAsync(item.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingItem()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
