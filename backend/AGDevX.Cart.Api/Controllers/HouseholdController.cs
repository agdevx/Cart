// ABOUTME: API controller for household management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting households

using AGDevX.Cart.Services;
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class HouseholdController(IHouseholdService householdService) : ControllerBase
{
    //== Get the authenticated user's household (single-household model)
    [HttpGet]
    public async Task<IActionResult> GetUserHousehold(CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await householdService.GetUserHousehold(userId, cancellationToken);
            return Ok(household);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get swap status (must be before {id} route to avoid route conflicts)
    [HttpGet("swap-status")]
    public async Task<IActionResult> GetSwapStatus(CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var status = await householdService.GetSwapStatus(userId, cancellationToken);
            return Ok(status);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Get a specific household by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await householdService.GetById(userId, id, cancellationToken);

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
    public async Task<IActionResult> CreateHousehold([FromBody] CreateHouseholdRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var created = await householdService.CreateHousehold(userId, request.Name, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Update an existing household
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHousehold(Guid id, [FromBody] UpdateHouseholdRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.UpdateHousehold(userId, id, request.Name, cancellationToken);
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
    public async Task<IActionResult> DeleteHousehold(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.DeleteHousehold(userId, id, cancellationToken);
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
    [HttpPost("join")]
    public async Task<IActionResult> JoinHousehold([FromBody] JoinHouseholdRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await householdService.JoinHousehold(userId, request.InviteCode, cancellationToken);
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

    //== Leave the current household (single-household model — ID is implicit from user's membership)
    [HttpPost("leave")]
    public async Task<IActionResult> LeaveHousehold(CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.LeaveHousehold(userId, cancellationToken);
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
    }

    //== Get household members
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var members = await householdService.GetMembers(userId, id, cancellationToken);
            return Ok(members);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Remove a member from a household
    [HttpDelete("{id}/members/{targetUserId}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.RemoveMember(userId, id, targetUserId, cancellationToken);
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

    //== Promote a member to owner
    [HttpPut("{id}/owner/promote")]
    public async Task<IActionResult> PromoteToOwner(Guid id, [FromBody] PromoteOwnerRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.PromoteToOwner(userId, id, request.UserId!.Value, cancellationToken);
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

    //== Demote an owner to regular member
    [HttpPut("{id}/owner/demote")]
    public async Task<IActionResult> DemoteOwner(Guid id, [FromBody] DemoteOwnerRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await householdService.DemoteOwner(userId, id, request.UserId!.Value, cancellationToken);
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
    public async Task<IActionResult> GetInviteCode(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var code = await householdService.GetInviteCode(userId, id, cancellationToken);
            return Ok(new { inviteCode = code });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    //== Regenerate invite code
    [HttpPost("{id}/invite-code")]
    public async Task<IActionResult> RegenerateInviteCode(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var code = await householdService.RegenerateInviteCode(userId, id, cancellationToken);
            return Ok(new { inviteCode = code });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }
}
