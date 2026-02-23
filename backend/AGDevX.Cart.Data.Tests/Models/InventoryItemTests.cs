// ABOUTME: Test suite for InventoryItem model validation
// ABOUTME: Verifies household-scoped and user-scoped inventory item configurations
using AGDevX.Cart.Data.Models;
using FluentAssertions;

namespace AGDevX.Cart.Data.Tests.Models;

public class InventoryItemTests
{
    [Fact]
    public void Should_HaveHouseholdIdAndNoOwner_When_HouseholdScoped()
    {
        // Arrange
        var householdId = Guid.NewGuid();

        // Act
        var item = new InventoryItem
        {
            Name = "Milk",
            HouseholdId = householdId,
            OwnerUserId = null
        };

        // Assert
        item.HouseholdId.Should().Be(householdId);
        item.OwnerUserId.Should().BeNull();
        item.Name.Should().Be("Milk");
    }

    [Fact]
    public void Should_HaveOwnerAndNoHousehold_When_PersonalScoped()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var item = new InventoryItem
        {
            Name = "Personal Snack",
            OwnerUserId = userId,
            HouseholdId = null
        };

        // Assert
        item.OwnerUserId.Should().Be(userId);
        item.HouseholdId.Should().BeNull();
        item.Name.Should().Be("Personal Snack");
    }
}
