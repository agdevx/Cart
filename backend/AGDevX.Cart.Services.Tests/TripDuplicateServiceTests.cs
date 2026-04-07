// ABOUTME: Tests for the DuplicateTrip service method
// ABOUTME: Validates item cloning, visibility filtering, scope re-derivation, and authorization

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class TripDuplicateServiceTests
{
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly CartDbContext _dbContext;
    private readonly TripService _tripService;

    public TripDuplicateServiceTests()
    {
        _mockTripRepository = new Mock<ITripRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _tripService = new TripService(_mockTripRepository.Object, _dbContext, _mockTripItemRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_DuplicatePersonalTrip_WithAllItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", Quantity = 2, StoreName = "Costco", StoreId = Guid.NewGuid(), Notes = "2%", IsHouseholdItem = false, IsChecked = true, CheckedAt = DateTime.UtcNow, CreatedBy = userId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Bread", Quantity = 1, StoreName = null, StoreId = null, Notes = null, IsHouseholdItem = false, IsChecked = false, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "New Trip", null, null, userId);

        //== Assert
        result.Name.Should().Be("New Trip");
        result.IsCompleted.Should().BeFalse();
        result.IsStarted.Should().BeFalse();
        result.HouseholdId.Should().BeNull();

        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();

        clonedItems.Should().HaveCount(2);
        clonedItems.Should().AllSatisfy(ti =>
        {
            ti.IsChecked.Should().BeFalse();
            ti.CheckedAt.Should().BeNull();
            ti.Id.Should().NotBe(sourceItems[0].Id);
            ti.Id.Should().NotBe(sourceItems[1].Id);
        });

        var milk = clonedItems.First(ti => ti.ItemName == "Milk");
        milk.Quantity.Should().Be(2);
        milk.StoreName.Should().Be("Costco");
        milk.Notes.Should().Be("2%");
        milk.IsHouseholdItem.Should().BeFalse();
    }

    [Fact]
    public async Task Should_DuplicateHouseholdTrip_OnlyCopiesVisibleItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Household Milk", IsHouseholdItem = true, Quantity = 1, CreatedBy = otherUserId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "My Personal Item", IsHouseholdItem = false, Quantity = 1, CreatedBy = userId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Other Personal Item", IsHouseholdItem = false, Quantity = 1, CreatedBy = otherUserId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Dup", null, householdId, userId);

        //== Assert
        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();

        clonedItems.Should().HaveCount(2);
        clonedItems.Select(ti => ti.ItemName).Should().Contain("Household Milk");
        clonedItems.Select(ti => ti.ItemName).Should().Contain("My Personal Item");
        clonedItems.Select(ti => ti.ItemName).Should().NotContain("Other Personal Item");
    }

    [Fact]
    public async Task Should_RederiveIsHouseholdItem_BasedOnDestinationScope()
    {
        //== Arrange — household source trip duplicated as personal
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", IsHouseholdItem = true, Quantity = 1, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act — duplicate as personal (householdId = null)
        var result = await _tripService.DuplicateTrip(sourceTripId, "Personal Dup", null, null, userId);

        //== Assert — IsHouseholdItem should be false since destination is personal
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.IsHouseholdItem.Should().BeFalse();
    }

    [Fact]
    public async Task Should_RederiveIsHouseholdItem_WhenDuplicatingPersonalAsHousehold()
    {
        //== Arrange — personal source trip duplicated as household
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", IsHouseholdItem = false, Quantity = 1, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act — duplicate as household
        var result = await _tripService.DuplicateTrip(sourceTripId, "Household Dup", null, householdId, userId);

        //== Assert — IsHouseholdItem should be true since destination is household
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.IsHouseholdItem.Should().BeTrue();
    }

    [Fact]
    public async Task Should_DuplicateEmptyTrip()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(new List<TripItem>());

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Empty Dup", null, null, userId);

        //== Assert
        result.Name.Should().Be("Empty Dup");

        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();
        clonedItems.Should().BeEmpty();
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_WhenNoAccessToSourceTrip()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(false);

        //== Act
        var act = () => _tripService.DuplicateTrip(sourceTripId, "Dup", null, null, userId);

        //== Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_WhenNotMemberOfTargetHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        var targetHouseholdId = Guid.NewGuid();
        await SeedUser(userId); // no household membership

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(new List<TripItem>());

        //== Act
        var act = () => _tripService.DuplicateTrip(sourceTripId, "Dup", null, targetHouseholdId, userId);

        //== Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_CopyItemsWithNullInventoryAndStoreIds()
    {
        //== Arrange — items whose pantry item and store were deleted
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, InventoryItemId = null, ItemName = "Deleted Item", StoreId = null, StoreName = "Old Store", Quantity = 3, IsHouseholdItem = false, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Dup", null, null, userId);

        //== Assert
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.InventoryItemId.Should().BeNull();
        clonedItem.ItemName.Should().Be("Deleted Item");
        clonedItem.StoreId.Should().BeNull();
        clonedItem.StoreName.Should().Be("Old Store");
        clonedItem.Quantity.Should().Be(3);
    }
}
