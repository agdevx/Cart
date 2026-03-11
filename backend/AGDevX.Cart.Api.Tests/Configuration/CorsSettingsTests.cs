// ABOUTME: Tests for CORS settings configuration binding
// ABOUTME: Verifies CorsSettings binds correctly from configuration

using AGDevX.Cart.Shared.Configuration;
using Microsoft.Extensions.Configuration;

namespace AGDevX.Cart.Api.Tests.Configuration;

public class CorsSettingsTests
{
    [Fact]
    public void Should_bind_allowed_origins_from_configuration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CorsSettings:AllowedOrigins:0"] = "http://localhost:5173",
                ["CorsSettings:AllowedOrigins:1"] = "https://example.com",
            })
            .Build();

        var settings = config.GetSection("CorsSettings").Get<CorsSettings>()!;

        Assert.Equal(2, settings.AllowedOrigins.Length);
        Assert.Equal("http://localhost:5173", settings.AllowedOrigins[0]);
        Assert.Equal("https://example.com", settings.AllowedOrigins[1]);
    }

    [Fact]
    public void Should_default_to_empty_array()
    {
        var settings = new CorsSettings();
        Assert.Empty(settings.AllowedOrigins);
    }
}
