// ABOUTME: This file defines the LoginRequest DTO used for user authentication.
// ABOUTME: Contains Email and Password properties for login operations.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
