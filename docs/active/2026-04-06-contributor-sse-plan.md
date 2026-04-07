# Contributor/SSE Epic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SSE connection drops under Cloudflare Tunnel, extend real-time updates to all trip pages, and add a "who's shopping with you" presence indicator.

**Architecture:** The SSE heartbeat writes `:heartbeat\n\n` comments every 60s to prevent Cloudflare's 100s idle timeout. Presence tracking uses a concurrent registry in the existing singleton `TripEventService`, with new `PresenceSnapshot`/`UserJoined`/`UserLeft` event types piggybacked on the SSE stream. The frontend gains SSE on `TripDetailPage` and `AddTripItemsPage`, and a presence banner on `ActiveTripPage`.

**Tech Stack:** .NET 10, EF Core, System.Reactive, React 19, TanStack Query, Tailwind CSS 4, Vitest, xUnit

**Spec:** `docs/active/2026-04-06-contributor-sse-epic.md`

---

## File Structure

### Backend (modified files)
- `backend/AGDevX.Cart.Services/ITripEventService.cs` — add presence methods, subscriber counting
- `backend/AGDevX.Cart.Services/TripEventService.cs` — presence registry, subscriber ref counting, cleanup
- `backend/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs` — new presence + ref counting tests
- `backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs` — heartbeat timer, presence lifecycle, event filtering for presence events
- `backend/AGDevX.Cart.Shared/Models/TripEvent.cs` — update comment to document new event types

### Frontend (modified files)
- `frontend/src/pages/shopping/active-trip-page.tsx` — event-type dispatch, presence state, banner
- `frontend/src/pages/shopping/trip-detail-page.tsx` — add SSE
- `frontend/src/pages/shopping/add-trip-items-page.tsx` — add SSE

### Frontend (new files)
- `frontend/src/pages/shopping/presence-banner.tsx` — the "who's shopping with you" UI component
- `frontend/src/pages/shopping/tests/presence-banner.test.tsx` — tests

---

## Task 1: TripEventService — Presence Registry and Subscriber Ref Counting

**Files:**
- Modify: `backend/AGDevX.Cart.Services/ITripEventService.cs`
- Modify: `backend/AGDevX.Cart.Services/TripEventService.cs`
- Modify: `backend/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs`

- [ ] **Step 1: Write failing tests for presence and ref counting**

Add to `backend/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs`:

```csharp
[Fact]
public void Should_PublishUserJoined_When_FirstConnectionForUser()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var receivedEvents = new List<TripEvent>();

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(e => receivedEvents.Add(e));

    // Act
    service.RegisterPresence(tripId, userId, "Sarah");

    // Assert
    receivedEvents.Should().HaveCount(1);
    receivedEvents[0].EventType.Should().Be("UserJoined");
    receivedEvents[0].Data.Should().Contain("Sarah");
}

[Fact]
public void Should_NotPublishUserJoined_When_AdditionalTabForSameUser()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var receivedEvents = new List<TripEvent>();

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(e => receivedEvents.Add(e));

    service.RegisterPresence(tripId, userId, "Sarah");
    receivedEvents.Clear();

    // Act — second tab
    service.RegisterPresence(tripId, userId, "Sarah");

    // Assert
    receivedEvents.Should().BeEmpty();
}

[Fact]
public void Should_PublishUserLeft_When_LastConnectionForUser()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var receivedEvents = new List<TripEvent>();

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(e => receivedEvents.Add(e));

    service.RegisterPresence(tripId, userId, "Sarah");
    receivedEvents.Clear();

    // Act
    service.UnregisterPresence(tripId, userId);

    // Assert
    receivedEvents.Should().HaveCount(1);
    receivedEvents[0].EventType.Should().Be("UserLeft");
}

[Fact]
public void Should_NotPublishUserLeft_When_OtherTabsRemain()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var receivedEvents = new List<TripEvent>();

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(e => receivedEvents.Add(e));

    service.RegisterPresence(tripId, userId, "Sarah");
    service.RegisterPresence(tripId, userId, "Sarah"); // second tab
    receivedEvents.Clear();

    // Act — close one tab
    service.UnregisterPresence(tripId, userId);

    // Assert
    receivedEvents.Should().BeEmpty();
}

[Fact]
public void Should_ReturnPresence_ExcludingSpecifiedUser()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var user1 = Guid.NewGuid();
    var user2 = Guid.NewGuid();

    service.SubscribeToTrip(tripId);
    service.RegisterPresence(tripId, user1, "Sarah");
    service.RegisterPresence(tripId, user2, "Mike");

    // Act
    var presence = service.GetPresence(tripId, excludeUserId: user1);

    // Assert
    presence.Should().HaveCount(1);
    presence[0].UserName.Should().Be("Mike");
}

[Fact]
public void Should_IncrementSubscriberCount_OnSubscribe()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();

    // Act
    service.IncrementSubscribers(tripId);
    service.IncrementSubscribers(tripId);

    // Assert — subject should still exist
    var observable = service.SubscribeToTrip(tripId);
    observable.Should().NotBeNull();
}

[Fact]
public void Should_CleanupSubject_When_LastSubscriberLeaves()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var completed = false;

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(_ => { }, () => completed = true);

    service.IncrementSubscribers(tripId);

    // Act
    service.DecrementSubscribers(tripId);

    // Assert
    completed.Should().BeTrue();
}

[Fact]
public void Should_NotCleanupSubject_When_OtherSubscribersRemain()
{
    // Arrange
    var service = new TripEventService();
    var tripId = Guid.NewGuid();
    var completed = false;

    var observable = service.SubscribeToTrip(tripId);
    observable.Subscribe(_ => { }, () => completed = true);

    service.IncrementSubscribers(tripId);
    service.IncrementSubscribers(tripId);

    // Act
    service.DecrementSubscribers(tripId);

    // Assert
    completed.Should().BeFalse();
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripEventServiceTests"
```

