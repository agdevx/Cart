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
        model.FindEntityType(typeof(Store)).Should().NotBeNull();
        model.FindEntityType(typeof(InventoryItem)).Should().NotBeNull();
        model.FindEntityType(typeof(Trip)).Should().NotBeNull();
        model.FindEntityType(typeof(TripItem)).Should().NotBeNull();
        model.FindEntityType(typeof(UserPreferences)).Should().NotBeNull();
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
            Name = "Test User",
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
            savedUser.Name.Should().Be("Test User");
        }
    }

    [Fact]
    public async Task Should_SetCreatedFields_When_AddingEntity()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "audit@test.com", Name = "Audit" };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert — no HttpContext means CreatedBy stays Guid.Empty (no claim to parse)
        user.CreatedBy.Should().Be(Guid.Empty);
        user.CreatedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        user.ModifiedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Should_SetModifiedFields_When_UpdatingEntity()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "audit@test.com", Name = "Audit" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var originalCreatedDate = user.CreatedDate;
        var originalCreatedBy = user.CreatedBy;

        // Act
        await Task.Delay(10);
        user.Name = "Updated";
        context.Users.Update(user);
        await context.SaveChangesAsync();

        // Assert
        user.CreatedBy.Should().Be(originalCreatedBy);
        user.CreatedDate.Should().Be(originalCreatedDate);
        user.ModifiedDate.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_LeaveCreatedByEmpty_When_NoHttpContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        //== No IHttpContextAccessor passed — simulates background or startup scenarios
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "system@test.com", Name = "System Test" };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert — audit hook only sets Guid values when a valid claim exists
        user.CreatedBy.Should().Be(Guid.Empty);
        user.ModifiedBy.Should().Be(Guid.Empty);
    }
}
