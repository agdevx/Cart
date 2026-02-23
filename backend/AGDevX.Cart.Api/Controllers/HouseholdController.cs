// ABOUTME: API controller for household management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting households

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

public record JoinHouseholdRequest
{
    public string InviteCode { get; init; } = string.Empty;
}

public record TransferOwnershipRequest
{
    public Guid UserId { get; init; }
}

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
            var households = await householdService.GetUserHouseholds(userId);
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
            var household = await householdService.GetById(userId, id);

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
            var created = await householdService.CreateHousehold(userId, name);
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
            await householdService.UpdateHousehold(userId, id, name);
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
            await householdService.DeleteHousehold(userId, id);
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

    //== Join a household via invite code
    [HttpPost("/api/households/join")]
    public async Task<IActionResult> JoinHousehold([FromBody] JoinHouseholdRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await householdService.JoinHousehold(userId, request.InviteCode);
            return Ok(household);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { errorCode = "INVALID_INVITE_CODE", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { errorCode = "ALREADY_MEMBER", message = ex.Message });
        }
    }

    //== Get household members
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var members = await householdService.GetMembers(userId, id);
            return Ok(members);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Remove a member from a household
    [HttpDelete("{id}/members/{targetUserId}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid targetUserId)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.RemoveMember(userId, id, targetUserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { errorCode = "INVALID_OPERATION", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
        }
    }

    //== Transfer household ownership
    [HttpPut("{id}/owner")]
    public async Task<IActionResult> TransferOwnership(Guid id, [FromBody] TransferOwnershipRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.TransferOwnership(userId, id, request.UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { errorCode = "INVALID_REQUEST", message = ex.Message });
        }
    }

    //== Get invite code
    [HttpGet("{id}/invite-code")]
    public async Task<IActionResult> GetInviteCode(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var code = await householdService.GetInviteCode(userId, id);
            return Ok(new { inviteCode = code });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Regenerate invite code
    [HttpPost("{id}/invite-code")]
    public async Task<IActionResult> RegenerateInviteCode(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            var code = await householdService.RegenerateInviteCode(userId, id);
            return Ok(new { inviteCode = code });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }
}
