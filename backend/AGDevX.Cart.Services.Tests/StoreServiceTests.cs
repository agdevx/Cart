// ABOUTME: Unit tests for StoreService covering household-scoped and personal store operations.
// ABOUTME: Tests verify authorization checks for household membership and user ownership.

using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
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

        _mockHouseholdRepository.Setup(x => x.GetById(householdId))
                                .ReturnsAsync(household);

        _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>()))
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

        _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>()))
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

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdStoreAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home", Members = new List<HouseholdMember>() };
        var store = new Store { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var act = () => _storeService.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingPersonalStoreForDifferentUser()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var store = new Store { Id = Guid.NewGuid(), Name = "My Store", UserId = Guid.NewGuid() };

        // Act
        var act = () => _storeService.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnStores_When_GetHouseholdStoresAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };
        var stores = new List<Store> { new() { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId } };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId)).ReturnsAsync(stores);

        // Act
        var result = await _storeService.GetHouseholdStores(householdId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetHouseholdStoresAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync((Household?)null);

        // Act
        var act = () => _storeService.GetHouseholdStores(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnPersonalStores_When_GetPersonalStores()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var stores = new List<Store> { new() { Id = Guid.NewGuid(), Name = "My Store", UserId = userId } };

        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId)).ReturnsAsync(stores);

        // Act
        var result = await _storeService.GetPersonalStores(userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdForHouseholdStoreAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "Target", HouseholdId = householdId };
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);
        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var result = await _storeService.GetById(storeId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Target");
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdForPersonalStoreAsOwner()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "My Store", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);

        // Act
        var result = await _storeService.GetById(storeId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Store");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var result = await _storeService.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdForOtherUsersStore()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "Not Yours", UserId = Guid.NewGuid() };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);

        // Act
        var act = () => _storeService.GetById(storeId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_UpdateStore_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var existing = new Store { Id = storeId, Name = "Old", UserId = userId };
        var updated = new Store { Id = storeId, Name = "New", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>())).ReturnsAsync(updated);

        // Act
        var result = await _storeService.UpdateStore(updated, userId);

        // Assert
        result.Name.Should().Be("New");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _storeService.UpdateStore(new Store { Id = Guid.NewGuid(), Name = "Ghost" }, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_DeleteStore_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var existing = new Store { Id = storeId, Name = "Doomed", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.Delete(storeId)).Returns(Task.CompletedTask);

        // Act
        await _storeService.DeleteStore(storeId, userId);

        // Assert
        _mockStoreRepository.Verify(r => r.Delete(storeId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _storeService.DeleteStore(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
