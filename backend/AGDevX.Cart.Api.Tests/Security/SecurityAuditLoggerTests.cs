// ABOUTME: Tests for security audit logger
// ABOUTME: Verifies security events are logged with correct level and masked data

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using AGDevX.Cart.Shared.Security;

namespace AGDevX.Cart.Api.Tests.Security;

public class SecurityAuditLoggerTests
{
    private readonly Mock<ILogger<SecurityAuditLogger>> _logger = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new();
    private SecurityAuditLogger CreateLogger()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.168.1.1");
        _httpContextAccessor.Setup(x => x.HttpContext).Returns(context);
        return new SecurityAuditLogger(_logger.Object, _httpContextAccessor.Object);
    }

    [Fact]
    public void LogFailedLogin_should_log_warning_with_masked_email()
    {
        var logger = CreateLogger();

        logger.LogFailedLogin("august@example.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("a****@example.com") && o.ToString()!.Contains("192.168.1.1")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogRegistration_should_log_information()
    {
        var logger = CreateLogger();

        logger.LogRegistration("newuser@test.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("n****@test.com")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogPasswordChange_should_log_information_with_userId()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogPasswordChange(userId);

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString())),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogEmailChange_should_log_information_with_masked_old_email()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogEmailChange(userId, "old@example.com");

        _logger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString()) && o.ToString()!.Contains("o****@example.com")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void LogFailedAuthorization_should_log_warning_with_resource_type()
    {
        var logger = CreateLogger();
        var userId = Guid.NewGuid();

        logger.LogFailedAuthorization(userId, "Household");

        _logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains(userId.ToString()) && o.ToString()!.Contains("Household")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void MaskEmail_should_mask_correctly()
    {
        Assert.Equal("a****@example.com", SecurityAuditLogger.MaskEmail("august@example.com"));
        Assert.Equal("a****@test.com", SecurityAuditLogger.MaskEmail("a@test.com"));
        Assert.Equal("****", SecurityAuditLogger.MaskEmail("invalid"));
    }
}
