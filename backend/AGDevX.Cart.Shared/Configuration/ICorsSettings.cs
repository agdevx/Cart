// ABOUTME: Interface defining CORS configuration settings.
// ABOUTME: Used for dependency injection and configuration binding.

namespace AGDevX.Cart.Shared.Configuration;

public interface ICorsSettings
{
    string[] AllowedOrigins { get; }
}
