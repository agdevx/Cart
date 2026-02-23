// ABOUTME: Controller for authentication operations including user registration, login, logout, and session check
// ABOUTME: Uses HttpContext.SignInAsync/SignOutAsync for cookie-based session management

using System.Security.Claims;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Shared.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await authService.Register(request);
            await SignInUser(response);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await authService.Login(request);
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
                DisplayName = displayName ?? string.Empty
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    //== Private helper to create cookie session from auth response
    private async Task SignInUser(AuthResponse response)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, response.UserId.ToString()),
            new Claim(ClaimTypes.Email, response.Email),
            new Claim(ClaimTypes.Name, response.DisplayName)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);
    }
}
