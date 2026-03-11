// ABOUTME: This file defines the RegisterRequest DTO used for user registration.
// ABOUTME: Contains Email, Password, and Name properties for creating new user accounts.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;
}
