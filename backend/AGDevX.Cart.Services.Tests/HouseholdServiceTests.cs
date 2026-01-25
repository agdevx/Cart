// ABOUTME: Unit tests for HouseholdService business logic.
// ABOUTME: Verifies household creation, retrieval, updates, and authorization.

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class HouseholdServiceTests
{
    private readonly Mock<IHouseholdRepository> _mockRepository;
    private readonly IHouseholdService _service;

    public HouseholdServiceTests()
    {
        _mockRepository = new Mock<IHouseholdRepository>();
        _service = new HouseholdService(_mockRepository.Object);
    }

    [Fact]
    public async Task Should_CreateHousehold_When_UserCreatesNew()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdName = "Test Household";

        _mockRepository
            .Setup(r => r.CreateAsync(It.IsAny<Household>()))
            .ReturnsAsync((Household h) => h);

        // Act
        var result = await _service.CreateHouseholdAsync(userId, householdName);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(householdName, result.Name);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Household>()), Times.Once);
    }
}
