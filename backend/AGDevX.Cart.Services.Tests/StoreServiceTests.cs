// ABOUTME: Unit tests for StoreService covering household-scoped and personal store operations.
// ABOUTME: Tests verify authorization checks via User.HouseholdId and user ownership.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class StoreServiceTests
{
    private readonly Mock<IStoreRepository> _mockStoreRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly CartDbContext _dbContext;
    private readonly StoreService _storeService;

    public StoreServiceTests()
    {
        _mockStoreRepository = new Mock<IStoreRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _storeService = new StoreService(_mockStoreRepository.Object, _dbContext, _mockTripItemRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_CreateHouseholdStore_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var store = new Store { Name = "Costco", HouseholdId = householdId };

        _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>())).ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Costco", result.Name);
        _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_CreatePersonalStore_When_UserIdMatches()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var store = new Store { Name = "My Local Store", UserId = userId };

        _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>())).ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("My Local Store", result.Name);
        Assert.Equal(userId, result.UserId);
        _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_CreatePersonalStore_When_UserIdNotProvided()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var store = new Store { Name = "My Local Store" };

        _mockStoreRepository.Setup(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>())).ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("My Local Store");
        store.UserId.Should().Be(userId);
        _mockStoreRepository.Verify(x => x.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdStoreAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId); // No household membership

        var store = new Store { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId };

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
        await SeedUser(userId, householdId);

        var stores = new List<Store> { new() { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId } };
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(stores);

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
        await SeedUser(userId); // No household

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

        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>())).ReturnsAsync(stores);

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
        await SeedUser(userId, householdId);

        var store = new Store { Id = storeId, Name = "Target", HouseholdId = householdId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(store);

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

        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(store);

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
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Store?)null);

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

        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(store);

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
        await SeedUser(userId);

        var existing = new Store { Id = storeId, Name = "Old", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("New", userId, null, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);

        // Act
        var result = await _storeService.UpdateStore(storeId, "New", null, userId);

        // Assert
        result.Name.Should().Be("New");
    }

    [Fact]
    public async Task Should_PreserveUserId_When_UpdatingPersonalStore()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new Store { Id = storeId, Name = "Old", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Renamed", userId, null, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);

        // Act
        var result = await _storeService.UpdateStore(storeId, "Renamed", null, userId);

        // Assert
        result.UserId.Should().Be(userId);
        result.Id.Should().Be(storeId);
    }

    [Fact]
    public async Task Should_PreserveHouseholdId_When_UpdatingHouseholdStore()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var existing = new Store { Id = storeId, Name = "Old", HouseholdId = householdId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Renamed", null, householdId, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);

        // Act
        var result = await _storeService.UpdateStore(storeId, "Renamed", householdId, userId);

        // Assert
        result.Name.Should().Be("Renamed");
        result.HouseholdId.Should().Be(householdId);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _storeService.UpdateStore(Guid.NewGuid(), "Ghost", null, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingOtherUsersStore()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var existing = new Store { Id = storeId, Name = "Not Yours", UserId = ownerId };

        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        // Act
        var act = () => _storeService.UpdateStore(storeId, "Hacked", null, attackerId);

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

        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.Delete(storeId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        await _storeService.DeleteStore(storeId, userId);

        // Assert
        _mockStoreRepository.Verify(r => r.Delete(storeId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _storeService.DeleteStore(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateStore_UpdatesStoreNameOnRelatedTripItems()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new Store { Id = storeId, Name = "Old Store", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Renamed Store", userId, null, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);
        _mockTripItemRepository.Setup(r => r.UpdateStoreNameByStoreId(storeId, "Renamed Store", It.IsAny<CancellationToken>()))
                               .Returns(Task.CompletedTask);

        // Act
        var result = await _storeService.UpdateStore(storeId, "Renamed Store", null, userId);

        // Assert
        result.Name.Should().Be("Renamed Store");
        _mockTripItemRepository.Verify(r => r.UpdateStoreNameByStoreId(storeId, "Renamed Store", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateStore_Should_Throw_When_DuplicateNameInPersonalScope()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var store = new Store { Name = "Costco" };

        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var act = () => _storeService.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateStore_Should_Throw_When_DuplicateNameInHouseholdScope()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var store = new Store { Name = "Costco", HouseholdId = householdId };

        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", null, householdId, null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var act = () => _storeService.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateStore_Should_Succeed_When_SameNameDifferentScope()
    {
        // Arrange — "Costco" exists in household, creating personal "Costco"
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var store = new Store { Name = "Costco" };

        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Create(It.IsAny<Store>(), It.IsAny<CancellationToken>())).ReturnsAsync(store);

        // Act
        var result = await _storeService.CreateStore(store, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Costco");
    }

    [Fact]
    public async Task UpdateStore_CanChangeScopeToHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var existing = new Store { Id = storeId, Name = "My Store", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Shared Store", null, householdId, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);

        // Act
        var result = await _storeService.UpdateStore(storeId, "Shared Store", householdId, userId);

        // Assert
        result.HouseholdId.Should().Be(householdId);
        result.UserId.Should().BeNull();
        result.Name.Should().Be("Shared Store");
    }

    [Fact]
    public async Task UpdateStore_Should_Throw_When_DuplicateNameInSameScope()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new Store { Id = storeId, Name = "Target", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var act = () => _storeService.UpdateStore(storeId, "Costco", null, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
    }

    [Fact]
    public async Task UpdateStore_Should_Throw_When_DuplicateNameInDestinationScope()
    {
        // Arrange — moving personal store to household that already has same name
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        var existing = new Store { Id = storeId, Name = "Costco", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", null, householdId, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var act = () => _storeService.UpdateStore(storeId, "Costco", householdId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
    }

    [Fact]
    public async Task UpdateStore_Should_AllowCaseOnlyRename()
    {
        // Arrange — "costco" → "Costco" should NOT 409
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        await SeedUser(userId);

        var existing = new Store { Id = storeId, Name = "costco", UserId = userId };
        _mockStoreRepository.Setup(r => r.GetById(storeId, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, storeId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>(), It.IsAny<CancellationToken>()))
                            .ReturnsAsync((Store s, CancellationToken _) => s);

        // Act
        var result = await _storeService.UpdateStore(storeId, "Costco", null, userId);

        // Assert
        result.Name.Should().Be("Costco");
    }
}
