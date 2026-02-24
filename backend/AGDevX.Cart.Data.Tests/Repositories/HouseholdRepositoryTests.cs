// ABOUTME: Tests for HouseholdRepository verifying CRUD operations and membership management.
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
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123" };

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
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123" };
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
    public async Task Should_IncludeMembers_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Test Home", InviteCode = "ABC123" };
        var member = new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "owner", JoinedAt = DateTime.UtcNow };
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(household);
        context.HouseholdMembers.Add(member);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(householdId);

        // Assert
        result.Should().NotBeNull();
        result!.Members.Should().HaveCount(1);
        result.Members.First().UserId.Should().Be(userId);
    }

    [Fact]
    public async Task Should_ReturnHousehold_When_GetByInviteCodeWithExistingCode()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "XK7M2P" };
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
    public async Task Should_ReturnOnlyUserHouseholds_When_GetUserHouseholds()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var h1 = new Household { Id = Guid.NewGuid(), Name = "My Home", InviteCode = "AAA111" };
        var h2 = new Household { Id = Guid.NewGuid(), Name = "Other Home", InviteCode = "BBB222" };
        context.Users.Add(new User { Id = userId, Email = "me@test.com", DisplayName = "Me" });
        context.Users.Add(new User { Id = otherUserId, Email = "other@test.com", DisplayName = "Other" });
        context.Households.AddRange(h1, h2);
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = h1.Id, UserId = userId, Role = "owner", JoinedAt = DateTime.UtcNow });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = h2.Id, UserId = otherUserId, Role = "owner", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserHouseholds(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Home");
    }

    [Fact]
    public async Task Should_UpdateHousehold_When_ValidHouseholdProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Old Name", InviteCode = "ABC123" };
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
        var household = new Household { Id = Guid.NewGuid(), Name = "Doomed", InviteCode = "ABC123" };
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
    public async Task Should_ReturnTrue_When_UserIsMember()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserMember(householdId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_UserIsNotMember()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.IsUserMember(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_AddMember_When_ValidMemberProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        await context.SaveChangesAsync();
        var member = new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow };

        // Act
        await repo.AddMember(member);

        // Assert
        var exists = await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Should_RemoveMember_When_MemberExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        await repo.RemoveMember(householdId, userId);

        // Assert
        var exists = await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Should_UpdateMemberRole_When_MemberExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        await repo.UpdateMemberRole(householdId, userId, "owner");

        // Assert
        var member = await context.HouseholdMembers.FirstAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        member.Role.Should().Be("owner");
    }
}
