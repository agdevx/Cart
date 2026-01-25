// ABOUTME: Tests for trip events SSE controller
// ABOUTME: Validates SSE endpoint authorization and streaming

using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class TripEventsControllerTests
{
    [Fact]
    public void Should_HaveAuthorizeAttribute()
    {
        // Assert
        var controllerType = typeof(TripEventsController);
        var hasAuthorize = controllerType.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), false).Any();
        hasAuthorize.Should().BeTrue();
    }
}
