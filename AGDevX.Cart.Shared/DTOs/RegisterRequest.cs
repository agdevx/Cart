// ABOUTME: This file defines the RegisterRequest DTO used for user registration.
// ABOUTME: Contains Email, Password, and DisplayName properties for creating new user accounts.
namespace AGDevX.Cart.Shared.DTOs;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
