// ABOUTME: Authentication service handling user registration and login.
// ABOUTME: Uses BCrypt for password hashing. Cookie session management is handled by the controller.
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Auth;

public class AuthService(CartDbContext context) : IAuthService
{
    public async Task<AuthResponse> Register(RegisterRequest request)
    {
        //== Check for duplicate email
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser != null)
        {
            throw new InvalidOperationException("User with this email already exists.");
        }

        //== Hash password with BCrypt
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        //== Create User with system user (Guid.Empty) as creator
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            CreatedBy = Guid.Empty.ToString(),
            CreatedDate = DateTime.UtcNow
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName ?? string.Empty
        };
    }

    public async Task<AuthResponse> Login(LoginRequest request)
    {
        //== Find user by email
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
                        ?? throw new UnauthorizedAccessException("Invalid email or password.");

        //== Verify password with BCrypt
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName ?? string.Empty
        };
    }
}
