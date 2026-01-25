// ABOUTME: Interface for trip event broadcasting service
// ABOUTME: Manages SSE connections and real-time event delivery

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripEventService
{
    IObservable<TripEvent> SubscribeToTrip(Guid tripId);
    void PublishEvent(TripEvent tripEvent);
    void UnsubscribeFromTrip(Guid tripId);
}
