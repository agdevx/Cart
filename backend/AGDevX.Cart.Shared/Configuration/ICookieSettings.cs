// ABOUTME: Interface defining cookie authentication configuration settings.
// ABOUTME: Used for dependency injection and configuration binding throughout the application.

namespace AGDevX.Cart.Shared.Configuration;

public interface ICookieSettings
{
    int SessionTimeoutMinutes { get; }
}
