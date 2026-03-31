// ABOUTME: Tests for HouseholdRepository verifying CRUD operations and membership queries.
// ABOUTME: Uses InMemory database provider to test EF Core queries without requiring actual database.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class HouseholdRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateHousehold_When_ValidHouseholdProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner" });
        await context.SaveChangesAsync();

        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123", Owner1UserId = ownerId };

        // Act
        var result = await repo.Create(household);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Home");
        result.InviteCode.Should().Be("ABC123");
    }

    [Fact]
    public async Task Should_ReturnHousehold_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner" });
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123", Owner1UserId = ownerId };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(household.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test Home");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReturnHousehold_When_GetByInviteCodeWithExistingCode()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner" });
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "XK7M2P", Owner1UserId = ownerId };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetByInviteCode("XK7M2P");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test Home");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByInviteCodeWithNonExistingCode()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.GetByInviteCode("XXXXXX");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReturnUserHousehold_When_GetUserHousehold()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "My Home", InviteCode = "AAA111", Owner1UserId = userId };
        context.Households.Add(household);
        context.Users.Add(new User { Id = userId, Email = "me@test.com", Name = "Me", HouseholdId = householdId });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserHousehold(userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Home");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetUserHouseholdForSoloUser()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "solo@test.com", Name = "Solo" });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserHousehold(userId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReturnMembers_When_GetMembers()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = user1Id });
        context.Users.Add(new User { Id = user1Id, Email = "u1@test.com", Name = "User 1", HouseholdId = householdId });
        context.Users.Add(new User { Id = user2Id, Email = "u2@test.com", Name = "User 2", HouseholdId = householdId });
        context.Users.Add(new User { Id = Guid.NewGuid(), Email = "solo@test.com", Name = "Solo" });
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetMembers(householdId)).ToList();

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Should_UpdateHousehold_When_ValidHouseholdProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner" });
        var household = new Household { Id = Guid.NewGuid(), Name = "Old Name", InviteCode = "ABC123", Owner1UserId = ownerId };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        household.Name = "New Name";
        var result = await repo.Update(household);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteHousehold_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner" });
        var household = new Household { Id = Guid.NewGuid(), Name = "Doomed", InviteCode = "ABC123", Owner1UserId = ownerId };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(household.Id);

        // Assert
        var result = await context.Households.FindAsync(household.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingHousehold()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_UserIsOwner()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner", HouseholdId = householdId });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = ownerId });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserOwner(householdId, ownerId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_UserIsOwner2()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var owner1Id = Guid.NewGuid();
        var owner2Id = Guid.NewGuid();
        context.Users.Add(new User { Id = owner1Id, Email = "o1@test.com", Name = "Owner1", HouseholdId = householdId });
        context.Users.Add(new User { Id = owner2Id, Email = "o2@test.com", Name = "Owner2", HouseholdId = householdId });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = owner1Id, Owner2UserId = owner2Id });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserOwner(householdId, owner2Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_UserIsNotOwner()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        context.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner", HouseholdId = householdId });
        context.Users.Add(new User { Id = memberId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = ownerId });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserOwner(householdId, memberId);

        // Assert
        result.Should().BeFalse();
    }
}
