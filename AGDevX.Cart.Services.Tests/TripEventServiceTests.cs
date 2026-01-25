// ABOUTME: Tests for trip event broadcasting service
// ABOUTME: Validates SSE connection management and event delivery

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;

namespace AGDevX.Cart.Services.Tests;

public class TripEventServiceTests
{
    [Fact]
    public void Should_BroadcastEvent_When_EventPublished()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = 1;
        var receivedEvents = new List<TripEvent>();

        var subscription = service.SubscribeToTrip(tripId);
        subscription.Subscribe(e => receivedEvents.Add(e));

        var tripEvent = new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            TripItemId = 1,
            Timestamp = DateTime.UtcNow
        };

        // Act
        service.PublishEvent(tripEvent);

        // Assert
        receivedEvents.Should().HaveCount(1);
        receivedEvents[0].EventType.Should().Be("ItemAdded");
    }
}