Expected: compilation errors — new methods don't exist yet.

- [ ] **Step 3: Update ITripEventService interface**

In `backend/AGDevX.Cart.Services/ITripEventService.cs`:

```csharp
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
```

- [ ] **Step 4: Implement presence registry and ref counting in TripEventService**

Replace `backend/AGDevX.Cart.Services/TripEventService.cs` with:

```csharp
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

        if (!tripPresence.TryGetValue(userId, out var entry))
        {
            return;
        }

        if (entry.Count <= 1)
        {
            //== Last connection for this user — remove and publish UserLeft
            tripPresence.TryRemove(userId, out _);

            var data = JsonSerializer.Serialize(new { userId, userName = entry.Name });

            PublishEvent(new TripEvent
            {
                TripId = tripId,
                EventType = "UserLeft",
                Data = data,
                Timestamp = DateTime.UtcNow,
            });
        }
        else
        {
            //== Other tabs remain — just decrement
            tripPresence.TryUpdate(userId, (entry.Name, entry.Count - 1), entry);
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
```

- [ ] **Step 5: Run tests**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripEventServiceTests"
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/AGDevX.Cart.Services/ backend/AGDevX.Cart.Services.Tests/
git commit -m "feat: add presence registry and subscriber ref counting to TripEventService"
```

---

## Task 2: TripEventsController — Heartbeat, Presence Lifecycle, Event Filtering

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs`
- Modify: `backend/AGDevX.Cart.Shared/Models/TripEvent.cs`

- [ ] **Step 1: Update TripEvent comment**

In `backend/AGDevX.Cart.Shared/Models/TripEvent.cs`, update the EventType comment:

```csharp
public string EventType { get; set; } = string.Empty; //== ItemAdded, ItemUpdated, ItemChecked, ItemRemoved, PresenceSnapshot, UserJoined, UserLeft
```

- [ ] **Step 2: Rewrite TripEventsController with heartbeat and presence**

Replace the contents of `backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs`:

