// ABOUTME: API controller for inventory management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting household and personal inventory items

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class InventoryController(IInventoryService inventoryService) : ControllerBase
{
    //== Get all inventory items for the authenticated user (personal + all households)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var userId = User.GetUserId();
            var items = await inventoryService.GetAllUserInventory(userId);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get all inventory items for a specific household
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdInventory(Guid householdId)
    {
        try
        {
            var userId = User.GetUserId();
            var items = await inventoryService.GetHouseholdInventory(householdId, userId);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get all personal inventory items for the authenticated user
    [HttpGet("personal")]
    public async Task<IActionResult> GetPersonalInventory()
    {
        try
        {
            var userId = User.GetUserId();
            var items = await inventoryService.GetPersonalInventory(userId);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get merged inventory (household + personal) for the authenticated user
    [HttpGet("merged/{householdId}")]
    public async Task<IActionResult> GetMergedInventory(Guid householdId)
    {
        try
        {
            var userId = User.GetUserId();
            var items = await inventoryService.GetMergedInventory(householdId, userId);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific inventory item by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var item = await inventoryService.GetById(id, userId);

            if (item == null)
            {
                return NotFound(new { errorCode = "NOT_FOUND", message = "Inventory item not found" });
            }

            return Ok(item);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Create a new inventory item
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InventoryItem item)
    {
        try
        {
            var userId = User.GetUserId();
            var created = await inventoryService.CreateInventoryItem(item, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing inventory item
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] InventoryItem item)
    {
        try
        {
            var userId = User.GetUserId();
            await inventoryService.UpdateInventoryItem(item, userId);
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

    //== Delete an inventory item
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            await inventoryService.DeleteInventoryItem(id, userId);
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
