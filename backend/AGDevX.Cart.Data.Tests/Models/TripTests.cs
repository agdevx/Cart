// ABOUTME: Tests for Trip model behavior and properties
// ABOUTME: Validates trip creation, completion tracking, and state management
using FluentAssertions;
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Tests.Models;

public class TripTests
{
    [Fact]
    public void Should_NotBeCompleted_When_CreatingNewTrip()
    {
        // Arrange & Act
        var trip = new Trip
        {
            Name = "Grocery Shopping",
            CreatedByUserId = Guid.NewGuid()
        };

        // Assert
        trip.IsCompleted.Should().BeFalse();
        trip.CompletedAt.Should().BeNull();
    }

    [Fact]
    public void Should_TrackCompletionTime_When_MarkedCompleted()
    {
        // Arrange
        var trip = new Trip
        {
            Name = "Grocery Shopping",
            CreatedByUserId = Guid.NewGuid()
        };

        // Act
        trip.IsCompleted = true;
        trip.CompletedAt = DateTime.UtcNow;

        // Assert
        trip.IsCompleted.Should().BeTrue();
        trip.CompletedAt.Should().NotBeNull();
        trip.CompletedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }
}
