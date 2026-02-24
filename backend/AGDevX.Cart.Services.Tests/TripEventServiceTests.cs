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
        var tripId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();
        var receivedEvents = new List<TripEvent>();

        var subscription = service.SubscribeToTrip(tripId);
        subscription.Subscribe(e => receivedEvents.Add(e));

        var tripEvent = new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            TripItemId = tripItemId,
            Timestamp = DateTime.UtcNow
        };

        // Act
        service.PublishEvent(tripEvent);

        // Assert
        receivedEvents.Should().HaveCount(1);
        receivedEvents[0].EventType.Should().Be("ItemAdded");
    }

    [Fact]
    public void Should_ReturnObservable_When_SubscribingToTrip()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();

        // Act
        var observable = service.SubscribeToTrip(tripId);

        // Assert
        observable.Should().NotBeNull();
    }

    [Fact]
    public void Should_NotThrow_When_PublishingEventWithNoSubscribers()
    {
        // Arrange
        var service = new TripEventService();
        var tripEvent = new TripEvent
        {
            TripId = Guid.NewGuid(),
            EventType = "ItemAdded",
            Timestamp = DateTime.UtcNow
        };

        // Act
        var act = () => service.PublishEvent(tripEvent);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Should_CompleteSubject_When_UnsubscribingFromTrip()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();
        var completed = false;

        var observable = service.SubscribeToTrip(tripId);
        observable.Subscribe(_ => { }, () => completed = true);

        // Act
        service.UnsubscribeFromTrip(tripId);

        // Assert
        completed.Should().BeTrue();
    }

    [Fact]
    public void Should_DeliverToMultipleSubscribers_When_PublishingEvent()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();
        var received1 = new List<TripEvent>();
        var received2 = new List<TripEvent>();

        var observable = service.SubscribeToTrip(tripId);
        observable.Subscribe(e => received1.Add(e));
        observable.Subscribe(e => received2.Add(e));

        var tripEvent = new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            Timestamp = DateTime.UtcNow
        };

        // Act
        service.PublishEvent(tripEvent);

        // Assert
        received1.Should().HaveCount(1);
        received2.Should().HaveCount(1);
    }

    [Fact]
    public void Should_ReturnSameObservable_When_SubscribingToSameTripTwice()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();

        // Act
        var observable1 = service.SubscribeToTrip(tripId);
        var observable2 = service.SubscribeToTrip(tripId);

        // Assert
        observable1.Should().BeSameAs(observable2);
    }
}
