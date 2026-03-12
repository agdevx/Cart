// ABOUTME: Interface for authentication operations (user registration and login).
// ABOUTME: Designed for easy migration to Auth0 by swapping implementation while keeping interface contract.
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Auth;

public interface IAuthService
{
    Task<AuthResponse> Register(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> Login(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> UpdateProfile(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task ChangePassword(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
}
