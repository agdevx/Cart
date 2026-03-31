// ABOUTME: Tests for household API controller endpoints
// ABOUTME: Validates household CRUD operations and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class HouseholdControllerTests
{
    private static HouseholdController CreateController(Mock<IHouseholdService> mockService, Guid userId)
    {
        var controller = new HouseholdController(mockService.Object);
        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
        return controller;
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetUserHousehold()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var household = new Household { Id = Guid.NewGuid(), Name = "Test Household", Owner1UserId = userId };
        mockService.Setup(s => s.GetUserHousehold(userId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        var result = await controller.GetUserHousehold();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(household);
    }

    [Fact]
    public async Task Should_ReturnCreated_When_CreateHousehold()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var householdName = "New Household";
        var created = new Household { Id = Guid.NewGuid(), Name = householdName, Owner1UserId = userId };
        mockService.Setup(s => s.CreateHousehold(userId, householdName, It.IsAny<CancellationToken>())).ReturnsAsync(created);

        // Act
        var result = await controller.CreateHousehold(new CreateHouseholdRequest { Name = householdName });

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(created);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var household = new Household { Id = householdId, Name = "Test Household", Owner1UserId = userId };
        mockService.Setup(s => s.GetById(userId, householdId, It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        var result = await controller.GetById(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(household);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_GetByIdNotFound()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.GetById(userId, householdId, It.IsAny<CancellationToken>())).ReturnsAsync((Household?)null);

        // Act
        var result = await controller.GetById(householdId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var updated = new Household { Id = householdId, Name = "Updated Household", Owner1UserId = userId };
        mockService.Setup(s => s.UpdateHousehold(userId, householdId, "Updated Household", It.IsAny<CancellationToken>())).ReturnsAsync(updated);

        // Act
        var result = await controller.UpdateHousehold(householdId, new UpdateHouseholdRequest { Name = "Updated Household" });

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.DeleteHousehold(userId, householdId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.DeleteHousehold(householdId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateHouseholdNotFound()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.UpdateHousehold(userId, householdId, "Updated Household", It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Household not found"));

        // Act
        var result = await controller.UpdateHousehold(householdId, new UpdateHouseholdRequest { Name = "Updated Household" });

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateHouseholdUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.UpdateHousehold(userId, householdId, "Updated Household", It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new UnauthorizedAccessException("User is not a member of this household"));

        // Act
        var result = await controller.UpdateHousehold(householdId, new UpdateHouseholdRequest { Name = "Updated Household" });

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    //== Join household tests

    [Fact]
    public async Task Should_ReturnOk_When_JoinHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var household = new Household { Id = Guid.NewGuid(), Name = "Test", Owner1UserId = Guid.NewGuid() };
        mockService.Setup(s => s.JoinHousehold(userId, "ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(household);

        // Act
        var result = await controller.JoinHousehold(new JoinHouseholdRequest { InviteCode = "ABC123" });

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(household);
    }

    [Fact]
    public async Task Should_ReturnBadRequest_When_InvalidInviteCode()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.JoinHousehold(userId, "INVALID", It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Invalid invite code"));

        // Act
        var result = await controller.JoinHousehold(new JoinHouseholdRequest { InviteCode = "INVALID" });

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    //== Get members test

    [Fact]
    public async Task Should_ReturnOk_When_GetMembersSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var members = new List<HouseholdMemberResponse>
        {
            new HouseholdMemberResponse { UserId = userId, Name = "Test", IsOwner = true }
        };

        mockService.Setup(s => s.GetMembers(userId, householdId, It.IsAny<CancellationToken>())).ReturnsAsync(members);

        // Act
        var result = await controller.GetMembers(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(members);
    }

    //== Remove member test

    [Fact]
    public async Task Should_ReturnNoContent_When_RemoveMemberSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.RemoveMember(userId, householdId, targetUserId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.RemoveMember(householdId, targetUserId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Promote owner test

    [Fact]
    public async Task Should_ReturnNoContent_When_PromoteToOwnerSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.PromoteToOwner(userId, householdId, targetUserId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.PromoteToOwner(householdId, new PromoteOwnerRequest { UserId = targetUserId });

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Demote owner test

    [Fact]
    public async Task Should_ReturnNoContent_When_DemoteOwnerSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.DemoteOwner(userId, householdId, targetUserId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.DemoteOwner(householdId, new DemoteOwnerRequest { UserId = targetUserId });

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Leave household test

    [Fact]
    public async Task Should_ReturnNoContent_When_LeaveHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.LeaveHousehold(userId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.LeaveHousehold();

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Get swap status test

    [Fact]
    public async Task Should_ReturnOk_When_GetSwapStatusSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var status = new SwapStatusResponse { Scenario = "none" };
        mockService.Setup(s => s.GetSwapStatus(userId, It.IsAny<CancellationToken>())).ReturnsAsync(status);

        // Act
        var result = await controller.GetSwapStatus();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(status);
    }

    //== Get invite code test

    [Fact]
    public async Task Should_ReturnOk_When_GetInviteCodeSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.GetInviteCode(userId, householdId, It.IsAny<CancellationToken>())).ReturnsAsync("XK7M2P");

        // Act
        var result = await controller.GetInviteCode(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { inviteCode = "XK7M2P" });
    }

    //== Regenerate invite code test

    [Fact]
    public async Task Should_ReturnOk_When_RegenerateInviteCodeSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.RegenerateInviteCode(userId, householdId, It.IsAny<CancellationToken>())).ReturnsAsync("NEW456");

        // Act
        var result = await controller.RegenerateInviteCode(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { inviteCode = "NEW456" });
    }
}
