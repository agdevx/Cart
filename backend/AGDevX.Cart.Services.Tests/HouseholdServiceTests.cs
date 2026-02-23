// ABOUTME: Unit tests for HouseholdService business logic.
// ABOUTME: Verifies household creation, retrieval, updates, and authorization.

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Data.Models;
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

        _mockRepository.Setup(r => r.Create(It.IsAny<Household>()))
                       .ReturnsAsync((Household h) => h);

        // Act
        var result = await _service.CreateHousehold(userId, householdName);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(householdName, result.Name);
        _mockRepository.Verify(r => r.Create(It.IsAny<Household>()), Times.Once);
    }

    //== JoinHousehold tests

    [Fact]
    public async Task Should_JoinHousehold_When_ValidInviteCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            InviteCode = "ABC123",
            Members = new List<HouseholdMember>()
        };

        _mockRepository.Setup(r => r.GetByInviteCode("ABC123")).ReturnsAsync(household);
        _mockRepository.Setup(r => r.AddMember(It.IsAny<HouseholdMember>())).Returns(Task.CompletedTask);

        // Act
        var result = await _service.JoinHousehold(userId, "ABC123");

        // Assert
        Assert.Equal(household.Id, result.Id);
        _mockRepository.Verify(r => r.AddMember(It.Is<HouseholdMember>(m =>
            m.UserId == userId && m.HouseholdId == household.Id && m.Role == "member"
        )), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowArgumentException_When_InvalidInviteCode()
    {
        // Arrange
        _mockRepository.Setup(r => r.GetByInviteCode("INVALID")).ReturnsAsync((Household?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.JoinHousehold(Guid.NewGuid(), "INVALID"));
    }

    [Fact]
    public async Task Should_ThrowInvalidOperationException_When_AlreadyMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            InviteCode = "ABC123",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = userId, HouseholdId = Guid.NewGuid(), Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetByInviteCode("ABC123")).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.JoinHousehold(userId, "ABC123"));
    }

    //== RemoveMember tests

    [Fact]
    public async Task Should_RemoveMember_When_OwnerRemovesOther()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = ownerId, HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = memberId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.RemoveMember(householdId, memberId)).Returns(Task.CompletedTask);

        // Act
        await _service.RemoveMember(ownerId, householdId, memberId);

        // Assert
        _mockRepository.Verify(r => r.RemoveMember(householdId, memberId), Times.Once);
    }

    [Fact]
    public async Task Should_RemoveMember_When_MemberRemovesSelf()
    {
        // Arrange
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = Guid.NewGuid(), HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = memberId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.RemoveMember(householdId, memberId)).Returns(Task.CompletedTask);

        // Act
        await _service.RemoveMember(memberId, householdId, memberId);

        // Assert
        _mockRepository.Verify(r => r.RemoveMember(householdId, memberId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowInvalidOperation_When_OwnerTriesToRemoveSelf()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = ownerId, HouseholdId = householdId, Role = "owner" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RemoveMember(ownerId, householdId, ownerId));
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_When_NonOwnerRemovesOther()
    {
        // Arrange
        var memberId = Guid.NewGuid();
        var otherId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = Guid.NewGuid(), HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = memberId, HouseholdId = householdId, Role = "member" },
                new HouseholdMember { UserId = otherId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.RemoveMember(memberId, householdId, otherId));
    }

    //== TransferOwnership tests

    [Fact]
    public async Task Should_TransferOwnership_When_OwnerTransfers()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var newOwnerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = ownerId, HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = newOwnerId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.UpdateMemberRole(householdId, ownerId, "member")).Returns(Task.CompletedTask);
        _mockRepository.Setup(r => r.UpdateMemberRole(householdId, newOwnerId, "owner")).Returns(Task.CompletedTask);

        // Act
        await _service.TransferOwnership(ownerId, householdId, newOwnerId);

        // Assert
        _mockRepository.Verify(r => r.UpdateMemberRole(householdId, ownerId, "member"), Times.Once);
        _mockRepository.Verify(r => r.UpdateMemberRole(householdId, newOwnerId, "owner"), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_When_NonOwnerTransfers()
    {
        // Arrange
        var memberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = Guid.NewGuid(), HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = memberId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.TransferOwnership(memberId, householdId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Should_ThrowArgument_When_TransferToNonMember()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var nonMemberId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = ownerId, HouseholdId = householdId, Role = "owner" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.TransferOwnership(ownerId, householdId, nonMemberId));
    }

    //== RegenerateInviteCode tests

    [Fact]
    public async Task Should_RegenerateInviteCode_When_Owner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            InviteCode = "OLD123",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = ownerId, HouseholdId = householdId, Role = "owner" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.Update(It.IsAny<Household>())).ReturnsAsync((Household h) => h);

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
        var household = new Household
        {
            Id = householdId,
            Name = "Test",
            Members = new List<HouseholdMember>
            {
                new HouseholdMember { UserId = Guid.NewGuid(), HouseholdId = householdId, Role = "owner" },
                new HouseholdMember { UserId = memberId, HouseholdId = householdId, Role = "member" }
            }
        };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

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
        var members = new List<HouseholdMember>
        {
            new HouseholdMember { UserId = userId, HouseholdId = householdId, Role = "owner" }
        };
        var household = new Household { Id = householdId, Name = "Test", Members = members };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.IsUserMember(householdId, userId)).ReturnsAsync(true);

        // Act
        var result = await _service.GetMembers(userId, householdId);

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task Should_GetInviteCode_When_UserIsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Test", InviteCode = "ABC123", Members = [] };

        _mockRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockRepository.Setup(r => r.IsUserMember(householdId, userId)).ReturnsAsync(true);

        // Act
        var result = await _service.GetInviteCode(userId, householdId);

        // Assert
        Assert.Equal("ABC123", result);
    }
}
