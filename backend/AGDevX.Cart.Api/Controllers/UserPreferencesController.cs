// ABOUTME: API controller for user preferences — get and update endpoints scoped to the authenticated user.

using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/user/preferences")]
public class UserPreferencesController(IUserPreferencesService preferencesService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();
            var preferences = await preferencesService.GetPreferences(userId, cancellationToken);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { errorCode = "INTERNAL_ERROR", message = ex.Message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdateUserPreferencesRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();
            var preferences = await preferencesService.UpdatePreferences(userId, request, cancellationToken);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { errorCode = "INTERNAL_ERROR", message = ex.Message });
        }
    }
}
