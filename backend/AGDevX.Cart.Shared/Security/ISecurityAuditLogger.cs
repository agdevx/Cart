// ABOUTME: Interface for security audit logging.
// ABOUTME: Provides methods for logging security-relevant events.

namespace AGDevX.Cart.Shared.Security;

public interface ISecurityAuditLogger
{
    void LogFailedLogin(string email);
    void LogRegistration(string email);
    void LogPasswordChange(Guid userId);
    void LogEmailChange(Guid userId, string oldEmail);
    void LogFailedAuthorization(Guid userId, string resourceType);
}
