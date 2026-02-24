// ABOUTME: Tests for TripRepository verifying CRUD operations and collaborator management.
// ABOUTME: Uses InMemory database provider to test trip queries including creator and collaborator access.

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
    public async Task Should_IncludeCollaboratorsAndItems_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = userId });
        var trip = new Trip { Id = tripId, Name = "Run", IsCompleted = false };
        context.Trips.Add(trip);
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripId);

        // Assert
        result.Should().NotBeNull();
        result!.Collaborators.Should().HaveCount(1);
        result.Items.Should().HaveCount(1);
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

        // Act
        var result = await repo.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_ReturnTripsWhereUserIsCollaborator_When_GetUserTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var creatorUserId = Guid.NewGuid();

        //== Create trip as a different user so userId is only a collaborator, not the creator
        using (var ctx = CreateContextForUser(dbName, creatorUserId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
            ctx.Trips.Add(new Trip { Id = tripId, Name = "Collab Trip", IsCompleted = false });
            ctx.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Collab Trip");
    }

    [Fact]
    public async Task Should_ReturnHouseholdTrips_When_GetHouseholdTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var householdId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Household Trip", IsCompleted = false, HouseholdId = householdId });
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Other Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetHouseholdTrips(householdId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Household Trip");
    }

    [Fact]
    public async Task Should_ReturnTrue_When_IsUserCollaboratorAsCreator()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        //== Create trip as userId so the audit hook sets CreatedBy naturally
        using (var ctx = CreateContextForUser(dbName, userId))
        {
            ctx.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.IsUserCollaborator(tripId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_IsUserCollaboratorAsExplicitCollaborator()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var creatorUserId = Guid.NewGuid();

        //== Create trip as a different user so userId is only an explicit collaborator, not the creator
        using (var ctx = CreateContextForUser(dbName, creatorUserId))
        {
            ctx.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
            ctx.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
            ctx.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
            await ctx.SaveChangesAsync();
        }

        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.IsUserCollaborator(tripId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_IsUserCollaboratorForUnrelatedUser()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserCollaborator(tripId, Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_IsUserCollaboratorForNonExistingTrip()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.IsUserCollaborator(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_AddCollaborator_When_ValidIds()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        await repo.AddCollaborator(tripId, userId);

        // Assert
        var exists = await context.TripCollaborators.AnyAsync(c => c.TripId == tripId && c.UserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Should_RemoveCollaborator_When_CollaboratorExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        await context.SaveChangesAsync();

        // Act
        await repo.RemoveCollaborator(tripId, userId);

        // Assert
        var exists = await context.TripCollaborators.AnyAsync(c => c.TripId == tripId && c.UserId == userId);
        exists.Should().BeFalse();
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
