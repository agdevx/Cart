// ABOUTME: Tests for trip API controller endpoints
// ABOUTME: Validates trip CRUD operations, lifecycle management (complete/reopen), collaborator management, and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class TripControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_GetUserTrips()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trips = new List<Trip>
        {
            new Trip { Id = Guid.NewGuid(), Name = "Weekly Grocery", CreatedByUserId = userId }
        };

        mockService.Setup(s => s.GetUserTripsAsync(userId))
            .ReturnsAsync(trips);

        // Act
        var result = await controller.GetUserTrips();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trips);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetHouseholdTrips()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trips = new List<Trip>
        {
            new Trip { Id = Guid.NewGuid(), Name = "Household Trip", CreatedByUserId = userId, HouseholdId = householdId }
        };

        mockService.Setup(s => s.GetHouseholdTripsAsync(householdId))
            .ReturnsAsync(trips);

        // Act
        var result = await controller.GetHouseholdTrips(householdId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(trips);
    }

    [Fact]
    public async Task Should_ReturnOk_When_GetByIdSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip { Id = tripId, Name = "Test Trip", CreatedByUserId = userId };

        mockService.Setup(s => s.GetByIdAsync(tripId))
            .ReturnsAsync(trip);

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.GetByIdAsync(tripId))
            .ReturnsAsync((Trip?)null);

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var createRequest = new CreateTripRequest { Name = "New Trip", HouseholdId = null };
        var trip = new Trip { Id = Guid.NewGuid(), Name = "New Trip", CreatedByUserId = userId };

        mockService.Setup(s => s.CreateTripAsync(createRequest.Name, userId, createRequest.HouseholdId))
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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip { Id = tripId, Name = "Updated Trip", CreatedByUserId = userId };

        mockService.Setup(s => s.UpdateTripAsync(It.IsAny<Trip>()))
            .ReturnsAsync(trip);

        // Act
        var result = await controller.Update(tripId, trip);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_UpdateTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip { Id = tripId, Name = "Updated Trip", CreatedByUserId = userId };

        mockService.Setup(s => s.UpdateTripAsync(It.IsAny<Trip>()))
            .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.Update(tripId, trip);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_UpdateTripUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip { Id = tripId, Name = "Updated Trip", CreatedByUserId = userId };

        mockService.Setup(s => s.UpdateTripAsync(It.IsAny<Trip>()))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to update this trip"));

        // Act
        var result = await controller.Update(tripId, trip);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_DeleteTripSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripAsync(tripId, userId))
            .Returns(Task.CompletedTask);

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripAsync(tripId, userId))
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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.DeleteTripAsync(tripId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to delete this trip"));

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip
        {
            Id = tripId,
            Name = "Completed Trip",
            CreatedByUserId = userId,
            IsCompleted = true,
            CompletedAt = DateTime.UtcNow
        };

        mockService.Setup(s => s.CompleteTripAsync(tripId, userId))
            .ReturnsAsync(trip);

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CompleteTripAsync(tripId, userId))
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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.CompleteTripAsync(tripId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to complete this trip"));

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var trip = new Trip
        {
            Id = tripId,
            Name = "Reopened Trip",
            CreatedByUserId = userId,
            IsCompleted = false,
            CompletedAt = null
        };

        mockService.Setup(s => s.ReopenTripAsync(tripId, userId))
            .ReturnsAsync(trip);

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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.ReopenTripAsync(tripId, userId))
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
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.ReopenTripAsync(tripId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to reopen this trip"));

        // Act
        var result = await controller.Reopen(tripId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_AddCollaboratorSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var request = new AddCollaboratorRequest { UserId = collaboratorUserId };

        mockService.Setup(s => s.AddCollaboratorAsync(tripId, userId, collaboratorUserId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.AddCollaborator(tripId, request);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_AddCollaboratorTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var request = new AddCollaboratorRequest { UserId = collaboratorUserId };

        mockService.Setup(s => s.AddCollaboratorAsync(tripId, userId, collaboratorUserId))
            .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.AddCollaborator(tripId, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_AddCollaboratorUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var request = new AddCollaboratorRequest { UserId = collaboratorUserId };

        mockService.Setup(s => s.AddCollaboratorAsync(tripId, userId, collaboratorUserId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to add collaborators to this trip"));

        // Act
        var result = await controller.AddCollaborator(tripId, request);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnNoContent_When_RemoveCollaboratorSuccessful()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.RemoveCollaboratorAsync(tripId, userId, collaboratorUserId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.RemoveCollaborator(tripId, collaboratorUserId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Should_ReturnNotFound_When_RemoveCollaboratorTripNotFound()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.RemoveCollaboratorAsync(tripId, userId, collaboratorUserId))
            .ThrowsAsync(new ArgumentException("Trip not found"));

        // Act
        var result = await controller.RemoveCollaborator(tripId, collaboratorUserId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnUnauthorized_When_RemoveCollaboratorUnauthorized()
    {
        // Arrange
        var mockService = new Mock<ITripService>();
        var controller = new TripController(mockService.Object);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        mockService.Setup(s => s.RemoveCollaboratorAsync(tripId, userId, collaboratorUserId))
            .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to remove collaborators from this trip"));

        // Act
        var result = await controller.RemoveCollaborator(tripId, collaboratorUserId);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
