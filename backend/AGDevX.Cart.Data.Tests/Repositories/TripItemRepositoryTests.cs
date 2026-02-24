// ABOUTME: Tests for TripItemRepository verifying CRUD operations and navigation property loading.
// ABOUTME: Uses InMemory database provider to test trip item queries with InventoryItem and Store includes.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class TripItemRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateTripItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        await context.SaveChangesAsync();
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 2 };

        // Act
        var result = await repo.Create(tripItem);

        // Assert
        result.Should().NotBeNull();
        result.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task Should_ReturnTripItem_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripItem.Id);

        // Assert
        result.Should().NotBeNull();
        result!.InventoryItem.Should().NotBeNull();
        result.InventoryItem!.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeStore_When_GetByIdWithStoreAssigned()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        context.Stores.Add(new Store { Id = storeId, Name = "Costco", UserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1, StoreId = storeId };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripItem.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Store.Should().NotBeNull();
        result.Store!.Name.Should().Be("Costco");
    }

    [Fact]
    public async Task Should_ReturnOnlyTripItems_When_GetTripItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var otherTripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run 1", IsCompleted = false });
        context.Trips.Add(new Trip { Id = otherTripId, Name = "Run 2", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = otherTripId, InventoryItemId = inventoryItemId, Quantity = 3 });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetTripItems(tripId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Quantity.Should().Be(1);
    }

    [Fact]
    public async Task Should_UpdateTripItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        tripItem.Quantity = 5;
        var result = await repo.Update(tripItem);

        // Assert
        result.Quantity.Should().Be(5);
    }

    [Fact]
    public async Task Should_DeleteTripItem_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(tripItem.Id);

        // Assert
        var result = await context.TripItems.FindAsync(tripItem.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingTripItem()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
