// ABOUTME: API controller for store management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting household and personal stores

using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Shared.DTOs;
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
    public async Task<IActionResult> GetHouseholdStores(Guid householdId, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var stores = await storeService.GetHouseholdStores(householdId, userId, cancellationToken);
            return Ok(stores);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get all personal stores for the authenticated user
    [HttpGet("personal")]
    public async Task<IActionResult> GetPersonalStores(CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var stores = await storeService.GetPersonalStores(userId, cancellationToken);
            return Ok(stores);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific store by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var store = await storeService.GetById(id, userId, cancellationToken);

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
    public async Task<IActionResult> Create([FromBody] CreateStoreRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var store = new Store { Name = request.Name, HouseholdId = request.HouseholdId };
            var created = await storeService.CreateStore(store, userId, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
        }
    }

    //== Update an existing store
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStoreRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await storeService.UpdateStore(id, request.Name, request.HouseholdId, userId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Delete a store
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await storeService.DeleteStore(id, userId, cancellationToken);
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
