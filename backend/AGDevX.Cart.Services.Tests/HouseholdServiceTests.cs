// ABOUTME: Unit tests for HouseholdService business logic.
// ABOUTME: Verifies household creation, joining, leaving, ownership, and authorization.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AGDevX.Cart.Services.Tests;

public class HouseholdServiceTests
{
    private readonly Mock<IHouseholdRepository> _mockRepository;
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<IUserPreferencesRepository> _mockPrefsRepository;
    private readonly CartDbContext _dbContext;
    private readonly IHouseholdService _service;

    public HouseholdServiceTests()
    {
        _mockRepository = new Mock<IHouseholdRepository>();
        _mockTripRepository = new Mock<ITripRepository>();
        _mockPrefsRepository = new Mock<IUserPreferencesRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _service = new HouseholdService(
            _mockRepository.Object,
            _mockTripRepository.Object,
            _mockPrefsRepository.Object,
            _dbContext);
    }

    //== CreateHousehold tests

    [Fact]
    public async Task Should_CreateHousehold_When_UserHasNoHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "test@test.com", Name = "Test" };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        _mockRepository.Setup(r => r.Create(It.IsAny<Household>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((Household h, CancellationToken _) => h);

        // Act
        var result = await _service.CreateHousehold(userId, "My Household");

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("My Household");
        result.Owner1UserId.Should().Be(userId);
        result.InviteCode.Should().HaveLength(6);
        _mockRepository.Verify(r => r.Create(It.IsAny<Household>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    //== JoinHousehold tests

    [Fact]
    public async Task Should_JoinHousehold_When_ValidInviteCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "test@test.com", Name = "Test" };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            InviteCode = "ABC123",
            Owner1UserId = Guid.NewGuid()
        };

        _mockRepository.Setup(r => r.GetByInviteCode("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        var result = await _service.JoinHousehold(userId, "ABC123");

        // Assert
        result.Id.Should().Be(household.Id);
        var updatedUser = await _dbContext.Users.FindAsync(userId);
        updatedUser!.HouseholdId.Should().Be(household.Id);
    }

    [Fact]
    public async Task Should_ThrowArgumentException_When_InvalidInviteCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test" });
        await _dbContext.SaveChangesAsync();

        _mockRepository.Setup(r => r.GetByInviteCode("INVALID", It.IsAny<CancellationToken>())).ReturnsAsync((Household?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.JoinHousehold(userId, "INVALID"));
    }

    [Fact]
    public async Task Should_ThrowInvalidOperationException_When_AlreadyMemberOfSameHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            InviteCode = "ABC123",
            Owner1UserId = Guid.NewGuid()
        };

        _mockRepository.Setup(r => r.GetByInviteCode("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.JoinHousehold(userId, "ABC123"));
    }

    //== LeaveHousehold tests

    [Fact]
    public async Task Should_LeaveHousehold_When_NonOwnerMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        _dbContext.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.GetMembers(householdId, It.IsAny<CancellationToken>()))
                       .ReturnsAsync(new List<User>
                       {
                           new() { Id = ownerId, Name = "Owner" },
                           new() { Id = userId, Name = "Member" }
                       });

        // Act
        await _service.LeaveHousehold(userId);

        // Assert
        var user = await _dbContext.Users.FindAsync(userId);
        user!.HouseholdId.Should().BeNull();
        _mockTripRepository.Verify(r => r.DeletePersonalTripItemsForUser(householdId, userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowInvalidOperationException_When_NotInAnyHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "solo@test.com", Name = "Solo" });
        await _dbContext.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.LeaveHousehold(userId));
    }

    [Fact]
    public async Task Should_ThrowInvalidOperationException_When_SoleOwnerWithOtherMembers()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = ownerId, Email = "owner@test.com", Name = "Owner", HouseholdId = householdId });
        _dbContext.Users.Add(new User { Id = memberId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Home", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.GetMembers(householdId, It.IsAny<CancellationToken>()))
                       .ReturnsAsync(new List<User>
                       {
                           new() { Id = ownerId, Name = "Owner" },
                           new() { Id = memberId, Name = "Member" }
                       });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.LeaveHousehold(ownerId));
    }

    //== RemoveMember tests

    [Fact]
    public async Task Should_RemoveMember_When_OwnerRemovesNonOwner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = memberId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        await _service.RemoveMember(ownerId, householdId, memberId);

        // Assert
        var user = await _dbContext.Users.FindAsync(memberId);
        user!.HouseholdId.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_RemovingSelf()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RemoveMember(userId, householdId, userId));
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_When_NonOwnerRemovesOther()
    {
        // Arrange
        var memberId = Guid.NewGuid();
        var otherId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.RemoveMember(memberId, householdId, otherId));
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_RemovingAnotherOwner()
    {
        // Arrange
        var owner1Id = Guid.NewGuid();
        var owner2Id = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = owner1Id, Owner2UserId = owner2Id };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RemoveMember(owner1Id, householdId, owner2Id));
    }

    //== PromoteToOwner tests

    [Fact]
    public async Task Should_PromoteToOwner_When_SlotAvailable()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = memberId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.Update(It.IsAny<Household>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((Household h, CancellationToken _) => h);

        // Act
        await _service.PromoteToOwner(ownerId, householdId, memberId);

        // Assert
        household.Owner2UserId.Should().Be(memberId);
        _mockRepository.Verify(r => r.Update(It.IsAny<Household>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_BothOwnerSlotsFilled()
    {
        // Arrange
        var owner1Id = Guid.NewGuid();
        var owner2Id = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = memberId, Email = "member@test.com", Name = "Member", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = owner1Id, Owner2UserId = owner2Id };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.PromoteToOwner(owner1Id, householdId, memberId));
    }

    //== DemoteOwner tests

    [Fact]
    public async Task Should_DemoteOwner2_When_TwoOwners()
    {
        // Arrange
        var owner1Id = Guid.NewGuid();
        var owner2Id = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = owner1Id, Owner2UserId = owner2Id };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.Update(It.IsAny<Household>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((Household h, CancellationToken _) => h);

        // Act
        await _service.DemoteOwner(owner1Id, householdId, owner2Id);

        // Assert
        household.Owner2UserId.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_DemotingLastOwner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = ownerId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DemoteOwner(ownerId, householdId, ownerId));
    }

    //== RegenerateInviteCode tests

    [Fact]
    public async Task Should_RegenerateInviteCode_When_Owner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Test", InviteCode = "OLD123", Owner1UserId = ownerId };

        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.Update(It.IsAny<Household>(), It.IsAny<CancellationToken>())).ReturnsAsync((Household h, CancellationToken _) => h);

        // Act
        var newCode = await _service.RegenerateInviteCode(ownerId, householdId);

        // Assert
        Assert.NotNull(newCode);
        Assert.NotEqual("OLD123", newCode);
        Assert.Equal(6, newCode.Length);
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_When_NonOwnerRegenerates()
    {
        // Arrange
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Test", InviteCode = "OLD123", Owner1UserId = Guid.NewGuid() };

        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.RegenerateInviteCode(memberId, householdId));
    }

    //== GetMembers and GetInviteCode tests

    [Fact]
    public async Task Should_GetMembers_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = userId };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);
        _mockRepository.Setup(r => r.GetMembers(householdId, It.IsAny<CancellationToken>()))
                       .ReturnsAsync(new List<User> { new() { Id = userId, Name = "Test" } });

        // Act
        var result = await _service.GetMembers(userId, householdId);

        // Assert
        Assert.Single(result);
        var member = result.First();
        member.UserId.Should().Be(userId);
        member.IsOwner.Should().BeTrue();
    }

    [Fact]
    public async Task Should_GetInviteCode_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();

        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Owner1UserId = Guid.NewGuid() };
        _mockRepository.Setup(r => r.GetById(householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        var result = await _service.GetInviteCode(userId, householdId);

        // Assert
        Assert.Equal("ABC123", result);
    }

    //== GetSwapStatus tests

    [Fact]
    public async Task Should_ReturnNoneScenario_When_UserHasNoHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = userId, Email = "solo@test.com", Name = "Solo" });
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetSwapStatus(userId);

        // Assert
        result.Scenario.Should().Be("none");
    }
}
