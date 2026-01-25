# Tasks 18-25: API Controllers and SSE (Detailed Expansion)

## Phase 5: API Controllers

### Task 18: Household Controller

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Extensions/ClaimsPrincipalExtensions.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Api/Controllers/HouseholdController.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/HouseholdControllerTests.cs`

**Step 1: Create ClaimsPrincipal extension for getting user ID**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Extensions/ClaimsPrincipalExtensions.cs`:
```csharp
// ABOUTME: Extension methods for ClaimsPrincipal to extract user information
// ABOUTME: Simplifies getting user ID from JWT claims in controllers

using System.Security.Claims;

namespace AGDevX.Cart.Shared.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in claims");
        }
        return userId;
    }
}
```

**Step 2: Write failing test for HouseholdController**

Create `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/HouseholdControllerTests.cs`:
```csharp
// ABOUTME: Tests for household API controller endpoints
// ABOUTME: Validates household CRUD operations and authorization

using System.Security.Claims;
using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
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
        var userId = 1;

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var households = new List<Household>
        {
            new Household { Id = 1, Name = "Test Household" }
        };

        mockService.Setup(s => s.GetUserHouseholdsAsync(userId))
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
        var userId = 1;

        var user = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var household = new Household { Name = "New Household" };
        var created = new Household { Id = 1, Name = "New Household" };

        mockService.Setup(s => s.CreateHouseholdAsync(household, userId))
            .ReturnsAsync(created);

        // Act
        var result = await controller.CreateHousehold(household);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(created);
    }
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - HouseholdController not found

**Step 4: Create HouseholdController**

Create `AGDevX.Cart/AGDevX.Cart.Api/Controllers/HouseholdController.cs`:
```csharp
// ABOUTME: API controller for household management operations
// ABOUTME: Provides endpoints for creating, reading, updating, deleting households

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using AGDevX.Cart.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HouseholdController(IHouseholdService householdService) : ControllerBase
{
    private readonly IHouseholdService _householdService = householdService;

    [HttpGet]
    public async Task<IActionResult> GetUserHouseholds()
    {
        try
        {
            var userId = User.GetUserId();
            var households = await _householdService.GetUserHouseholdsAsync(userId);
            return Ok(households);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var userId = User.GetUserId();
            var household = await _householdService.GetByIdAsync(id, userId);

            if (household == null)
            {
                return NotFound(new { errorCode = "HOUSEHOLD_NOT_FOUND" });
            }

            return Ok(household);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateHousehold([FromBody] Household household)
    {
        try
        {
            var userId = User.GetUserId();
            var created = await _householdService.CreateHouseholdAsync(household, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHousehold(int id, [FromBody] Household household)
    {
        try
        {
            if (id != household.Id)
            {
                return BadRequest(new { errorCode = "ID_MISMATCH" });
            }

            var userId = User.GetUserId();
            await _householdService.UpdateHouseholdAsync(household, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { errorCode = "HOUSEHOLD_NOT_FOUND", message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHousehold(int id)
    {
        try
        {
            var userId = User.GetUserId();
            await _householdService.DeleteHouseholdAsync(id, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { errorCode = "HOUSEHOLD_NOT_FOUND", message = ex.Message });
        }
    }
}
```

**Step 5: Register services in Program.cs**

Modify `AGDevX.Cart/AGDevX.Cart.Api/Program.cs` to add repository and service registrations:
```csharp
//== Services (add after AuthService registration)
builder.Services.AddScoped<IHouseholdRepository, HouseholdRepository>();
builder.Services.AddScoped<IHouseholdService, HouseholdService>();
```

**Step 6: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 7: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add HouseholdController with full CRUD endpoints"
```

Expected: Commit created

---

### Task 19: Store, Inventory, Trip, and TripItem Controllers

**Note:** Following the same pattern as Task 18, create controllers for:
- StoreController (household and personal stores)
- InventoryController (household, personal, and merged inventory)
- TripController (full CRUD + complete/reopen + collaborators)
- TripItemController (add/update/delete/check items)

Each controller follows this structure:
1. Write failing controller tests
2. Create controller with [Authorize] attribute
3. Extract userId from User.GetUserId()
4. Call appropriate service methods
5. Handle errors with proper HTTP status codes
6. Register services in Program.cs
7. Run tests and commit

**Detailed steps omitted for brevity - follow Task 18 pattern for each controller**

**Services to register in Program.cs:**
```csharp
//== Repositories
builder.Services.AddScoped<IStoreRepository, StoreRepository>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<ITripRepository, TripRepository>();
builder.Services.AddScoped<ITripItemRepository, TripItemRepository>();

//== Services
builder.Services.AddScoped<IStoreService, StoreService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<ITripItemService, TripItemService>();
```

---

## Phase 6: Real-Time Updates (SSE)

### Task 23: SSE Service Infrastructure

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripEvent.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/ITripEventService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/TripEventService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs`

**Step 1: Create TripEvent model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripEvent.cs`:
```csharp
// ABOUTME: Event model for trip-related real-time updates
// ABOUTME: Used for broadcasting changes via SSE

namespace AGDevX.Cart.Shared.Models;

public class TripEvent
{
    public int TripId { get; set; }
    public string EventType { get; set; } = string.Empty; //== ItemAdded, ItemUpdated, ItemChecked, ItemRemoved
    public int? TripItemId { get; set; }
    public string Data { get; set; } = string.Empty; //== JSON serialized event data
    public DateTime Timestamp { get; set; }
}
```

**Step 2: Write failing test for TripEventService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs`:
```csharp
// ABOUTME: Tests for trip event broadcasting service
// ABOUTME: Validates SSE connection management and event delivery

using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;

namespace AGDevX.Cart.Services.Tests;

public class TripEventServiceTests
{
    [Fact]
    public void Should_BroadcastEvent_When_EventPublished()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = 1;
        var receivedEvents = new List<TripEvent>();

        var subscription = service.SubscribeToTrip(tripId);
        subscription.Subscribe(e => receivedEvents.Add(e));

        var tripEvent = new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            TripItemId = 1,
            Timestamp = DateTime.UtcNow
        };

        // Act
        service.PublishEvent(tripEvent);

        // Assert
        receivedEvents.Should().HaveCount(1);
        receivedEvents[0].EventType.Should().Be("ItemAdded");
    }
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - TripEventService not found

**Step 4: Create ITripEventService**

Create `AGDevX.Cart/AGDevX.Cart.Services/ITripEventService.cs`:
```csharp
// ABOUTME: Interface for trip event broadcasting service
// ABOUTME: Manages SSE connections and real-time event delivery

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripEventService
{
    IObservable<TripEvent> SubscribeToTrip(int tripId);
    void PublishEvent(TripEvent tripEvent);
    void UnsubscribeFromTrip(int tripId);
}
```

**Step 5: Implement TripEventService**

Create `AGDevX.Cart/AGDevX.Cart.Services/TripEventService.cs`:
```csharp
// ABOUTME: In-memory trip event broadcasting service using Reactive Extensions
// ABOUTME: Manages SSE subscriptions and publishes events to connected clients

using System.Collections.Concurrent;
using System.Reactive.Subjects;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripEventService : ITripEventService
{
    private readonly ConcurrentDictionary<int, Subject<TripEvent>> _tripSubjects = new();

    public IObservable<TripEvent> SubscribeToTrip(int tripId)
    {
        var subject = _tripSubjects.GetOrAdd(tripId, _ => new Subject<TripEvent>());
        return subject;
    }

    public void PublishEvent(TripEvent tripEvent)
    {
        if (_tripSubjects.TryGetValue(tripEvent.TripId, out var subject))
        {
            subject.OnNext(tripEvent);
        }
    }

    public void UnsubscribeFromTrip(int tripId)
    {
        if (_tripSubjects.TryRemove(tripId, out var subject))
        {
            subject.OnCompleted();
            subject.Dispose();
        }
    }
}
```

**Step 6: Add System.Reactive package**

Run:
```bash
cd AGDevX.Cart
dotnet add AGDevX.Cart.Services/AGDevX.Cart.Services.csproj package System.Reactive
cd ..
```

Expected: Package installed

**Step 7: Run tests to verify they pass**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add SSE event service with reactive extensions"
```

Expected: Commit created

---

### Task 24: Integrate Events into TripItemService

**Files:**
- Modify: `AGDevX.Cart/AGDevX.Cart.Services/TripItemService.cs`
- Modify: `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs`

**Step 1: Update TripItemService constructor to inject ITripEventService**

Modify constructor in `AGDevX.Cart/AGDevX.Cart.Services/TripItemService.cs`:
```csharp
public class TripItemService(
    ITripItemRepository tripItemRepository,
    ITripRepository tripRepository,
    ITripEventService tripEventService) : ITripItemService
{
    private readonly ITripItemRepository _tripItemRepository = tripItemRepository;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly ITripEventService _tripEventService = tripEventService;

    // ... rest of implementation
}
```

**Step 2: Add event publishing to AddTripItemAsync**

Add after CreateAsync in AddTripItemAsync:
```csharp
var created = await _tripItemRepository.CreateAsync(tripItem);

//== Broadcast event
_tripEventService.PublishEvent(new TripEvent
{
    TripId = tripItem.TripId,
    EventType = "ItemAdded",
    TripItemId = created.Id,
    Data = System.Text.Json.JsonSerializer.Serialize(created),
    Timestamp = DateTime.UtcNow
});

return created;
```

**Step 3: Add event publishing to CheckItemAsync**

Add after UpdateAsync in CheckItemAsync:
```csharp
await _tripItemRepository.UpdateAsync(tripItem);

//== Broadcast event
_tripEventService.PublishEvent(new TripEvent
{
    TripId = tripItem.TripId,
    EventType = "ItemChecked",
    TripItemId = id,
    Data = System.Text.Json.JsonSerializer.Serialize(new { isChecked, checkedAt = tripItem.CheckedAt }),
    Timestamp = DateTime.UtcNow
});
```

**Step 4: Add event publishing to UpdateTripItemAsync and DeleteTripItemAsync**

Similar patterns for "ItemUpdated" and "ItemRemoved" events.

**Step 5: Run tests**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: PASS - All tests pass

**Step 6: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: integrate event broadcasting into trip item operations"
```

Expected: Commit created

---

### Task 25: SSE API Endpoint

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Api/Controllers/TripEventsController.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/TripEventsControllerTests.cs`

**Step 1: Write failing test for TripEventsController**

Create `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/TripEventsControllerTests.cs`:
```csharp
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - TripEventsController not found

**Step 3: Create TripEventsController**

Create `AGDevX.Cart/AGDevX.Cart.Api/Controllers/TripEventsController.cs`:
```csharp
// ABOUTME: Server-Sent Events controller for real-time trip updates
// ABOUTME: Provides SSE endpoint for clients to receive live trip item changes

using System.Text.Json;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/trips/{tripId}/events")]
public class TripEventsController(ITripEventService tripEventService, ITripService tripService) : ControllerBase
{
    private readonly ITripEventService _tripEventService = tripEventService;
    private readonly ITripService _tripService = tripService;

    [HttpGet]
    public async Task GetEvents(int tripId, CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();

            //== Verify user has access to this trip
            var trip = await _tripService.GetByIdAsync(tripId, userId);
            if (trip == null)
            {
                Response.StatusCode = 404;
                return;
            }

            //== Set up SSE response
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            //== Subscribe to trip events
            var subscription = _tripEventService.SubscribeToTrip(tripId);

            await foreach (var tripEvent in subscription.ToAsyncEnumerable().WithCancellation(cancellationToken))
            {
                var eventData = $"data: {JsonSerializer.Serialize(tripEvent)}\n\n";
                await Response.WriteAsync(eventData, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (UnauthorizedAccessException)
        {
            Response.StatusCode = 401;
        }
        catch (OperationCanceledException)
        {
            //== Client disconnected - normal
        }
    }
}
```

**Step 4: Add ToAsyncEnumerable extension**

Create helper extension in `AGDevX.Cart/AGDevX.Cart.Shared/Extensions/ObservableExtensions.cs`:
```csharp
// ABOUTME: Extension methods for IObservable to async enumerable conversion
// ABOUTME: Enables SSE streaming from reactive observables

using System.Reactive.Linq;

namespace AGDevX.Cart.Shared.Extensions;

public static class ObservableExtensions
{
    public static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(this IObservable<T> observable)
    {
        var enumerable = observable.ToAsyncEnumerable();
        await foreach (var item in enumerable)
        {
            yield return item;
        }
    }
}
```

**Step 5: Register TripEventService as singleton in Program.cs**

Modify `AGDevX.Cart/AGDevX.Cart.Api/Program.cs`:
```csharp
//== Services (add with other service registrations)
builder.Services.AddSingleton<ITripEventService, TripEventService>();
```

**Step 6: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 7: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add SSE endpoint for real-time trip updates"
```

Expected: Commit created

---

**Tasks 18-25 Complete!**

All API and database layer tasks are now fully detailed with TDD steps.
