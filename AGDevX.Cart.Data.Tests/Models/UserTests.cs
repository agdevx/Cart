// ABOUTME: Unit tests for the User model class
// ABOUTME: Validates property initialization and assignment behavior
namespace AGDevX.Cart.Data.Tests.Models;

using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Xunit;

public class UserTests
{
    [Fact]
    public void Should_InitializeWithDefaults_When_CreatingNewUser()
    {
        // Arrange & Act
        var user = new User();

        // Assert
        user.Id.Should().Be(0);
        user.Email.Should().BeNull();
        user.PasswordHash.Should().BeNull();
        user.DisplayName.Should().BeNull();
        user.HouseholdMemberships.Should().NotBeNull();
        user.HouseholdMemberships.Should().BeEmpty();
    }

    [Fact]
    public void Should_SetPropertiesCorrectly_When_AssigningValues()
    {
        // Arrange
        var user = new User();
        var expectedEmail = "test@example.com";
        var expectedPasswordHash = "hashed_password_123";
        var expectedDisplayName = "Test User";

        // Act
        user.Email = expectedEmail;
        user.PasswordHash = expectedPasswordHash;
        user.DisplayName = expectedDisplayName;

        // Assert
        user.Email.Should().Be(expectedEmail);
        user.PasswordHash.Should().Be(expectedPasswordHash);
        user.DisplayName.Should().Be(expectedDisplayName);
    }
}
