// ABOUTME: This file defines the AuthResponse DTO returned after successful authentication.
// ABOUTME: Contains AccessToken, RefreshToken, UserId, Email, and DisplayName for authenticated users.
namespace AGDevX.Cart.Shared.DTOs;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
