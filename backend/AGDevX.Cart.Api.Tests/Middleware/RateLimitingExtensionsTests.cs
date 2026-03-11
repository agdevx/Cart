// ABOUTME: Tests for rate limiting configuration
// ABOUTME: Verifies rate limit policies are registered and enforce correct limits

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AGDevX.Cart.Api.Middleware;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class RateLimitingExtensionsTests
{
    private static async Task<IHost> CreateTestHost()
    {
        return await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder.UseTestServer();
                webBuilder.ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddRateLimiting();
                });
                webBuilder.Configure(app =>
                {
                    app.UseRouting();
                    app.UseRateLimiter();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapGet("/auth-test", async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        }).RequireRateLimiting("auth");

                        endpoints.MapGet("/general-test", async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        });

                        endpoints.MapMethods("/options-test", new[] { "OPTIONS" }, async context =>
                        {
                            await context.Response.WriteAsync("OK");
                        });
                    });
                });
            })
            .StartAsync();
    }

    [Fact]
    public async Task Auth_policy_should_return_429_after_exceeding_limit()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Auth policy allows 5 requests per minute per IP
        for (var i = 0; i < 5; i++)
        {
            var response = await client.GetAsync("/auth-test");
            Assert.Equal(200, (int)response.StatusCode);
        }

        // 6th request should be rate limited
        var limitedResponse = await client.GetAsync("/auth-test");
        Assert.Equal(429, (int)limitedResponse.StatusCode);
    }

    [Fact]
    public async Task General_policy_should_return_429_after_exceeding_limit()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Global limiter allows 30 requests per minute per IP
        for (var i = 0; i < 30; i++)
        {
            var response = await client.GetAsync("/general-test");
            Assert.Equal(200, (int)response.StatusCode);
        }

        // 31st request should be rate limited
        var limitedResponse = await client.GetAsync("/general-test");
        Assert.Equal(429, (int)limitedResponse.StatusCode);
    }

    [Fact]
    public async Task Options_preflight_should_not_be_rate_limited()
    {
        using var host = await CreateTestHost();
        var client = host.GetTestClient();

        // Send more than 30 OPTIONS requests — none should be rate limited
        for (var i = 0; i < 35; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Options, "/options-test");
            var response = await client.SendAsync(request);
            Assert.Equal(200, (int)response.StatusCode);
        }
    }
}