```csharp
// ABOUTME: Server-Sent Events controller for real-time trip updates
// ABOUTME: Provides SSE endpoint with heartbeat keepalive and presence tracking

using System.Reactive.Linq;
using System.Text.Json;
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/trips/{tripId}/events")]
public class TripEventsController(
    ITripEventService tripEventService,
    ITripRepository tripRepository,
    CartDbContext dbContext,
    IOptions<JsonOptions> jsonOptions) : ControllerBase
{
    private readonly ITripEventService _tripEventService = tripEventService;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly CartDbContext _dbContext = dbContext;
    private readonly JsonSerializerOptions _jsonSerializerOptions = jsonOptions.Value.JsonSerializerOptions;

    private static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(60);

    [HttpGet]
    [RequestTimeout("sse")]
    public async Task GetEvents(Guid tripId, CancellationToken cancellationToken)
    {
        Guid userId = default;

        try
        {
            userId = User.GetUserId();

            //== Scope-based access check: personal trips check CreatedBy, household trips check membership
            var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
            var hasAccess = await _tripRepository.HasTripAccess(tripId, userId, user?.HouseholdId, cancellationToken);
            if (!hasAccess)
            {
                Response.StatusCode = 403;
                return;
            }

            //== Determine if this is a household trip for visibility filtering
            var trip = await _tripRepository.GetById(tripId, cancellationToken);
            var isHouseholdTrip = trip?.HouseholdId != null;

            //== Set up SSE response
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            //== Register presence and subscriber count
            var userName = user?.Name ?? user?.Email ?? "Unknown";
            _tripEventService.IncrementSubscribers(tripId);
            _tripEventService.RegisterPresence(tripId, userId, userName);

            //== Send initial presence snapshot
            var currentPresence = _tripEventService.GetPresence(tripId, excludeUserId: userId);
            var snapshotData = JsonSerializer.Serialize(new { users = currentPresence.Select(p => new { p.UserId, p.UserName }) });
            var snapshotEvent = new TripEvent
            {
                TripId = tripId,
                EventType = "PresenceSnapshot",
                Data = snapshotData,
                Timestamp = DateTime.UtcNow,
            };
            await WriteEventAsync(snapshotEvent, cancellationToken);

            //== Subscribe to trip events and enter heartbeat loop
            var subscription = _tripEventService.SubscribeToTrip(tripId);
            var enumerator = subscription.ToAsyncEnumerable().WithCancellation(cancellationToken).GetAsyncEnumerator();
            using var heartbeatTimer = new PeriodicTimer(HeartbeatInterval);

            try
            {
                while (true)
                {
                    var moveNext = enumerator.MoveNextAsync().AsTask();
                    var heartbeat = heartbeatTimer.WaitForNextTickAsync(cancellationToken).AsTask();

                    var winner = await Task.WhenAny(moveNext, heartbeat);

                    if (winner == moveNext)
                    {
                        if (!await moveNext) break;

                        var tripEvent = enumerator.Current;

                        /*
                         * Visibility filtering for household trips: personal items (IsHouseholdItem=false)
                         * are only visible to the user who created them. Skip events for other users'
                         * personal items. Presence events are filtered by userId match instead.
                         */
                        if (isHouseholdTrip && ShouldFilterEvent(tripEvent.EventType, tripEvent.Data, userId))
                        {
                            continue;
                        }

                        //== Filter out your own presence events
                        if (ShouldFilterPresenceEvent(tripEvent.EventType, tripEvent.Data, userId))
                        {
                            continue;
                        }

                        await WriteEventAsync(tripEvent, cancellationToken);
                    }
                    else
                    {
                        //== Heartbeat: SSE comment to keep Cloudflare Tunnel alive
                        await Response.WriteAsync(":heartbeat\n\n", cancellationToken);
                        await Response.Body.FlushAsync(cancellationToken);
                    }
                }
            }
            finally
            {
                await enumerator.DisposeAsync();
            }
        }
        catch (UnauthorizedAccessException)
        {
            Response.StatusCode = 401;
        }
        catch (OperationCanceledException)
        {
            //== Client disconnected — normal
        }
        catch (IOException)
        {
            //== Broken pipe — client disconnected abruptly
        }
        finally
        {
            //== Clean up presence and subscriber count
            if (userId != default)
            {
                _tripEventService.UnregisterPresence(tripId, userId);
                _tripEventService.DecrementSubscribers(tripId);
            }
        }
    }

    private async Task WriteEventAsync(TripEvent tripEvent, CancellationToken cancellationToken)
    {
        var eventData = $"data: {JsonSerializer.Serialize(tripEvent, _jsonSerializerOptions)}\n\n";
        await Response.WriteAsync(eventData, cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    /**
     * Checks whether an item-related SSE event should be filtered out for the subscribing user.
     * Returns true if the event is for a personal item that belongs to another user.
     * Uses simple string checks on the raw JSON to avoid deserialization overhead.
     */
    private static bool ShouldFilterEvent(string eventType, string data, Guid subscriberUserId)
    {
        //== Presence events and ItemRemoved use different filtering logic
        if (eventType is "ItemRemoved" or "UserJoined" or "UserLeft" or "PresenceSnapshot")
        {
            return false;
        }

        //== Only filter personal items (IsHouseholdItem=false) created by other users
        if (!data.Contains("\"isHouseholdItem\":false"))
        {
            return false;
        }

        //== If the item is personal and was created by the subscriber, show it
        var subscriberIdString = subscriberUserId.ToString();
        if (data.Contains($"\"createdBy\":\"{subscriberIdString}\""))
        {
            return false;
        }

        //== Personal item belonging to another user — filter it out
        return true;
    }

    /**
     * Filters out presence events where the userId matches the subscriber.
     * You don't need to see "you joined" or "you left".
     */
    private static bool ShouldFilterPresenceEvent(string eventType, string data, Guid subscriberUserId)
    {
        if (eventType is not ("UserJoined" or "UserLeft"))
        {
            return false;
        }

        var subscriberIdString = subscriberUserId.ToString();
        return data.Contains($"\"userId\":\"{subscriberIdString}\"");
    }
}
```

