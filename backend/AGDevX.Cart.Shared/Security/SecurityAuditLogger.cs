// ABOUTME: Logs security-relevant events with consistent formatting and masked PII.
// ABOUTME: Captures IP address from HttpContext for audit trail.

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace AGDevX.Cart.Shared.Security;

public class SecurityAuditLogger(ILogger<SecurityAuditLogger> logger, IHttpContextAccessor httpContextAccessor) : ISecurityAuditLogger
{
    private string GetClientIp()
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return "unknown";

        // Check X-Forwarded-For for reverse proxy scenarios
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    public static string MaskEmail(string email)
    {
        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "****";
        return $"{email[0]}****{email[atIndex..]}";
    }

    public void LogFailedLogin(string email)
    {
        logger.LogWarning("Security: Failed login attempt for {Email} from {IP}",
            MaskEmail(email), GetClientIp());
    }

    public void LogRegistration(string email)
    {
        logger.LogInformation("Security: Account created for {Email} from {IP}",
            MaskEmail(email), GetClientIp());
    }

    public void LogPasswordChange(Guid userId)
    {
        logger.LogInformation("Security: Password changed for user {UserId} from {IP}",
            userId, GetClientIp());
    }

    public void LogEmailChange(Guid userId, string oldEmail)
    {
        logger.LogInformation("Security: Email changed for user {UserId} from {OldEmail} from {IP}",
            userId, MaskEmail(oldEmail), GetClientIp());
    }

    public void LogFailedAuthorization(Guid userId, string resourceType)
    {
        logger.LogWarning("Security: Failed authorization for user {UserId} on {ResourceType} from {IP}",
            userId, resourceType, GetClientIp());
    }
}
