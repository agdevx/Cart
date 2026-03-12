// ABOUTME: API controller for trip item management operations including check/uncheck functionality
// ABOUTME: Provides endpoints for CRUD operations and item status tracking during shopping

using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class TripItemController(ITripItemService tripItemService) : ControllerBase
{
    //== Get all items for a specific trip
    [HttpGet("trip/{tripId}")]
    public async Task<IActionResult> GetTripItems(Guid tripId, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItems = await tripItemService.GetTripItems(tripId, userId, cancellationToken);
            return Ok(tripItems);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific trip item by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.GetById(id, userId, cancellationToken);

            if (tripItem == null)
            {
                return NotFound(new { errorCode = "NOT_FOUND", message = "Trip item not found" });
            }

            return Ok(tripItem);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Add a new item to a trip
    [HttpPost("trip/{tripId}")]
    public async Task<IActionResult> Add(Guid tripId, [FromBody] AddTripItemRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.AddTripItem(tripId, request.InventoryItemId!.Value, request.Quantity, userId, request.Notes, request.StoreId, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = tripItem.Id }, tripItem);
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

    //== Update an existing trip item
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTripItemRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripItemService.UpdateTripItem(id, request.Quantity, userId, request.Notes, request.StoreId, cancellationToken);
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

    //== Delete a trip item
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await tripItemService.DeleteTripItem(id, userId, cancellationToken);
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

    //== Mark an item as checked (picked up during shopping)
    [HttpPost("{id}/check")]
    public async Task<IActionResult> Check(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.CheckItem(id, true, userId, cancellationToken);
            return Ok(tripItem);
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

    //== Mark an item as unchecked (not picked up)
    [HttpPost("{id}/uncheck")]
    public async Task<IActionResult> Uncheck(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.CheckItem(id, false, userId, cancellationToken);
            return Ok(tripItem);
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
