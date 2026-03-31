// ABOUTME: Server-Sent Events controller for real-time trip updates
// ABOUTME: Provides SSE endpoint for clients to receive live trip item changes

using System.Reactive.Linq;
using System.Text.Json;
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Shared.Extensions;
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

    [HttpGet]
    [RequestTimeout("sse")]
    public async Task GetEvents(Guid tripId, CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();

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

            //== Subscribe to trip events
            var subscription = _tripEventService.SubscribeToTrip(tripId);

            await foreach (var tripEvent in subscription.ToAsyncEnumerable().WithCancellation(cancellationToken))
            {
                /*
                 * Visibility filtering for household trips: personal items (IsHouseholdItem=false)
                 * are only visible to the user who created them. Skip events for other users'
                 * personal items. ItemRemoved events only contain id/tripId so they pass through.
                 */
                if (isHouseholdTrip && ShouldFilterEvent(tripEvent.EventType, tripEvent.Data, userId))
                {
                    continue;
                }

                var eventData = $"data: {JsonSerializer.Serialize(tripEvent, _jsonSerializerOptions)}\n\n";
                await Response.WriteAsync(eventData, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (UnauthorizedAccessException)
        {
            Response.StatusCode = 401;
        }
        catch (OperationCanceledException)
        {
            //== Client disconnected - normal
        }
    }

    /**
     * Checks whether an SSE event should be filtered out for the subscribing user.
     * Returns true if the event is for a personal item that belongs to another user.
     * Uses simple string checks on the raw JSON to avoid deserialization overhead.
     */
    private static bool ShouldFilterEvent(string eventType, string data, Guid subscriberUserId)
    {
        //== ItemRemoved events only contain id/tripId — no visibility data to filter on
        if (eventType == "ItemRemoved")
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
}
