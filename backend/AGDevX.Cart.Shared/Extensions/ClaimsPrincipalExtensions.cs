// ABOUTME: Extension methods for ClaimsPrincipal to extract user information
// ABOUTME: Simplifies getting user ID from authentication claims in controllers

using System.Security.Claims;

namespace AGDevX.Cart.Shared.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in claims");
        }
        return userId;
    }
}
