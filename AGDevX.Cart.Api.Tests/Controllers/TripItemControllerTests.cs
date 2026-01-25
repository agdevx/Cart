// ABOUTME: Tests for trip item API controller endpoints
// ABOUTME: Validates trip item CRUD operations, check/uncheck functionality, and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class TripItemControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_GetTripItems()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItems = new List<TripItem>
        {
            new TripItem
            {
                Id = Guid.NewGuid(),
                TripId = tripId,
                Trip = null!,
                InventoryItemId = Guid.NewGuid(),
                InventoryItem = null!,
                Quantity = 2
            }
        };

        mockService.Setup(s => s.GetTripItemsAsync(tripId, userId))
            .ReturnsAsync(tripItems);

        // Act
        var result = await controller.GetTripItems(tripId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(tripItems);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = Guid.NewGuid(),
            Trip = null!,
            InventoryItemId = Guid.NewGuid(),
            InventoryItem = null!,
            Quantity = 2
        };

        mockService.Setup(s => s.GetByIdAsync(tripItemId, userId))
            .ReturnsAsync(tripItem);

        // Act
        var result = await controller.GetById(tripItemId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(tripItem);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_GetByIdNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetByIdAsync(tripItemId, userId))
            .ReturnsAsync((TripItem?)null);

        // Act
        var result = await controller.GetById(tripItemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnCreated_When_AddTripItem()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItem = new TripItem
        {
            Id = Guid.NewGuid(),
            TripId = tripId,
            Trip = null!,
            InventoryItemId = inventoryItemId,
            InventoryItem = null!,
            Quantity = 3,
            Notes = "Test notes"
        };

        mockService.Setup(s => s.AddTripItemAsync(tripId, inventoryItemId, 3, userId, "Test notes", null))
            .ReturnsAsync(tripItem);

        // Act
        var result = await controller.Add(tripId, inventoryItemId, 3, "Test notes");

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(tripItem);
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UserNotAuthenticated()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity()); // No claims

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await controller.GetTripItems(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateTripItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = Guid.NewGuid(),
            Trip = null!,
            InventoryItemId = Guid.NewGuid(),
            InventoryItem = null!,
            Quantity = 5
        };

        mockService.Setup(s => s.UpdateTripItemAsync(tripItemId, 5, userId, null, null))
            .ReturnsAsync(tripItem);

        // Act
        var result = await controller.Update(tripItemId, 5, null);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateTripItemNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.UpdateTripItemAsync(tripItemId, 5, userId, null, null))
            .ThrowsAsync(new ArgumentException("Trip item not found"));

        // Act
        var result = await controller.Update(tripItemId, 5, null);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateTripItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.UpdateTripItemAsync(tripItemId, 5, userId, null, null))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to update this trip item"));

        // Act
        var result = await controller.Update(tripItemId, 5, null);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteTripItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripItemAsync(tripItemId, userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.Delete(tripItemId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_DeleteTripItemNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripItemAsync(tripItemId, userId))
            .ThrowsAsync(new ArgumentException("Trip item not found"));

        // Act
        var result = await controller.Delete(tripItemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_DeleteTripItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripItemAsync(tripItemId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to delete this trip item"));

        // Act
        var result = await controller.Delete(tripItemId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnOk_When_CheckItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = Guid.NewGuid(),
            Trip = null!,
            InventoryItemId = Guid.NewGuid(),
            InventoryItem = null!,
            Quantity = 2,
            IsChecked = true,
            CheckedAt = DateTime.UtcNow
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, true, userId))
            .ReturnsAsync(tripItem);

        // Act
        var result = await controller.Check(tripItemId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(tripItem);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_CheckItemNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, true, userId))
            .ThrowsAsync(new ArgumentException("Trip item not found"));

        // Act
        var result = await controller.Check(tripItemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_CheckItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, true, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to check this trip item"));

        // Act
        var result = await controller.Check(tripItemId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnOk_When_UncheckItemSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var tripItem = new TripItem
        {
            Id = tripItemId,
            TripId = Guid.NewGuid(),
            Trip = null!,
            InventoryItemId = Guid.NewGuid(),
            InventoryItem = null!,
            Quantity = 2,
            IsChecked = false,
            CheckedAt = null
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, false, userId))
            .ReturnsAsync(tripItem);

        // Act
        var result = await controller.Uncheck(tripItemId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(tripItem);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UncheckItemNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, false, userId))
            .ThrowsAsync(new ArgumentException("Trip item not found"));

        // Act
        var result = await controller.Uncheck(tripItemId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UncheckItemUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripItemService>();
        var controller = new TripItemController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripItemId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CheckItemAsync(tripItemId, false, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to uncheck this trip item"));

        // Act
        var result = await controller.Uncheck(tripItemId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
