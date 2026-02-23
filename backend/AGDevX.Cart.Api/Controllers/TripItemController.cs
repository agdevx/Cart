// ABOUTME: API controller for trip item management operations including check/uncheck functionality
// ABOUTME: Provides endpoints for CRUD operations and item status tracking during shopping

using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TripItemController(ITripItemService tripItemService) : ControllerBase
{
    //== Get all items for a specific trip
    [HttpGet("trip/{tripId}")]
    public async Task<IActionResult> GetTripItems(Guid tripId)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItems = await tripItemService.GetTripItems(tripId, userId);
            return Ok(tripItems);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific trip item by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.GetById(id, userId);

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
    [HttpPost]
    public async Task<IActionResult> Add(
        [FromQuery] Guid tripId,
        [FromQuery] Guid inventoryItemId,
        [FromQuery] int quantity,
        [FromQuery] string? notes = null,
        [FromQuery] Guid? storeId = null)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.AddTripItem(tripId, inventoryItemId, quantity, userId, notes, storeId);
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
    public async Task<IActionResult> Update(
        Guid id,
        [FromQuery] int quantity,
        [FromQuery] string? notes = null,
        [FromQuery] Guid? storeId = null)
    {
        try
        {
            var userId = User.GetUserId();
            await tripItemService.UpdateTripItem(id, quantity, userId, notes, storeId);
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
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            await tripItemService.DeleteTripItem(id, userId);
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
    public async Task<IActionResult> Check(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.CheckItem(id, true, userId);
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
    public async Task<IActionResult> Uncheck(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var tripItem = await tripItemService.CheckItem(id, false, userId);
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
