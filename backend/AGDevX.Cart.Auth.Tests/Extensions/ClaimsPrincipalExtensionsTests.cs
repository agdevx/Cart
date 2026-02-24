// ABOUTME: Tests for ClaimsPrincipalExtensions verifying user ID extraction from claims.
// ABOUTME: Covers valid claims, missing claims, and invalid claim values.

using System.Security.Claims;
using AGDevX.Cart.Auth.Extensions;
using FluentAssertions;

namespace AGDevX.Cart.Auth.Tests.Extensions;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void Should_ReturnUserId_When_ValidGuidClaim()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().Be(userId);
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_MissingClaim()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.Email, "test@test.com")
        ]));

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_InvalidGuidValue()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "not-a-guid")
        ]));

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_NoClaims()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }
}
