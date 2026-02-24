// ABOUTME: Tests for StoreRepository verifying CRUD operations and household/personal filtering.
// ABOUTME: Uses InMemory database provider to test store queries with ordering and navigation loading.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class StoreRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateStore_When_ValidStoreProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() };

        // Act
        var result = await repo.Create(store);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Target");
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Walmart", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(store.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeHousehold_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Home", InviteCode = "ABC123" };
        var store = new Store { Id = Guid.NewGuid(), Name = "Costco", HouseholdId = household.Id };
        context.Households.Add(household);
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(store.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Household.Should().NotBeNull();
        result.Household!.Name.Should().Be("Home");
    }

    [Fact]
    public async Task Should_ReturnHouseholdStoresOrderedByName_When_GetHouseholdStores()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var householdId = Guid.NewGuid();
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Walmart", HouseholdId = householdId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Aldi", HouseholdId = householdId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() });
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetHouseholdStores(householdId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Aldi");
        result[1].Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_ReturnPersonalStoresOrderedByName_When_GetPersonalStores()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var userId = Guid.NewGuid();
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Walmart", UserId = userId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Aldi", UserId = userId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() });
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetPersonalStores(userId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Aldi");
        result[1].Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_UpdateStore_When_ValidStoreProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Old Name", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        store.Name = "New Name";
        var result = await repo.Update(store);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteStore_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Doomed", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(store.Id);

        // Assert
        var result = await context.Stores.FindAsync(store.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingStore()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
