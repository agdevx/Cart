// ABOUTME: Tests for TripRepository verifying CRUD operations and scope-based access control.
// ABOUTME: Uses InMemory database provider to test trip queries with personal and household authorization.

using System.Security.Claims;
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class TripRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    //== Creates a context with a mocked HttpContext so the audit hook sets CreatedBy to the given userId
    private static CartDbContext CreateContextForUser(string dbName, Guid userId)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, userId.ToString())
            ]))
        };

        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        return new CartDbContext(options, accessor);
    }

    [Fact]
    public async Task Should_CreateTrip_When_ValidTripProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Weekly Run", IsCompleted = false };

        // Act
        var result = await repo.Create(trip);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Weekly Run");
    }

    [Fact]
    public async Task Should_ReturnTrip_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Weekly Run", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(trip.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Weekly Run");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeItems_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var trip = new Trip { Id = tripId, Name = "Run", IsCompleted = false };
        context.Trips.Add(trip);
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, ItemName = "Milk", Quantity = 1 });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripId);

        // Assert
        result.Should().NotBeNull();
        result!.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTripsWhereUserIsCreator_When_GetUserTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        //== Create myTrip as userId so the audit hook sets CreatedBy naturally
        using (var ctx = CreateContextForUser(dbName, userId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "me@test.com", Name = "Me" });
            ctx.Users.Add(new User { Id = otherUserId, Email = "other@test.com", Name = "Other" });
            ctx.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "My Trip", IsCompleted = false });
            await ctx.SaveChangesAsync();
        }

        //== Create otherTrip as a different user
        using (var ctx = CreateContextForUser(dbName, otherUserId))
        {
            ctx.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Other Trip", IsCompleted = false });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act — no household, so only personal trips returned
        var result = await repo.GetUserTrips(userId, null);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_ReturnHouseholdTrips_When_GetUserTripsWithHouseholdId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        //== Create a household trip by another user but in the same household
        using (var ctx = CreateContextForUser(dbName, otherUserId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "me@test.com", Name = "Me", HouseholdId = householdId });
            ctx.Users.Add(new User { Id = otherUserId, Email = "other@test.com", Name = "Other", HouseholdId = householdId });
            ctx.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = otherUserId });
            ctx.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Household Trip", IsCompleted = false, HouseholdId = householdId });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act — household trip should be returned because user is in the household
        var result = await repo.GetUserTrips(userId, householdId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Household Trip");
    }

    [Fact]
    public async Task Should_ReturnTrue_When_HasTripAccessAsCreator()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        //== Create trip as userId so the audit hook sets CreatedBy naturally
        using (var ctx = CreateContextForUser(dbName, userId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "me@test.com", Name = "Me" });
            ctx.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.HasTripAccess(tripId, userId, null);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_HasTripAccessAsHouseholdMember()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        //== Trip created by another user but scoped to household
        using (var ctx = CreateContextForUser(dbName, otherUserId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "me@test.com", Name = "Me", HouseholdId = householdId });
            ctx.Users.Add(new User { Id = otherUserId, Email = "other@test.com", Name = "Other", HouseholdId = householdId });
            ctx.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "XYZ789", Owner1UserId = otherUserId });
            ctx.Trips.Add(new Trip { Id = tripId, Name = "Household Trip", IsCompleted = false, HouseholdId = householdId });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.HasTripAccess(tripId, userId, householdId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_HasTripAccessForUnrelatedUser()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.HasTripAccess(tripId, Guid.NewGuid(), null);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_HasTripAccessForNonExistingTrip()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.HasTripAccess(Guid.NewGuid(), Guid.NewGuid(), null);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_UpdateTrip_When_ValidTripProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Old", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        trip.Name = "Updated";
        var result = await repo.Update(trip);

        // Assert
        result.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task Should_DeleteTrip_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Doomed", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(trip.Id);

        // Assert
        var result = await context.Trips.FindAsync(trip.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingTrip()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