- [ ] **Step 3: Verify backend builds and all tests pass**

Run from `backend/`:
```bash
dotnet build
dotnet test
```

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs backend/AGDevX.Cart.Shared/Models/TripEvent.cs
git commit -m "feat: add SSE heartbeat, presence lifecycle, and event filtering"
```

---

## Task 3: Frontend — SSE on TripDetailPage and AddTripItemsPage

**Files:**
- Modify: `frontend/src/pages/shopping/trip-detail-page.tsx`
- Modify: `frontend/src/pages/shopping/add-trip-items-page.tsx`

- [ ] **Step 1: Add SSE to TripDetailPage**

In `frontend/src/pages/shopping/trip-detail-page.tsx`:

Update the react import to include `useCallback`:

```ts
import { useCallback, useMemo } from 'react'
```

Add imports:

```ts
import { useQueryClient } from '@tanstack/react-query'
import { useSSE } from '@/services/use-sse.service'
```

Inside the component, after the existing hooks, add:

```ts
const queryClient = useQueryClient()

const handleSSEMessage = useCallback(
  (_data: unknown) => {
    queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'items'] })
  },
  [queryClient, tripId]
)

useSSE(`/api/v1/trips/${tripId}/events`, handleSSEMessage, !!tripId && !trip?.isCompleted)
```

- [ ] **Step 2: Add SSE to AddTripItemsPage**

In `frontend/src/pages/shopping/add-trip-items-page.tsx`:

Update the react import to include `useCallback`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
```

Add imports:

```ts
import { useQueryClient } from '@tanstack/react-query'
import { useSSE } from '@/services/use-sse.service'
```

Inside the component, after the existing hooks, add:

```ts
const queryClient = useQueryClient()

const handleSSEMessage = useCallback(
  (_data: unknown) => {
    queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'items'] })
  },
  [queryClient, tripId]
)

useSSE(`/api/v1/trips/${tripId}/events`, handleSSEMessage, !!tripId)
```

- [ ] **Step 3: Run TypeScript check and lint**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx eslint --fix src/pages/shopping/trip-detail-page.tsx src/pages/shopping/add-trip-items-page.tsx
```

- [ ] **Step 4: Run all tests**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/shopping/trip-detail-page.tsx frontend/src/pages/shopping/add-trip-items-page.tsx
git commit -m "feat: add SSE real-time updates to TripDetailPage and AddTripItemsPage"
```

---

## Task 4: Frontend — Presence Banner Component

**Files:**
- Create: `frontend/src/pages/shopping/presence-banner.tsx`
- Create: `frontend/src/pages/shopping/tests/presence-banner.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/shopping/tests/presence-banner.test.tsx`:

```tsx
// ABOUTME: Tests for PresenceBanner component
// ABOUTME: Verifies rendering of shopping presence indicators

import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PresenceBanner } from '../presence-banner'

describe('PresenceBanner', () => {
  it('should not render when no users are present', () => {
    const { container } = render(createElement(PresenceBanner, { users: [] }))
    expect(container.firstChild).toBeNull()
  })

  it('should render single user with initial and message', () => {
    render(createElement(PresenceBanner, {
      users: [{ userId: '1', userName: 'Sarah' }],
    }))
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('Sarah is shopping with you')).toBeInTheDocument()
  })

  it('should render multiple users with initials and message', () => {
    render(createElement(PresenceBanner, {
      users: [
        { userId: '1', userName: 'Sarah' },
        { userId: '2', userName: 'Mike' },
      ],
    }))
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('Sarah and Mike are shopping with you')).toBeInTheDocument()
  })

  it('should use first character of name for initial', () => {
    render(createElement(PresenceBanner, {
      users: [{ userId: '1', userName: 'august' }],
    }))
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/shopping/tests/presence-banner.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PresenceBanner**

Create `frontend/src/pages/shopping/presence-banner.tsx`:

```tsx
// ABOUTME: Banner showing which household members are actively shopping on the same trip
// ABOUTME: Displays avatar initials and "[Name] is shopping with you"

