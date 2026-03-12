// ABOUTME: Tests for global exception handler middleware
// ABOUTME: Verifies unhandled exceptions return safe 500 responses without leaking details

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using AGDevX.Cart.Api.Middleware;

namespace AGDevX.Cart.Api.Tests.Middleware;

public class GlobalExceptionMiddlewareTests
{
    [Fact]
    public async Task Should_return_500_with_generic_message_when_unhandled_exception_occurs()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            next: _ => throw new InvalidOperationException("Secret database error details"),
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(500, context.Response.StatusCode);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var json = JsonDocument.Parse(body);
        Assert.Equal("SERVER_ERROR", json.RootElement.GetProperty("errorCode").GetString());
        Assert.Equal("An unexpected error occurred.", json.RootElement.GetProperty("message").GetString());
        Assert.DoesNotContain("Secret database error details", body);
    }

    [Fact]
    public async Task Should_pass_through_when_no_exception()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            next: ctx => { ctx.Response.StatusCode = 200; return Task.CompletedTask; },
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(200, context.Response.StatusCode);
    }

    [Fact]
    public async Task Should_log_the_exception()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var exception = new InvalidOperationException("Test error");
        var middleware = new GlobalExceptionMiddleware(
            next: _ => throw exception,
            logger: logger.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        logger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => true),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task Returns408_WhenOperationCanceledByTimeout()
    {
        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new OperationCanceledException(),
            logger.Object
        );

        var context = new DefaultHttpContext();
        // RequestAborted is NOT canceled — this is a server timeout, not client disconnect
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();

        Assert.Equal(408, context.Response.StatusCode);
        Assert.Contains("REQUEST_TIMEOUT", body);
    }

    [Fact]
    public async Task ReturnsNoResponse_WhenClientDisconnects()
    {
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var logger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new OperationCanceledException(),
            logger.Object
        );

        var context = new DefaultHttpContext();
        context.RequestAborted = cts.Token;
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        // Client disconnected — middleware should not try to write a response
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        Assert.Empty(body);
    }
}
