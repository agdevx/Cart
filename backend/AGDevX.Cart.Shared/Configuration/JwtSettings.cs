// ABOUTME: Implementation of JWT configuration settings bound from appSettings.json.
// ABOUTME: Provides default values for token expiration and authentication parameters.

namespace AGDevX.Cart.Shared.Configuration;

public class JwtSettings : IJwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
}
