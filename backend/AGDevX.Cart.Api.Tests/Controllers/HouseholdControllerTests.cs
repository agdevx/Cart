// ABOUTME: Tests for household API controller endpoints
// ABOUTME: Validates household CRUD operations and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Data.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class HouseholdControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_GetUserHouseholds()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var households = new List<Household>
        {
            new Household { Id = Guid.NewGuid(), Name = "Test Household" }
        };

        mockService.Setup(s => s.GetUserHouseholds(userId))
                   .ReturnsAsync(households);

        // Act
        var result = await controller.GetUserHouseholds();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(households);
    }

    [Fact]
    public async Task Should_ReturnCreated_When_CreateHousehold()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var householdName = "New Household";
        var created = new Household { Id = Guid.NewGuid(), Name = householdName };

        mockService.Setup(s => s.CreateHousehold(userId, householdName))
                   .ReturnsAsync(created);

        // Act
        var result = await controller.CreateHousehold(householdName);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(created);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var household = new Household { Id = householdId, Name = "Test Household" };

        mockService.Setup(s => s.GetById(userId, householdId))
                   .ReturnsAsync(household);

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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetById(userId, householdId))
                   .ReturnsAsync((Household?)null);

        // Act
        var result = await controller.GetById(householdId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UserNotAuthenticated()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity()); // No claims

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await controller.GetUserHouseholds();

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var householdName = "Updated Household";

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var updated = new Household { Id = householdId, Name = householdName };

        mockService.Setup(s => s.UpdateHousehold(userId, householdId, householdName))
                   .ReturnsAsync(updated);

        // Act
        var result = await controller.UpdateHousehold(householdId, householdName);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteHousehold(userId, householdId))
                   .Returns(Task.CompletedTask);

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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var householdName = "Updated Household";

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.UpdateHousehold(userId, householdId, householdName))
                   .ThrowsAsync(new ArgumentException("Household not found"));

        // Act
        var result = await controller.UpdateHousehold(householdId, householdName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateHouseholdUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var householdName = "Updated Household";

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.UpdateHousehold(userId, householdId, householdName))
                   .ThrowsAsync(new UnauthorizedAccessException("User is not a member of this household"));

        // Act
        var result = await controller.UpdateHousehold(householdId, householdName);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    //== Join household tests

    [Fact]
    public async Task Should_ReturnOk_When_JoinHouseholdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var household = new Household { Id = Guid.NewGuid(), Name = "Test" };
        mockService.Setup(s => s.JoinHousehold(userId, "ABC123")).ReturnsAsync(household);

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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.JoinHousehold(userId, "INVALID"))
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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var members = new List<HouseholdMember>
        {
            new HouseholdMember { UserId = userId, HouseholdId = householdId, Role = "owner" }
        };

        mockService.Setup(s => s.GetMembers(userId, householdId)).ReturnsAsync(members);

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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.RemoveMember(userId, householdId, targetUserId)).Returns(Task.CompletedTask);

        // Act
        var result = await controller.RemoveMember(householdId, targetUserId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Transfer ownership test

    [Fact]
    public async Task Should_ReturnNoContent_When_TransferOwnershipSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var newOwnerId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.TransferOwnership(userId, householdId, newOwnerId)).Returns(Task.CompletedTask);

        // Act
        var result = await controller.TransferOwnership(householdId, new TransferOwnershipRequest { UserId = newOwnerId });

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    //== Get invite code test

    [Fact]
    public async Task Should_ReturnOk_When_GetInviteCodeSuccessful()
    {
        // Arrange
        var mockService = new Mock<IHouseholdService>();
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetInviteCode(userId, householdId)).ReturnsAsync("XK7M2P");

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
        var controller = new HouseholdController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.RegenerateInviteCode(userId, householdId)).ReturnsAsync("NEW456");

        // Act
        var result = await controller.RegenerateInviteCode(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { inviteCode = "NEW456" });
    }
}
