// ABOUTME: Unit tests for StoreService covering household-scoped and personal store operations.
// ABOUTME: Tests verify authorization checks for household membership and user ownership.

using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class StoreServiceTests
{
    private readonly Mock<IStoreRepository> _mockStoreRepository;
    private readonly Mock<IHouseholdRepository> _mockHouseholdRepository;
    private readonly StoreService _storeService;

    public StoreServiceTests()
    {
        _mockStoreRepository = new Mock<IStoreRepository>();
        _mockHouseholdRepository = new Mock<IHouseholdRepository>();
        _storeService = new StoreService(_mockStoreRepository.Object, _mockHouseholdRepository.Object);
    }

    [Fact]
    public async Task Should_CreateHouseholdStore_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var store = new Store
        {
            Name = "Costco",
            HouseholdId = householdId
        };

        var household = new Household
        {
            Id = householdId,
            Name = "Test Household",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = userId, Role = "Member" }
            }
        };

        _mockHouseholdRepository
            .Setup(x => x.GetById(householdId))
            .ReturnsAsync(household);

        _mockStoreRepository
            .Setup(x => x.Create(It.IsAny<Store>()))
            .ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Costco", result.Name);
        _mockHouseholdRepository.Verify(x => x.GetById(householdId), Times.Once);
        _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>()), Times.Once);
    }

    [Fact]
    public async Task Should_CreatePersonalStore_When_UserIdMatches()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var store = new Store
        {
            Name = "My Local Store",
            UserId = userId
        };

        _mockStoreRepository
            .Setup(x => x.Create(It.IsAny<Store>()))
            .ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("My Local Store", result.Name);
        Assert.Equal(userId, result.UserId);
        _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>()), Times.Once);
        _mockHouseholdRepository.Verify(x => x.GetById(It.IsAny<Guid>()), Times.Never);
    }
}
