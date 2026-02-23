// ABOUTME: Interface for authentication operations (user registration and login).
// ABOUTME: Designed for easy migration to Auth0 by swapping implementation while keeping interface contract.
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}
