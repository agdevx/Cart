// ABOUTME: API controller for store management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting household and personal stores

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StoreController(IStoreService storeService) : ControllerBase
{
    //== Get all stores for a specific household
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdStores(Guid householdId)
    {
        try
        {
            var userId = User.GetUserId();
            var stores = await storeService.GetHouseholdStoresAsync(householdId, userId);
            return Ok(stores);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get all personal stores for the authenticated user
    [HttpGet("personal")]
    public async Task<IActionResult> GetPersonalStores()
    {
        try
        {
            var userId = User.GetUserId();
            var stores = await storeService.GetPersonalStoresAsync(userId);
            return Ok(stores);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific store by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var store = await storeService.GetByIdAsync(id, userId);

            if (store == null)
            {
                return NotFound(new { errorCode = "NOT_FOUND", message = "Store not found" });
            }

            return Ok(store);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Create a new store
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Store store)
    {
        try
        {
            var userId = User.GetUserId();
            var created = await storeService.CreateStoreAsync(store, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing store
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Store store)
    {
        try
        {
            var userId = User.GetUserId();
            await storeService.UpdateStoreAsync(store, userId);
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

    //== Delete a store
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            await storeService.DeleteStoreAsync(id, userId);
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
