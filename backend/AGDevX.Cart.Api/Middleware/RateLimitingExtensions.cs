// ABOUTME: Configures rate limiting with auth and general policies
// ABOUTME: Auth: 5 req/min per IP for login/register. General: 60 req/min per IP for all endpoints.

using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace AGDevX.Cart.Api.Middleware;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.Headers["Retry-After"] = "60";
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { errorCode = "RATE_LIMITED", message = "Too many requests. Please try again later." },
                    cancellationToken);
            };

            //== Auth endpoints: 5 requests per minute per IP
            options.AddPolicy("auth", context =>
            {
                var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"auth_{remoteIp}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });

            //== General: 60 requests per minute per IP (default policy)
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                //== Exclude CORS preflight requests from rate limiting
                if (context.Request.Method == HttpMethods.Options)
                {
                    return RateLimitPartition.GetNoLimiter("options");
                }

                var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(remoteIp, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 60,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });
        });

        return services;
    }
}
