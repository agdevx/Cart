// ABOUTME: Tests that request timeout middleware is configured with correct policies

using AGDevX.Cart.Api.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class RequestTimeoutExtensionsTests
{
    [Fact]
    public void AddRequestTimeoutPolicies_RegistersDefaultPolicy()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRequestTimeoutPolicies();

        var app = builder.Build();
        var options = app.Services.GetRequiredService<IOptions<RequestTimeoutOptions>>();

        Assert.NotNull(options.Value.DefaultPolicy);
        Assert.Equal(TimeSpan.FromSeconds(30), options.Value.DefaultPolicy!.Timeout);
    }

    [Fact]
    public void AddRequestTimeoutPolicies_RegistersSsePolicy()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRequestTimeoutPolicies();

        var app = builder.Build();
        var options = app.Services.GetRequiredService<IOptions<RequestTimeoutOptions>>();

        Assert.True(options.Value.Policies.ContainsKey("sse"));
        Assert.Equal(Timeout.InfiniteTimeSpan, options.Value.Policies["sse"].Timeout);
    }
}
