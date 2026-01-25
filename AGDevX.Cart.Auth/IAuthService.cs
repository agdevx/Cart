// ABOUTME: This file defines the IAuthService interface for authentication operations.
// ABOUTME: Designed for easy migration to Auth0 by swapping implementation while keeping interface contract.
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
}
