// ABOUTME: Catches unhandled exceptions and returns a safe 500 response
// ABOUTME: Logs the full exception for debugging without leaking details to the client

using System.Text.Json;

namespace AGDevX.Cart.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException)
        {
            if (context.RequestAborted.IsCancellationRequested)
            {
                logger.LogInformation("Client disconnected");
                return;
            }

            logger.LogWarning("Request timed out: {Path}", context.Request.Path);

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status408RequestTimeout;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    errorCode = "REQUEST_TIMEOUT",
                    message = "The request timed out."
                });
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new { errorCode = "SERVER_ERROR", message = "An unexpected error occurred." };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionMiddleware>();
    }
}
