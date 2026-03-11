// ABOUTME: DTO for updating user profile (name and email).
// ABOUTME: CurrentPassword is required only when email is being changed.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateProfileRequest
{
    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    // Nullable — required only when email changes, validated in service layer
    public string? CurrentPassword { get; set; }
}
