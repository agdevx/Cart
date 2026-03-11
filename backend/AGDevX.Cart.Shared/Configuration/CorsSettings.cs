// ABOUTME: Implementation of CORS configuration settings bound from appSettings.json.
// ABOUTME: Provides empty default for fail-closed behavior in production.

namespace AGDevX.Cart.Shared.Configuration;

public class CorsSettings : ICorsSettings
{
    public string[] AllowedOrigins { get; set; } = [];
}