interface PresenceUser {
  userId: string
  userName: string
}

interface PresenceBannerProps {
  users: PresenceUser[]
}

export const PresenceBanner = ({ users }: PresenceBannerProps) => {
  if (users.length === 0) {
    return null
  }

  const names = users.map((u) => u.userName)
  const message = names.length === 1
    ? `${names[0]} is shopping with you`
    : `${names.join(' and ')} are shopping with you`

  return (
    <div className="bg-teal/8 border border-teal/20 rounded-xl px-3 py-2 mb-3 flex items-center gap-2.5 animate-fade-in">
      <div className="flex -space-x-1.5">
        {users.map((user) => (
          <div
            key={user.userId}
            className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      <span className="text-[13px] text-navy-soft">{message}</span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run from `frontend/`:
```bash
npx vitest run src/pages/shopping/tests/presence-banner.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/shopping/presence-banner.tsx frontend/src/pages/shopping/tests/presence-banner.test.tsx
git commit -m "feat: add PresenceBanner component"
```

---

## Task 5: Frontend — ActiveTripPage Event Dispatch and Presence State

**Files:**
- Modify: `frontend/src/pages/shopping/active-trip-page.tsx`

- [ ] **Step 1: Update ActiveTripPage with event-type dispatch and presence**

In `frontend/src/pages/shopping/active-trip-page.tsx`:

Add import for PresenceBanner:

```ts
import { PresenceBanner } from './presence-banner'
```

Add presence state (alongside existing state):

```ts
const [presenceUsers, setPresenceUsers] = useState<{ userId: string; userName: string }[]>([])
```

Replace the existing `handleSSEMessage` callback with event-type dispatch:

```ts
const handleSSEMessage = useCallback(
  (data: unknown) => {
    const event = data as { eventType?: string; data?: string }
    if (!event?.eventType) return

    switch (event.eventType) {
      case 'PresenceSnapshot': {
        const parsed = JSON.parse(event.data ?? '{}') as { users?: { userId: string; userName: string }[] }
        setPresenceUsers(parsed.users ?? [])
        break
      }

      case 'UserJoined': {
        const parsed = JSON.parse(event.data ?? '{}') as { userId: string; userName: string }
        setPresenceUsers((prev) => [...prev.filter((u) => u.userId !== parsed.userId), parsed])
        break
      }

      case 'UserLeft': {
        const parsed = JSON.parse(event.data ?? '{}') as { userId: string }
        setPresenceUsers((prev) => prev.filter((u) => u.userId !== parsed.userId))
        break
      }

      default:
        //== Item events: invalidate cache for refetch
        queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'items'] })
        break
    }
  },
  [queryClient, tripId]
)
```

Add the `PresenceBanner` in the JSX, right before the shopping list section (after the progress bar / section header area):

```tsx
<PresenceBanner users={presenceUsers} />
```

- [ ] **Step 2: Run TypeScript check and lint**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx eslint --fix src/pages/shopping/active-trip-page.tsx
```

- [ ] **Step 3: Run all tests**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: all pass. If existing `ActiveTripPage` tests fail because the SSE mock now receives presence events, update those tests to handle the new event format.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/shopping/active-trip-page.tsx
git commit -m "feat: add presence banner and event-type dispatch to ActiveTripPage"
```

---

## Task 6: Update STATUS.md

**Files:**
- Modify: `.claude/STATUS.md`

- [ ] **Step 1: Update STATUS.md**

- Move "Contributor/SSE Epic" from Planned to Completed
- Update test health counts after running full backend + frontend suites
- Set "Last Updated" date
- Add planning doc link pointing to `docs/archive/2026-04-06-contributor-sse-epic.md`

- [ ] **Step 2: Move planning docs to archive**

```bash
mv docs/active/2026-04-06-contributor-sse-epic.md docs/archive/2026-04-06-contributor-sse-epic.md
mv docs/active/2026-04-06-contributor-sse-plan.md docs/archive/2026-04-06-contributor-sse-plan.md
```

Update the STATUS.md links to point to `../docs/archive/`.

- [ ] **Step 3: Commit**

```bash
git add .claude/STATUS.md docs/
git commit -m "docs: mark contributor/SSE epic as completed"
```
