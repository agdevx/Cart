// ABOUTME: Server-Sent Events controller for real-time trip updates
// ABOUTME: Provides SSE endpoint with heartbeat keepalive and presence tracking

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
            var snapshotData = JsonSerializer.Serialize(new { users = currentPresence.Select(p => new { userId = p.UserId, userName = p.UserName }) });
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
            var enumerator = subscription.ToAsyncEnumerable(cancellationToken).GetAsyncEnumerator(cancellationToken);
            using var heartbeatTimer = new PeriodicTimer(HeartbeatInterval);

            try
            {
                /*
                 * Race pattern: reuse pending tasks across iterations. When the heartbeat timer
                 * wins the race, the moveNext task is still pending (waiting for the next event).
                 * We must NOT call MoveNextAsync() again while the previous call is outstanding.
                 * Same applies to the heartbeat timer's WaitForNextTickAsync().
                 */
                Task<bool>? moveNextTask = null;
                Task<bool>? heartbeatTask = null;

                while (true)
                {
                    moveNextTask ??= enumerator.MoveNextAsync().AsTask();
                    heartbeatTask ??= heartbeatTimer.WaitForNextTickAsync(cancellationToken).AsTask();

                    var winner = await Task.WhenAny(moveNextTask, heartbeatTask);

                    if (winner == moveNextTask)
                    {
                        if (!await moveNextTask) break;
                        moveNextTask = null; // consumed — get next event on next iteration

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
                        await heartbeatTask; // consume the tick
                        heartbeatTask = null; // get next tick on next iteration

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
