// ABOUTME: API controller for trip management operations including lifecycle and collaboration
// ABOUTME: Provides endpoints for CRUD operations, completing/reopening trips, and managing collaborators

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class TripController(ITripService tripService) : ControllerBase
{
    //== Get all trips for the authenticated user
    [HttpGet("user")]
    public async Task<IActionResult> GetUserTrips(CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var trips = await tripService.GetUserTrips(userId, cancellationToken);
            return Ok(trips);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific trip by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var trip = await tripService.GetById(id, cancellationToken);

            if (trip == null)
            {
                return NotFound(new { errorCode = "NOT_FOUND", message = "Trip not found" });
            }

            return Ok(trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Create a new trip
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTripRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.CreateTrip(request.Name, request.TripDate, userId, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing trip
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTripRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.UpdateTrip(id, request.Name, request.TripDate, userId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Delete a trip
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.DeleteTrip(id, userId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Start a trip (move from planning to active)
    [HttpPost("{id}/start")]
    public async Task<IActionResult> Start(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.StartTrip(id, userId, cancellationToken);
            return Ok(trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Mark a trip as completed
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.CompleteTrip(id, userId, cancellationToken);
            return Ok(trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Reopen a completed trip
    [HttpPost("{id}/reopen")]
    public async Task<IActionResult> Reopen(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.ReopenTrip(id, userId, cancellationToken);
            return Ok(trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Add a collaborator to a trip
    [HttpPost("{id}/collaborators")]
    public async Task<IActionResult> AddCollaborator(Guid id, [FromBody] AddCollaboratorRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.AddCollaborator(id, userId, request.UserId!.Value, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Remove a collaborator from a trip
    [HttpDelete("{id}/collaborators/{collaboratorUserId}")]
    public async Task<IActionResult> RemoveCollaborator(Guid id, Guid collaboratorUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.RemoveCollaborator(id, userId, collaboratorUserId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }
}
