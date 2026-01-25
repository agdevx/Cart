// ABOUTME: This file defines the LoginRequest DTO used for user authentication.
// ABOUTME: Contains Email and Password properties for login operations.
namespace AGDevX.Cart.Shared.DTOs;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
