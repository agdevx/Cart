// ABOUTME: Tests for trip API controller endpoints
// ABOUTME: Validates trip CRUD operations, lifecycle management (complete/reopen), and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Data.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class TripControllerTests
{
    private static TripController CreateController(Mock<ITripService> mockService, Guid userId)
    {
        var controller = new TripController(mockService.Object);
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
    public async Task Should_ReturnOk_When_GetUserTrips()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var trips = new List<Trip> { new Trip { Id = Guid.NewGuid(), Name = "Weekly Grocery" } };
        mockService.Setup(s => s.GetUserTrips(userId, It.IsAny<CancellationToken>())).ReturnsAsync(trips);

        // Act
        var result = await controller.GetUserTrips();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trips);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var trip = new Trip { Id = tripId, Name = "Test Trip" };
        mockService.Setup(s => s.GetById(tripId, userId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);

        // Act
        var result = await controller.GetById(tripId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trip);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_GetByIdNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.GetById(tripId, userId, It.IsAny<CancellationToken>())).ReturnsAsync((Trip?)null);

        // Act
        var result = await controller.GetById(tripId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnCreated_When_CreateTrip()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var createRequest = new CreateTripRequest { Name = "New Trip" };
        var trip = new Trip { Id = Guid.NewGuid(), Name = "New Trip" };

        mockService.Setup(s => s.CreateTrip(createRequest.Name, createRequest.TripDate, createRequest.HouseholdId, userId, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(trip);

        // Act
        var result = await controller.Create(createRequest);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(trip);
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UserNotAuthenticated()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var user = new ClaimsPrincipal(new ClaimsIdentity()); // No claims
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await controller.GetUserTrips();

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_UpdateTripSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var request = new UpdateTripRequest { Name = "Updated Trip" };
        var trip = new Trip { Id = tripId, Name = "Updated Trip" };

        mockService.Setup(s => s.UpdateTrip(tripId, request.Name, request.TripDate, userId, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(trip);

        // Act
        var result = await controller.Update(tripId, request);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var request = new UpdateTripRequest { Name = "Updated Trip" };
        mockService.Setup(s => s.UpdateTrip(tripId, request.Name, request.TripDate, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.Update(tripId, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateTripUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var request = new UpdateTripRequest { Name = "Updated Trip" };
        mockService.Setup(s => s.UpdateTrip(tripId, request.Name, request.TripDate, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new UnauthorizedAccessException("Not authorized"));

        // Act
        var result = await controller.Update(tripId, request);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteTripSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.DeleteTrip(tripId, userId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Act
        var result = await controller.Delete(tripId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_DeleteTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.DeleteTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.Delete(tripId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_DeleteTripUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.DeleteTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new UnauthorizedAccessException("Not authorized"));

        // Act
        var result = await controller.Delete(tripId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnOk_When_CompleteTripSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var trip = new Trip { Id = tripId, Name = "Completed Trip", IsCompleted = true, CompletedAt = DateTime.UtcNow };
        mockService.Setup(s => s.CompleteTrip(tripId, userId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);

        // Act
        var result = await controller.Complete(tripId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trip);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_CompleteTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.CompleteTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.Complete(tripId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_CompleteTripUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.CompleteTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new UnauthorizedAccessException("Not authorized"));

        // Act
        var result = await controller.Complete(tripId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnOk_When_ReopenTripSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var trip = new Trip { Id = tripId, Name = "Reopened Trip", IsCompleted = false };
        mockService.Setup(s => s.ReopenTrip(tripId, userId, It.IsAny<CancellationToken>())).ReturnsAsync(trip);

        // Act
        var result = await controller.Reopen(tripId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trip);
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_ReopenTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.ReopenTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.Reopen(tripId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_ReopenTripUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        mockService.Setup(s => s.ReopenTrip(tripId, userId, It.IsAny<CancellationToken>()))
                   .ThrowsAsync(new UnauthorizedAccessException("Not authorized"));

        // Act
        var result = await controller.Reopen(tripId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_PassTripDateAndHouseholdIdToService_When_CreateTripRequestIncludesThem()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripDate = new DateOnly(2025, 9, 10);
        var householdId = Guid.NewGuid();
        var controller = CreateController(mockService, userId);

        var createRequest = new CreateTripRequest { Name = "Dated Trip", TripDate = tripDate, HouseholdId = householdId };
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Dated Trip", TripDate = tripDate, HouseholdId = householdId };

        mockService.Setup(s => s.CreateTrip(createRequest.Name, tripDate, householdId, userId, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(trip);

        // Act
        var result = await controller.Create(createRequest);

        // Assert
        mockService.Verify(s => s.CreateTrip(createRequest.Name, tripDate, householdId, userId, It.IsAny<CancellationToken>()), Times.Once);
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(trip);
    }

    [Fact]
    public async Task Should_PassTripDateToService_When_UpdateTripRequestIncludesTripDate()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var tripDate = new DateOnly(2025, 10, 5);
        var controller = CreateController(mockService, userId);

        var request = new UpdateTripRequest { Name = "Updated Trip", TripDate = tripDate };
        var trip = new Trip { Id = tripId, Name = "Updated Trip", TripDate = tripDate };

        mockService.Setup(s => s.UpdateTrip(tripId, request.Name, tripDate, userId, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(trip);

        // Act
        var result = await controller.Update(tripId, request);

        // Assert
        mockService.Verify(s => s.UpdateTrip(tripId, request.Name, tripDate, userId, It.IsAny<CancellationToken>()), Times.Once);
        result.Should().BeOfType<NoContentResult>();
    }
}
