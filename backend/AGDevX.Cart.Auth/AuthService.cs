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

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            Name = request.Name
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            Name = user.Name ?? string.Empty
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
            Name = user.Name ?? string.Empty
        };
    }

    public async Task<AuthResponse> UpdateProfile(Guid userId, UpdateProfileRequest request)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId)
                        ?? throw new UnauthorizedAccessException("User not found.");

        //== Validate name
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 64)
        {
            throw new ArgumentException("Name is required and must be 64 characters or fewer.");
        }

        //== Validate email format and length
        if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Length > 254)
        {
            throw new ArgumentException("A valid email is required (max 254 characters).");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
        {
            throw new ArgumentException("Please enter a valid email address.");
        }

        var emailChanged = !string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase);

        if (emailChanged)
        {
            //== Require current password for email changes
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                throw new UnauthorizedAccessException("Current password is required to change email.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Incorrect password.");
            }

            //== Check for duplicate email
            var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.Id != userId);
            if (existingUser != null)
            {
                throw new InvalidOperationException("A user with this email already exists.");
            }

            user.Email = request.Email;
        }

        user.Name = request.Name.Trim();
        await context.SaveChangesAsync();

        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            Name = user.Name ?? string.Empty
        };
    }

    public async Task ChangePassword(Guid userId, ChangePasswordRequest request)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId)
                        ?? throw new UnauthorizedAccessException("User not found.");

        //== Verify current password
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Incorrect password.");
        }

        //== Validate new password rules
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8 || request.NewPassword.Length > 128)
        {
            throw new ArgumentException("Password must be between 8 and 128 characters.");
        }

        if (!request.NewPassword.Any(char.IsUpper))
        {
            throw new ArgumentException("Password must contain at least one uppercase letter.");
        }

        if (!request.NewPassword.Any(char.IsDigit))
        {
            throw new ArgumentException("Password must contain at least one number.");
        }

        //== Hash and save new password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await context.SaveChangesAsync();
    }
}
