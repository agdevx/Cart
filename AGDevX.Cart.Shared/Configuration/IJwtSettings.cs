// ABOUTME: Interface defining JWT authentication configuration settings.
// ABOUTME: Used for dependency injection and configuration binding throughout the application.

namespace AGDevX.Cart.Shared.Configuration;

public interface IJwtSettings
{
    string Secret { get; }
    int AccessTokenExpirationMinutes { get; }
    int RefreshTokenExpirationDays { get; }
    string Issuer { get; }
    string Audience { get; }
}
