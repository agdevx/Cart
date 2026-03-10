// ABOUTME: DTO for changing a user's password.
// ABOUTME: Requires current password verification before accepting the new password.
namespace AGDevX.Cart.Shared.DTOs;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
