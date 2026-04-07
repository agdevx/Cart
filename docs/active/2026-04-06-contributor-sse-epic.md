# Contributor/SSE Epic

## Design Spec

### Overview

Three interconnected improvements to the real-time collaboration experience on household trips:

1. **SSE Heartbeat** — Prevent Cloudflare Tunnel from killing idle SSE connections
2. **SSE on All Trip Pages** — Real-time updates on planning and add-items pages, not just active shopping
3. **Presence Indicator** — "Who's shopping with you" on the active trip page

---

### Piece 1: SSE Heartbeat

**Problem:** Cloudflare Tunnel enforces a 100-second idle timeout on proxied connections. If no data is written to the SSE response within that window, Cloudflare kills the connection. The browser's `EventSource` auto-reconnects, but the user experiences a brief gap and a full refetch.

**Fix:** In `TripEventsController`, write `:heartbeat\n\n` (an SSE comment, ignored by `EventSource`) to the response stream every 60 seconds.

**Implementation detail:** The current `await foreach` loop over the observable's `ToAsyncEnumerable()` cannot be directly interleaved with a timer. The loop must be refactored to use manual async enumeration (`GetAsyncEnumerator()` + `MoveNextAsync()`) so each iteration step can race against a `PeriodicTimer(60s)` via `Task.WhenAny`. Whichever task wins the race is consumed and nulled out; the losing task is reused on the next iteration (critical — calling `MoveNextAsync()` or `WaitForNextTickAsync()` while a previous call is still pending would throw). When an event wins, process it normally. When the timer wins, write the heartbeat comment.

The `PeriodicTimer` must be disposed in a `try/finally` block when the connection ends.

**Subject cleanup:** The current code never calls `UnsubscribeFromTrip`, leaving `Subject<TripEvent>` instances in the `ConcurrentDictionary` after all subscribers disconnect. As part of this refactor, add reference counting to `TripEventService`. When the last subscriber for a trip disconnects, remove and dispose the Subject. This prevents a memory leak on long-running server instances.

**No frontend changes.** SSE comment lines are invisible to the `EventSource` message handler.

---

### Piece 2: SSE on All Trip Pages

Add `useSSE` to `TripDetailPage` and `AddTripItemsPage` with the same "invalidate query cache on any event" pattern used by `ActiveTripPage`.

- Same URL: `/api/v1/trips/{tripId}/events`
- Same callback: invalidate `['trips', tripId, 'items']`
- **The callback must be wrapped in `useCallback` with `[queryClient, tripId]` deps** to prevent the `useSSE` hook from tearing down and reconnecting on every render (its `useEffect` depends on `[url, onMessage, enabled]`).
- **Gate on trip status:** `enabled: !trip?.isCompleted` — completed trips don't need SSE connections.
- No backend changes needed.

---

### Piece 3: Presence — "Who's Shopping With You"

#### Backend: Presence Registry

`TripEventService` gains a presence registry alongside its existing event Subjects:

```
ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, (string Name, int ConnectionCount)>>
```

Mapping: `tripId → { userId → (userName, connectionCount) }`

- **`RegisterPresence(tripId, userId, userName)`** — Increments `connectionCount` for this user on this trip. If the user is new (count goes from 0 to 1), publishes a `UserJoined` event to the trip's Subject so other subscribers see it instantly.
- **`UnregisterPresence(tripId, userId)`** — Decrements `connectionCount`. Only publishes `UserLeft` when count reaches 0 (handles multiple tabs — closing one tab doesn't remove the user from presence).
- **`GetPresence(tripId, excludeUserId)`** — Returns the list of currently connected users for a trip, excluding the specified user. Used to build the `PresenceSnapshot` event.

The `Name` field comes from `User.Name`. If null, fall back to `User.Email`.

#### Backend: New SSE Event Types

The `TripEvent` model gains three new event types:

| Event Type | Data Shape | When |
|---|---|---|
| `PresenceSnapshot` | `{ users: [{ userId, userName }] }` | Sent immediately when an SSE connection opens (excludes the subscriber) |
| `UserJoined` | `{ userId, userName }` | When a new user connects to the trip's SSE stream |
| `UserLeft` | `{ userId, userName }` | When a user's last connection to the trip closes |

**`PresenceSnapshot` eliminates the need for a separate REST endpoint.** The SSE stream itself delivers the initial presence state on connection, avoiding a race condition between an HTTP fetch and the SSE subscription. No separate `GET /presence` endpoint needed.

**SSE visibility filter:** The controller's `ShouldFilterEvent` method is extended. For `UserJoined` and `UserLeft` events, filter out events where the userId matches the subscriber (you don't need to see "you joined"). `PresenceSnapshot` is never filtered — it's already scoped to exclude the subscriber. For `UserJoined`/`UserLeft`, the existing `isHouseholdItem`/`createdBy` string-matching logic does not apply — short-circuit before those checks.

