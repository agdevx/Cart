// ABOUTME: Configures server-side request timeouts. Default 30s for all endpoints,
// infinite timeout for SSE endpoints. Prevents hung requests from holding connections.

using Microsoft.AspNetCore.Http.Timeouts;

namespace AGDevX.Cart.Api.Middleware;

public static class RequestTimeoutExtensions
{
    public static IServiceCollection AddRequestTimeoutPolicies(this IServiceCollection services)
    {
        services.AddRequestTimeouts(options =>
        {
            options.DefaultPolicy = new RequestTimeoutPolicy
            {
                Timeout = TimeSpan.FromSeconds(30)
            };

            options.AddPolicy("sse", new RequestTimeoutPolicy
            {
                Timeout = Timeout.InfiniteTimeSpan
            });
        });

        return services;
    }
}
