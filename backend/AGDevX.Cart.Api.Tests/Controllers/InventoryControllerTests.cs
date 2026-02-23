// ABOUTME: Tests for inventory API controller endpoints
// ABOUTME: Validates inventory CRUD operations and authorization for household and personal inventory items

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class InventoryControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_GetHouseholdInventory()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var items = new List<InventoryItem>
        {
            new InventoryItem { Id = Guid.NewGuid(), Name = "Test Item", HouseholdId = householdId }
        };

        mockService.Setup(s => s.GetHouseholdInventory(householdId, userId))
            .ReturnsAsync(items);

        // Act
        var result = await controller.GetHouseholdInventory(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(items);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetPersonalInventory()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var items = new List<InventoryItem>
        {
            new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Item", OwnerUserId = userId }
        };

        mockService.Setup(s => s.GetPersonalInventory(userId))
            .ReturnsAsync(items);

        // Act
        var result = await controller.GetPersonalInventory();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(items);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetMergedInventory()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var items = new List<InventoryItem>
        {
            new InventoryItem { Id = Guid.NewGuid(), Name = "Household Item", HouseholdId = householdId },
            new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Item", OwnerUserId = userId }
        };

        mockService.Setup(s => s.GetMergedInventory(householdId, userId))
            .ReturnsAsync(items);

        // Act
        var result = await controller.GetMergedInventory(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(items);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var item = new InventoryItem { Id = itemId, Name = "Test Item" };

        mockService.Setup(s => s.GetById(itemId, userId))
            .ReturnsAsync(item);

        // Act
        var result = await controller.GetById(itemId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(item);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_GetByIdNotFound()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetById(itemId, userId))
            .ReturnsAsync((InventoryItem?)null);

        // Act
        var result = await controller.GetById(itemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnCreated_When_CreateInventoryItem()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "New Item", OwnerUserId = userId };

        mockService.Setup(s => s.CreateInventoryItem(It.IsAny<InventoryItem>(), userId))
            .ReturnsAsync(item);

        // Act
        var result = await controller.Create(item);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(item);
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UserNotAuthenticated()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity()); // No claims

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await controller.GetPersonalInventory();

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateInventoryItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var item = new InventoryItem { Id = itemId, Name = "Updated Item", OwnerUserId = userId };

        mockService.Setup(s => s.UpdateInventoryItem(It.IsAny<InventoryItem>(), userId))
            .ReturnsAsync(item);

        // Act
        var result = await controller.Update(itemId, item);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateInventoryItemNotFound()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var item = new InventoryItem { Id = itemId, Name = "Updated Item", OwnerUserId = userId };

        mockService.Setup(s => s.UpdateInventoryItem(It.IsAny<InventoryItem>(), userId))
            .ThrowsAsync(new ArgumentException("Inventory item not found"));

        // Act
        var result = await controller.Update(itemId, item);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateInventoryItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var item = new InventoryItem { Id = itemId, Name = "Updated Item", OwnerUserId = userId };

        mockService.Setup(s => s.UpdateInventoryItem(It.IsAny<InventoryItem>(), userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to update this inventory item"));

        // Act
        var result = await controller.Update(itemId, item);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteInventoryItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteInventoryItem(itemId, userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.Delete(itemId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_DeleteInventoryItemNotFound()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteInventoryItem(itemId, userId))
            .ThrowsAsync(new ArgumentException("Inventory item not found"));

        // Act
        var result = await controller.Delete(itemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_DeleteInventoryItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IInventoryService>();
        var controller = new InventoryController(mockService.Object);
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteInventoryItem(itemId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to delete this inventory item"));

        // Act
        var result = await controller.Delete(itemId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
