// ABOUTME: Tests for security headers middleware
// ABOUTME: Verifies all required security headers are added to responses

using AGDevX.Cart.Api.Middleware;
using Microsoft.AspNetCore.Http;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task Should_add_all_security_headers()
    {
        var middleware = new SecurityHeadersMiddleware(
            next: ctx => Task.CompletedTask);

        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"]);
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("0", context.Response.Headers["X-XSS-Protection"]);
        Assert.Contains("default-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("script-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("font-src 'self' https://fonts.gstatic.com", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("img-src 'self' data:", context.Response.Headers["Content-Security-Policy"].ToString());
        Assert.Contains("connect-src 'self'", context.Response.Headers["Content-Security-Policy"].ToString());
    }

    [Fact]
    public async Task Should_call_next_middleware()
    {
        var nextCalled = false;
        var middleware = new SecurityHeadersMiddleware(
            next: ctx => { nextCalled = true; return Task.CompletedTask; });

        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }
}
