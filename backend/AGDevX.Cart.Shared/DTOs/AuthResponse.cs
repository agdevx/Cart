// ABOUTME: DTO returned after successful authentication.
// ABOUTME: Contains user identity fields for the authenticated user.
namespace AGDevX.Cart.Shared.DTOs;

public class AuthResponse
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
