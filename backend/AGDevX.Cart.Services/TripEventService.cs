// ABOUTME: In-memory trip event broadcasting service using Reactive Extensions
// ABOUTME: Manages SSE subscriptions and publishes events to connected clients

using System.Collections.Concurrent;
using System.Reactive.Subjects;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripEventService : ITripEventService
{
    //== ConcurrentDictionary maintains per-trip event subjects for isolated broadcasting
    private readonly ConcurrentDictionary<Guid, Subject<TripEvent>> _tripSubjects = new();

    public IObservable<TripEvent> SubscribeToTrip(Guid tripId)
    {
        //== GetOrAdd ensures single subject per trip, preventing duplicate subscriptions
        var subject = _tripSubjects.GetOrAdd(tripId, _ => new Subject<TripEvent>());
        return subject;
    }

    public void PublishEvent(TripEvent tripEvent)
    {
        //== Only publish if there are active subscribers for this trip
        if (_tripSubjects.TryGetValue(tripEvent.TripId, out var subject))
        {
            subject.OnNext(tripEvent);
        }
    }

    public void UnsubscribeFromTrip(Guid tripId)
    {
        //== Clean up completed subscriptions to prevent memory leaks
        if (_tripSubjects.TryRemove(tripId, out var subject))
        {
            subject.OnCompleted();
            subject.Dispose();
        }
    }
}
