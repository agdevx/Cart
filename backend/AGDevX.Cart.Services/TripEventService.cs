// ABOUTME: In-memory trip event broadcasting service using Reactive Extensions
// ABOUTME: Manages SSE subscriptions, publishes events, tracks presence, and ref-counts subscribers

using System.Collections.Concurrent;
using System.Reactive.Subjects;
using System.Text.Json;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripEventService : ITripEventService
{
    //== ConcurrentDictionary maintains per-trip event subjects for isolated broadcasting
    private readonly ConcurrentDictionary<Guid, Subject<TripEvent>> _tripSubjects = new();

    //== Presence: tripId → { userId → (userName, connectionCount) }
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, (string Name, int Count)>> _presence = new();

    //== Subscriber ref count per trip for Subject lifecycle management
    private readonly ConcurrentDictionary<Guid, int> _subscriberCounts = new();

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

        _presence.TryRemove(tripId, out _);
        _subscriberCounts.TryRemove(tripId, out _);
    }

    public void RegisterPresence(Guid tripId, Guid userId, string userName)
    {
        var tripPresence = _presence.GetOrAdd(tripId, _ => new ConcurrentDictionary<Guid, (string, int)>());

        var (_, count) = tripPresence.AddOrUpdate(
            userId,
            addValue: (userName, 1),
            updateValueFactory: (_, existing) => (existing.Name, existing.Count + 1));

        //== Only publish UserJoined for the first connection (count was 0, now 1)
        if (count == 1)
        {
            var data = JsonSerializer.Serialize(new { userId, userName });

            PublishEvent(new TripEvent
            {
                TripId = tripId,
                EventType = "UserJoined",
                Data = data,
                Timestamp = DateTime.UtcNow,
            });
        }
    }

    public void UnregisterPresence(Guid tripId, Guid userId)
    {
        if (!_presence.TryGetValue(tripId, out var tripPresence))
        {
            return;
        }

        string? removedUserName = null;

        /*
         * Atomic decrement-or-remove using AddOrUpdate. If count reaches 0,
         * remove the entry entirely. This avoids TOCTOU races when multiple
         * tabs disconnect concurrently.
         */
        tripPresence.AddOrUpdate(
            userId,
            addValue: ("", 0), // should not happen — unregister without register
            updateValueFactory: (_, existing) =>
            {
                if (existing.Count <= 1)
                {
                    removedUserName = existing.Name;
                    return (existing.Name, 0); // mark for removal
                }
                return (existing.Name, existing.Count - 1);
            });

        //== Clean up zero-count entries and publish UserLeft
        if (removedUserName != null)
        {
            tripPresence.TryRemove(userId, out _);

            var data = JsonSerializer.Serialize(new { userId, userName = removedUserName });

            PublishEvent(new TripEvent
            {
                TripId = tripId,
                EventType = "UserLeft",
                Data = data,
                Timestamp = DateTime.UtcNow,
            });
        }
    }

    public List<PresenceEntry> GetPresence(Guid tripId, Guid excludeUserId)
    {
        if (!_presence.TryGetValue(tripId, out var tripPresence))
        {
            return [];
        }

        return tripPresence
            .Where(kvp => kvp.Key != excludeUserId)
            .Select(kvp => new PresenceEntry(kvp.Key, kvp.Value.Name))
            .ToList();
    }

    public void IncrementSubscribers(Guid tripId)
    {
        _subscriberCounts.AddOrUpdate(tripId, 1, (_, count) => count + 1);
    }

    public void DecrementSubscribers(Guid tripId)
    {
        var newCount = _subscriberCounts.AddOrUpdate(tripId, 0, (_, count) => Math.Max(0, count - 1));

        //== Clean up subject when last subscriber disconnects
        if (newCount == 0)
        {
            UnsubscribeFromTrip(tripId);
        }
    }
}
