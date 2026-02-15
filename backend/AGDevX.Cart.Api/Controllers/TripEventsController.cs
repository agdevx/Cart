// ABOUTME: Server-Sent Events controller for real-time trip updates
// ABOUTME: Provides SSE endpoint for clients to receive live trip item changes

using System.Reactive.Linq;
using System.Text.Json;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/trips/{tripId}/events")]
public class TripEventsController(
    ITripEventService tripEventService,
    ITripRepository tripRepository,
    IOptions<JsonOptions> jsonOptions) : ControllerBase
{
    private readonly ITripEventService _tripEventService = tripEventService;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly JsonSerializerOptions _jsonSerializerOptions = jsonOptions.Value.JsonSerializerOptions;

    [HttpGet]
    public async Task GetEvents(Guid tripId, CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();

            //== Verify user is a collaborator on this trip
            var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripId, userId);
            if (!isCollaborator)
            {
                Response.StatusCode = 403;
                return;
            }

            //== Set up SSE response
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            //== Subscribe to trip events
            var subscription = _tripEventService.SubscribeToTrip(tripId);

            await foreach (var tripEvent in subscription.ToAsyncEnumerable().WithCancellation(cancellationToken))
            {
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
}
