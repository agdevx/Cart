// ABOUTME: Implementation of cookie authentication configuration settings bound from appSettings.json.
// ABOUTME: Provides default values for session timeout.

namespace AGDevX.Cart.Shared.Configuration;

public class CookieSettings : ICookieSettings
{
    public int SessionTimeoutMinutes { get; set; } = 30;
}
