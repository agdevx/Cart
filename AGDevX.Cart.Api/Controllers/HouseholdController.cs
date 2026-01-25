// ABOUTME: API controller for household management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting households

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HouseholdController(IHouseholdService householdService) : ControllerBase
{
    //== Get all households for the authenticated user
    [HttpGet]
    public async Task<IActionResult> GetUserHouseholds()
    {
        try
        {
            var userId = User.GetUserId();
            var households = await householdService.GetUserHouseholdsAsync(userId);
            return Ok(households);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific household by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await householdService.GetByIdAsync(userId, id);

            if (household == null)
            {
                return NotFound(new { errorCode = "NOT_FOUND", message = "Household not found" });
            }

            return Ok(household);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Create a new household
    [HttpPost]
    public async Task<IActionResult> CreateHousehold([FromBody] string name)
    {
        try
        {
            var userId = User.GetUserId();
            var created = await householdService.CreateHouseholdAsync(userId, name);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing household
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHousehold(Guid id, [FromBody] string name)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.UpdateHouseholdAsync(userId, id, name);
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

    //== Delete a household
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHousehold(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.DeleteHouseholdAsync(userId, id);
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
