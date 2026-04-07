// ABOUTME: Interface for trip event broadcasting service
// ABOUTME: Manages SSE connections, real-time event delivery, and presence tracking

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripEventService
{
    IObservable<TripEvent> SubscribeToTrip(Guid tripId);
    void PublishEvent(TripEvent tripEvent);
    void UnsubscribeFromTrip(Guid tripId);
    void RegisterPresence(Guid tripId, Guid userId, string userName);
    void UnregisterPresence(Guid tripId, Guid userId);
    List<PresenceEntry> GetPresence(Guid tripId, Guid excludeUserId);
    void IncrementSubscribers(Guid tripId);
    void DecrementSubscribers(Guid tripId);
}

public record PresenceEntry(Guid UserId, string UserName);