#### Backend: Connection Lifecycle in TripEventsController

When an SSE connection opens:
1. Register presence: `RegisterPresence(tripId, userId, userName)`
2. Send `PresenceSnapshot` event with current users (excluding this subscriber)
3. Enter the event/heartbeat loop

When the connection closes (via `OperationCanceledException` from the cancellation token, or `IOException` from a broken pipe):
1. Unregister presence: `UnregisterPresence(tripId, userId)`

**Stale presence acknowledgment:** If the server process crashes or the TCP connection is severed without a clean close, the cancellation token may not fire promptly. In that case, presence becomes stale until the user reconnects (which triggers a fresh `PresenceSnapshot` for other subscribers). For a household shopping app, this is acceptable — stale presence clears quickly because EventSource auto-reconnects.

#### Frontend: ActiveTripPage Only

Presence is only displayed on `ActiveTripPage`. The other trip pages get SSE for item sync (Piece 2) but do not show the "who's shopping" indicator.

**Event routing:** The `handleSSEMessage` callback changes from a one-liner (blindly invalidate cache) to an event-type dispatcher:

- `PresenceSnapshot` → replace the entire `presenceList` state
- `UserJoined` → add user to `presenceList`
- `UserLeft` → remove user from `presenceList`
- All item events (`ItemAdded`, `ItemUpdated`, `ItemChecked`, `ItemRemoved`) → invalidate `['trips', tripId, 'items']` query cache (existing behavior)

**UI:** When `presenceList` has entries, render a banner above the shopping list:
- Teal initial circle (first letter of name) + "{Name} is shopping with you"
- Multiple people: multiple bubbles + "Sarah and Mike are shopping with you"
- No one else connected: banner doesn't render (no empty state, no placeholder)
- Banner appears/disappears with a fade animation

---

### Edge Cases

- **Personal trips** — only the creator has access. Presence will always be empty. The banner never renders. No special handling needed.
- **Multiple tabs** — reference counting ensures a user's presence persists until their last tab closes.
- **Completed trips** — SSE is not connected (`enabled: !trip?.isCompleted`). No presence tracking, no heartbeat overhead.
- **User leaves household while connected** — their SSE connection remains until disconnected (cookie session is still valid). On next reconnect after session refresh, `HasTripAccess` returns false and they get 403.
- **Server restart** — all SSE connections drop. `EventSource` auto-reconnects. Presence registry starts fresh. Each reconnection triggers `RegisterPresence` + `PresenceSnapshot`, so presence rebuilds within seconds.

---

### Key Test Cases

**Backend:**
- Heartbeat writes comment every 60s when no events arrive
- Subject cleanup when last subscriber disconnects (reference counting)
- RegisterPresence publishes UserJoined for new users
- RegisterPresence does NOT publish UserJoined for additional tabs (count > 1)
- UnregisterPresence publishes UserLeft only when count reaches 0
- UnregisterPresence does NOT publish UserLeft when other tabs remain (count > 0)
- PresenceSnapshot excludes the subscriber
- ShouldFilterEvent filters out your own UserJoined/UserLeft
- ShouldFilterEvent passes through other users' UserJoined/UserLeft

**Frontend:**
- ActiveTripPage renders presence banner when PresenceSnapshot has users
- ActiveTripPage adds user on UserJoined event
- ActiveTripPage removes user on UserLeft event
- ActiveTripPage hides banner when presenceList is empty
- TripDetailPage connects SSE when trip is not completed
- TripDetailPage does NOT connect SSE for completed trips
- AddTripItemsPage connects SSE and invalidates cache on item events

## Implementation Plan

_To be written after spec approval._
