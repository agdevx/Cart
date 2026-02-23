// ABOUTME: Tests for store API controller endpoints
// ABOUTME: Validates store CRUD operations and authorization for household and personal stores

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Data.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class StoreControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_GetHouseholdStores()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var stores = new List<Store>
        {
            new Store { Id = Guid.NewGuid(), Name = "Test Store", HouseholdId = householdId }
        };

        mockService.Setup(s => s.GetHouseholdStores(householdId, userId))
            .ReturnsAsync(stores);

        // Act
        var result = await controller.GetHouseholdStores(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(stores);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetPersonalStores()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var stores = new List<Store>
        {
            new Store { Id = Guid.NewGuid(), Name = "Personal Store", UserId = userId }
        };

        mockService.Setup(s => s.GetPersonalStores(userId))
            .ReturnsAsync(stores);

        // Act
        var result = await controller.GetPersonalStores();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(stores);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var store = new Store { Id = storeId, Name = "Test Store" };

        mockService.Setup(s => s.GetById(storeId, userId))
            .ReturnsAsync(store);

        // Act
        var result = await controller.GetById(storeId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(store);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_GetByIdNotFound()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetById(storeId, userId))
            .ReturnsAsync((Store?)null);

        // Act
        var result = await controller.GetById(storeId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnCreated_When_CreateStore()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var store = new Store { Id = Guid.NewGuid(), Name = "New Store", UserId = userId };

        mockService.Setup(s => s.CreateStore(It.IsAny<Store>(), userId))
            .ReturnsAsync(store);

        // Act
        var result = await controller.Create(store);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(store);
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UserNotAuthenticated()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity()); // No claims

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await controller.GetPersonalStores();

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateStoreSuccessful()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var store = new Store { Id = storeId, Name = "Updated Store", UserId = userId };

        mockService.Setup(s => s.UpdateStore(It.IsAny<Store>(), userId))
            .ReturnsAsync(store);

        // Act
        var result = await controller.Update(storeId, store);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateStoreNotFound()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var store = new Store { Id = storeId, Name = "Updated Store", UserId = userId };

        mockService.Setup(s => s.UpdateStore(It.IsAny<Store>(), userId))
            .ThrowsAsync(new ArgumentException("Store not found"));

        // Act
        var result = await controller.Update(storeId, store);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateStoreUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var store = new Store { Id = storeId, Name = "Updated Store", UserId = userId };

        mockService.Setup(s => s.UpdateStore(It.IsAny<Store>(), userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to update this store"));

        // Act
        var result = await controller.Update(storeId, store);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteStoreSuccessful()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteStore(storeId, userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.Delete(storeId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_DeleteStoreNotFound()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteStore(storeId, userId))
            .ThrowsAsync(new ArgumentException("Store not found"));

        // Act
        var result = await controller.Delete(storeId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_DeleteStoreUnauthorized()
    {
        // Arrange
        var mockService = new Mock<IStoreService>();
        var controller = new StoreController(mockService.Object);
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteStore(storeId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to delete this store"));

        // Act
        var result = await controller.Delete(storeId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
