// ABOUTME: DTO for updating user profile (name and email).
// ABOUTME: CurrentPassword is required only when email is being changed.
namespace AGDevX.Cart.Shared.DTOs;

public class UpdateProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? CurrentPassword { get; set; }
}
