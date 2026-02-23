// ABOUTME: Tests for CartDbContext to verify entity configuration and database operations.
// ABOUTME: Uses InMemory database provider to test DbContext without requiring actual database.

using AGDevX.Cart.Data.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests;

public class CartDbContextTests
{
    [Fact]
    public void Should_ConfigureAllEntities_When_CreatingContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ConfigureEntities")
            .Options;

        // Act
        using var context = new CartDbContext(options);
        var model = context.Model;

        // Assert
        model.FindEntityType(typeof(User)).Should().NotBeNull();
        model.FindEntityType(typeof(Household)).Should().NotBeNull();
        model.FindEntityType(typeof(HouseholdMember)).Should().NotBeNull();
        model.FindEntityType(typeof(Store)).Should().NotBeNull();
        model.FindEntityType(typeof(InventoryItem)).Should().NotBeNull();
        model.FindEntityType(typeof(Trip)).Should().NotBeNull();
        model.FindEntityType(typeof(TripCollaborator)).Should().NotBeNull();
        model.FindEntityType(typeof(TripItem)).Should().NotBeNull();
    }

    [Fact]
    public async Task Should_CreateUser_When_AddingToContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_CreateUser")
            .Options;

        var user = new User
        {
            Email = "test@example.com",
            DisplayName = "Test User",
            CreatedDate = DateTime.UtcNow
        };

        // Act
        using (var context = new CartDbContext(options))
        {
            context.Users.Add(user);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new CartDbContext(options))
        {
            var savedUser = await context.Users.FindAsync(user.Id);
            savedUser.Should().NotBeNull();
            savedUser!.Email.Should().Be("test@example.com");
            savedUser.DisplayName.Should().Be("Test User");
        }
    }
}
