// ABOUTME: Controller for authentication operations including user registration, login, logout, and session check
// ABOUTME: Uses HttpContext.SignInAsync/SignOutAsync for cookie-based session management

using System.Security.Claims;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Auth.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AGDevX.Cart.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await authService.Register(request, cancellationToken);
            await SignInUser(response);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
        }
    }

    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await authService.Login(request, cancellationToken);
            await SignInUser(response);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        try
        {
            var userId = User.GetUserId();
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var displayName = User.FindFirst(ClaimTypes.Name)?.Value;

            return Ok(new AuthResponse
            {
                UserId = userId,
                Email = email ?? string.Empty,
                Name = displayName ?? string.Empty
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            var response = await authService.UpdateProfile(userId, request, cancellationToken);
            await SignInUser(response);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { errorCode = "VALIDATION_ERROR", message = ex.Message });
        }
    }

    [Authorize]
    [EnableRateLimiting("auth")]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            await authService.ChangePassword(userId, request, cancellationToken);
            return Ok();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { errorCode = "VALIDATION_ERROR", message = ex.Message });
        }
    }

    //== Private helper to create cookie session from auth response
    private async Task SignInUser(AuthResponse response)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, response.UserId.ToString()),
            new Claim(ClaimTypes.Email, response.Email),
            new Claim(ClaimTypes.Name, response.Name)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);
    }
}
