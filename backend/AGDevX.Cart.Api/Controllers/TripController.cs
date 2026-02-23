// ABOUTME: API controller for trip management operations including lifecycle and collaboration
// ABOUTME: Provides endpoints for CRUD operations, completing/reopening trips, and managing collaborators

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TripController(ITripService tripService) : ControllerBase
{
    //== Get all trips for the authenticated user
    [HttpGet("user")]
    public async Task<IActionResult> GetUserTrips()
    {
        try
        {
            var userId = User.GetUserId();
            var trips = await tripService.GetUserTrips(userId);
            return Ok(trips);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get all trips for a specific household
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdTrips(Guid householdId)
    {
        try
        {
            var trips = await tripService.GetHouseholdTrips(householdId);
            return Ok(trips);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific trip by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var trip = await tripService.GetById(id);

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
    public async Task<IActionResult> Create([FromBody] CreateTripRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.CreateTrip(request.Name, userId, request.HouseholdId);
            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing trip
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Trip trip)
    {
        try
        {
            await tripService.UpdateTrip(trip);
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
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.DeleteTrip(id, userId);
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

    //== Mark a trip as completed
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.CompleteTrip(id, userId);
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
    public async Task<IActionResult> Reopen(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var trip = await tripService.ReopenTrip(id, userId);
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
    public async Task<IActionResult> AddCollaborator(Guid id, [FromBody] AddCollaboratorRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.AddCollaborator(id, userId, request.UserId);
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
    public async Task<IActionResult> RemoveCollaborator(Guid id, Guid collaboratorUserId)
    {
        try
        {
            var userId = User.GetUserId();
            await tripService.RemoveCollaborator(id, userId, collaboratorUserId);
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
