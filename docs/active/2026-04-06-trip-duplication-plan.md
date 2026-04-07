# Trip Duplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to duplicate an existing trip, creating a new trip pre-populated with the same items.

**Architecture:** A single `POST /api/v1/trip/{id}/duplicate` endpoint creates the new trip and clones visible items atomically via `dbContext` (bypassing per-entity repository saves). The frontend adds a "Duplicate" option to the trip card kebab menu and trip detail page, opening a dialog for name/date/scope.

**Tech Stack:** .NET 10, EF Core, SQLite, React 19, TanStack Query, Tailwind CSS 4, Vitest, xUnit

**Spec:** `docs/active/2026-04-06-trip-duplication.md`

---

## File Structure

### Backend (new files)
- `backend/AGDevX.Cart.Services.Tests/TripDuplicateServiceTests.cs` — tests for DuplicateTrip

### Backend (modified files)
- `backend/AGDevX.Cart.Services/ITripService.cs` — add `DuplicateTrip` method
- `backend/AGDevX.Cart.Services/TripService.cs` — implement `DuplicateTrip`, add `ITripItemRepository` dependency
- `backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs` — update constructor for new dependency
- `backend/AGDevX.Cart.Api/Controllers/TripController.cs` — add `Duplicate` action
- `backend/AGDevX.Cart.Api.Tests/Controllers/TripControllerTests.cs` — add duplicate endpoint tests

### Frontend (new files)
- `frontend/src/apis/agdevx-cart-api/trip/duplicate-trip.mutation.ts` — TanStack mutation hook
- `frontend/src/pages/shopping/duplicate-trip-dialog.tsx` — duplicate dialog component
- `frontend/src/pages/shopping/tests/duplicate-trip-dialog.test.tsx` — dialog tests

### Frontend (modified files)
- `frontend/src/shared/trip-card.tsx` — add "Duplicate" to kebab menu
- `frontend/src/pages/shopping/shopping-page.tsx` — wire up duplicate handler
- `frontend/src/pages/shopping/trip-detail-page.tsx` — add duplicate action
- `frontend/src/pages/shopping/tests/shopping-page.test.tsx` — test duplicate menu option

---

## Task 1: Backend Service — DuplicateTrip

**Files:**
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs`
- Modify: `backend/AGDevX.Cart.Services/TripService.cs`
- Modify: `backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs`
- Create: `backend/AGDevX.Cart.Services.Tests/TripDuplicateServiceTests.cs`

- [ ] **Step 1: Write failing tests**

Create `backend/AGDevX.Cart.Services.Tests/TripDuplicateServiceTests.cs`:

```csharp
// ABOUTME: Tests for the DuplicateTrip service method
// ABOUTME: Validates item cloning, visibility filtering, scope re-derivation, and authorization

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class TripDuplicateServiceTests
{
    private readonly Mock<ITripRepository> _mockTripRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly CartDbContext _dbContext;
    private readonly TripService _tripService;

    public TripDuplicateServiceTests()
    {
        _mockTripRepository = new Mock<ITripRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _tripService = new TripService(_mockTripRepository.Object, _dbContext, _mockTripItemRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_DuplicatePersonalTrip_WithAllItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", Quantity = 2, StoreName = "Costco", StoreId = Guid.NewGuid(), Notes = "2%", IsHouseholdItem = false, IsChecked = true, CheckedAt = DateTime.UtcNow, CreatedBy = userId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Bread", Quantity = 1, StoreName = null, StoreId = null, Notes = null, IsHouseholdItem = false, IsChecked = false, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "New Trip", null, null, userId);

        //== Assert
        result.Name.Should().Be("New Trip");
        result.IsCompleted.Should().BeFalse();
        result.IsStarted.Should().BeFalse();
        result.HouseholdId.Should().BeNull();

        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();

        clonedItems.Should().HaveCount(2);
        clonedItems.Should().AllSatisfy(ti =>
        {
            ti.IsChecked.Should().BeFalse();
            ti.CheckedAt.Should().BeNull();
            ti.Id.Should().NotBe(sourceItems[0].Id);
            ti.Id.Should().NotBe(sourceItems[1].Id);
        });

        var milk = clonedItems.First(ti => ti.ItemName == "Milk");
        milk.Quantity.Should().Be(2);
        milk.StoreName.Should().Be("Costco");
        milk.Notes.Should().Be("2%");
        milk.IsHouseholdItem.Should().BeFalse();
    }

    [Fact]
    public async Task Should_DuplicateHouseholdTrip_OnlyCopiesVisibleItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Household Milk", IsHouseholdItem = true, Quantity = 1, CreatedBy = otherUserId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "My Personal Item", IsHouseholdItem = false, Quantity = 1, CreatedBy = userId },
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Other Personal Item", IsHouseholdItem = false, Quantity = 1, CreatedBy = otherUserId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Dup", null, householdId, userId);

        //== Assert
        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();

        clonedItems.Should().HaveCount(2);
        clonedItems.Select(ti => ti.ItemName).Should().Contain("Household Milk");
        clonedItems.Select(ti => ti.ItemName).Should().Contain("My Personal Item");
        clonedItems.Select(ti => ti.ItemName).Should().NotContain("Other Personal Item");
    }

    [Fact]
    public async Task Should_RederiveIsHouseholdItem_BasedOnDestinationScope()
    {
        //== Arrange — household source trip duplicated as personal
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", IsHouseholdItem = true, Quantity = 1, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act — duplicate as personal (householdId = null)
        var result = await _tripService.DuplicateTrip(sourceTripId, "Personal Dup", null, null, userId);

        //== Assert — IsHouseholdItem should be false since destination is personal
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.IsHouseholdItem.Should().BeFalse();
    }

    [Fact]
    public async Task Should_RederiveIsHouseholdItem_WhenDuplicatingPersonalAsHousehold()
    {
        //== Arrange — personal source trip duplicated as household
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, householdId, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, ItemName = "Milk", IsHouseholdItem = false, Quantity = 1, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act — duplicate as household
        var result = await _tripService.DuplicateTrip(sourceTripId, "Household Dup", null, householdId, userId);

        //== Assert — IsHouseholdItem should be true since destination is household
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.IsHouseholdItem.Should().BeTrue();
    }

    [Fact]
    public async Task Should_DuplicateEmptyTrip()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(new List<TripItem>());

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Empty Dup", null, null, userId);

        //== Assert
        result.Name.Should().Be("Empty Dup");

        var clonedItems = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Where(ti => ti.TripId == result.Id)
            .ToList();
        clonedItems.Should().BeEmpty();
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_WhenNoAccessToSourceTrip()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(false);

        //== Act
        var act = () => _tripService.DuplicateTrip(sourceTripId, "Dup", null, null, userId);

        //== Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorized_WhenNotMemberOfTargetHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        var targetHouseholdId = Guid.NewGuid();
        await SeedUser(userId); // no household membership

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);
        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(new List<TripItem>());

        //== Act
        var act = () => _tripService.DuplicateTrip(sourceTripId, "Dup", null, targetHouseholdId, userId);

        //== Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_CopyItemsWithNullInventoryAndStoreIds()
    {
        //== Arrange — items whose pantry item and store were deleted
        var userId = Guid.NewGuid();
        var sourceTripId = Guid.NewGuid();
        await SeedUser(userId);

        _mockTripRepository.Setup(x => x.HasTripAccess(sourceTripId, userId, null, It.IsAny<CancellationToken>()))
                           .ReturnsAsync(true);

        var sourceItems = new List<TripItem>
        {
            new() { Id = Guid.NewGuid(), TripId = sourceTripId, InventoryItemId = null, ItemName = "Deleted Item", StoreId = null, StoreName = "Old Store", Quantity = 3, IsHouseholdItem = false, CreatedBy = userId },
        };

        _mockTripItemRepository.Setup(x => x.GetTripItems(sourceTripId, It.IsAny<CancellationToken>()))
                               .ReturnsAsync(sourceItems);

        //== Act
        var result = await _tripService.DuplicateTrip(sourceTripId, "Dup", null, null, userId);

        //== Assert
        var clonedItem = _dbContext.ChangeTracker.Entries<TripItem>()
            .Select(e => e.Entity)
            .Single(ti => ti.TripId == result.Id);

        clonedItem.InventoryItemId.Should().BeNull();
        clonedItem.ItemName.Should().Be("Deleted Item");
        clonedItem.StoreId.Should().BeNull();
        clonedItem.StoreName.Should().Be("Old Store");
        clonedItem.Quantity.Should().Be(3);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripDuplicateServiceTests"
```

Expected: compilation error — `DuplicateTrip` doesn't exist, `TripService` constructor doesn't accept `ITripItemRepository`.

- [ ] **Step 3: Add method to ITripService**

In `backend/AGDevX.Cart.Services/ITripService.cs`, add:

```csharp
Task<Trip> DuplicateTrip(Guid sourceTripId, string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default);
```

- [ ] **Step 4: Update TripService constructor and implement DuplicateTrip**

In `backend/AGDevX.Cart.Services/TripService.cs`, change the constructor:

```csharp
public class TripService(ITripRepository tripRepository, CartDbContext dbContext, ITripItemRepository tripItemRepository) : ITripService
```

Add the using if not already present:

```csharp
using AGDevX.Cart.Data.Repositories;
```

Add the method:

```csharp
public async Task<Trip> DuplicateTrip(Guid sourceTripId, string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default)
{
    //== Verify access to source trip
    var user = await GetUserOrThrow(userId, cancellationToken);
    await VerifyTripAccess(sourceTripId, userId, user.HouseholdId, cancellationToken);

    //== Verify household membership if targeting a household
    if (householdId.HasValue && user.HouseholdId != householdId.Value)
    {
        throw new UnauthorizedAccessException("User is not a member of the specified household");
    }

    //== Create the new trip in Planning state
    var newTrip = new Trip
    {
        Id = Guid.NewGuid(),
        Name = name,
        TripDate = tripDate,
        HouseholdId = householdId,
        IsCompleted = false,
        CompletedAt = null,
        IsStarted = false,
        StartedAt = null,
    };
    dbContext.Trips.Add(newTrip);

    //== Fetch source items and apply visibility filtering
    var sourceItems = await tripItemRepository.GetTripItems(sourceTripId, cancellationToken);
    var visibleItems = sourceItems.Where(ti => ti.IsHouseholdItem || ti.CreatedBy == userId);

    //== Clone each visible item
    var isHouseholdTrip = householdId.HasValue;
    var clonedItems = visibleItems.Select(source => new TripItem
    {
        Id = Guid.NewGuid(),
        TripId = newTrip.Id,
        InventoryItemId = source.InventoryItemId,
        ItemName = source.ItemName,
        StoreName = source.StoreName,
        StoreId = source.StoreId,
        Quantity = source.Quantity,
        Notes = source.Notes,
        IsHouseholdItem = isHouseholdTrip,
        IsChecked = false,
        CheckedAt = null,
    });

    dbContext.TripItems.AddRange(clonedItems);

    //== Atomic commit — new trip + all cloned items
    await dbContext.SaveChangesAsync(cancellationToken);

    return newTrip;
}
```

- [ ] **Step 5: Update existing TripServiceTests constructor**

In `backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs`, add a field:

```csharp
private readonly Mock<ITripItemRepository> _mockTripItemRepository;
```

In the constructor, add:

```csharp
_mockTripItemRepository = new Mock<ITripItemRepository>();
```

Update the `TripService` instantiation:

```csharp
_tripService = new TripService(_mockTripRepository.Object, _dbContext, _mockTripItemRepository.Object);
```

- [ ] **Step 6: Run all service tests**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests
```

Expected: all pass (existing + new).

- [ ] **Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Services/ backend/AGDevX.Cart.Services.Tests/
git commit -m "feat: implement DuplicateTrip service method with tests"
```

---

## Task 2: Backend Controller Endpoint

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs`
- Modify: `backend/AGDevX.Cart.Api.Tests/Controllers/TripControllerTests.cs`

- [ ] **Step 1: Add the Duplicate action to TripController**

In `backend/AGDevX.Cart.Api/Controllers/TripController.cs`, add after the `Create` action:

```csharp
//== Duplicate an existing trip with its items
[HttpPost("{id}/duplicate")]
public async Task<IActionResult> Duplicate(Guid id, [FromBody] CreateTripRequest request, CancellationToken cancellationToken = default)
{
    try
    {
        var userId = User.GetUserId();
        var trip = await tripService.DuplicateTrip(id, request.Name, request.TripDate, request.HouseholdId, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
}
```

- [ ] **Step 2: Write controller tests**

Add to `backend/AGDevX.Cart.Api.Tests/Controllers/TripControllerTests.cs`:

```csharp
[Fact]
public async Task Should_ReturnCreated_When_DuplicateSucceeds()
{
    // Arrange
    var mockService = new Mock<ITripService>();
    var userId = Guid.NewGuid();
    var sourceTripId = Guid.NewGuid();
    var controller = CreateController(mockService, userId);

    var newTrip = new Trip { Id = Guid.NewGuid(), Name = "Dup Trip" };
    mockService.Setup(s => s.DuplicateTrip(sourceTripId, "Dup Trip", null, null, userId, It.IsAny<CancellationToken>()))
               .ReturnsAsync(newTrip);

    var request = new CreateTripRequest { Name = "Dup Trip" };

    // Act
    var result = await controller.Duplicate(sourceTripId, request);

    // Assert
    var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
    createdResult.Value.Should().BeEquivalentTo(newTrip);
}

[Fact]
public async Task Should_ReturnUnauthorized_When_DuplicateAccessDenied()
{
    // Arrange
    var mockService = new Mock<ITripService>();
    var userId = Guid.NewGuid();
    var sourceTripId = Guid.NewGuid();
    var controller = CreateController(mockService, userId);

    mockService.Setup(s => s.DuplicateTrip(sourceTripId, It.IsAny<string>(), It.IsAny<DateOnly?>(), It.IsAny<Guid?>(), userId, It.IsAny<CancellationToken>()))
               .ThrowsAsync(new UnauthorizedAccessException("No access"));

    var request = new CreateTripRequest { Name = "Dup" };

    // Act
    var result = await controller.Duplicate(sourceTripId, request);

    // Assert
    result.Should().BeOfType<UnauthorizedObjectResult>();
}
```

- [ ] **Step 3: Run all API tests**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Api.Tests
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/ backend/AGDevX.Cart.Api.Tests/
git commit -m "feat: add POST /api/v1/trip/{id}/duplicate endpoint"
```

---

## Task 3: Frontend Mutation Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/trip/duplicate-trip.mutation.ts`

- [ ] **Step 1: Create the mutation hook**

Create `frontend/src/apis/agdevx-cart-api/trip/duplicate-trip.mutation.ts`:

```ts
// ABOUTME: TanStack Query mutation hook for duplicating a trip
// ABOUTME: Sends trip creation params to POST /api/v1/trip/{id}/duplicate, invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

interface DuplicateTripRequest {
  sourceTripId: string
  name: string
  tripDate?: string | null
  householdId?: string | null
}

export const useDuplicateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'duplicate'],
    mutationFn: async ({ sourceTripId, ...body }: DuplicateTripRequest): Promise<Trip> => {
      const response = await apiFetch(`/api/v1/trip/${sourceTripId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/duplicate-trip.mutation.ts
git commit -m "feat: add useDuplicateTripMutation hook"
```

---

## Task 4: Frontend Duplicate Dialog Component

**Files:**
- Create: `frontend/src/pages/shopping/duplicate-trip-dialog.tsx`
- Create: `frontend/src/pages/shopping/tests/duplicate-trip-dialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/shopping/tests/duplicate-trip-dialog.test.tsx`:

```tsx
// ABOUTME: Tests for DuplicateTripDialog component
// ABOUTME: Verifies form fields, validation, submit behavior, and scope defaulting

import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDuplicateTripMutation } from '@/apis/agdevx-cart-api/trip/duplicate-trip.mutation'

import { DuplicateTripDialog } from '../duplicate-trip-dialog'

vi.mock('@/apis/agdevx-cart-api/trip/duplicate-trip.mutation')

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('DuplicateTripDialog', () => {
  const mockMutate = vi.fn()
  const defaultProps = {
    sourceTripId: 'trip-123',
    sourceHouseholdId: null as string | null,
    household: null as { id: string; name: string } | null,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDuplicateTripMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDuplicateTripMutation>)
  })

  it('should render dialog with blank name and date', () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    expect(screen.getByText('Duplicate Trip')).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/trip name/i)
    expect(nameInput).toHaveValue('')

    const dateInput = screen.getByLabelText(/trip date/i)
    expect(dateInput).toHaveValue('')
  })

  it('should disable Create when name is empty', () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()
  })

  it('should enable Create when name is entered', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    const nameInput = screen.getByLabelText(/trip name/i)
    await userEvent.type(nameInput, 'My Trip')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeEnabled()
  })

  it('should call mutate with correct params on submit', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })

    await userEvent.type(screen.getByLabelText(/trip name/i), 'Weekly Run')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { sourceTripId: 'trip-123', name: 'Weekly Run', tripDate: null, householdId: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('should call onClose when Cancel is clicked', async () => {
    render(createElement(DuplicateTripDialog, defaultProps), { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/shopping/tests/duplicate-trip-dialog.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DuplicateTripDialog**

Create `frontend/src/pages/shopping/duplicate-trip-dialog.tsx`:

```tsx
// ABOUTME: Modal dialog for duplicating a trip with new name, date, and scope
// ABOUTME: Triggered from trip card kebab menu and trip detail page

import { useState } from 'react'

import { toast } from 'sonner'

import { useDuplicateTripMutation } from '@/apis/agdevx-cart-api/trip/duplicate-trip.mutation'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { ScopeRadio } from '@/shared/scope-radio'

interface DuplicateTripDialogProps {
  sourceTripId: string
  sourceHouseholdId: string | null
  household: { id: string; name: string } | null
  onClose: () => void
  onSuccess: (newTripId: string) => void
}

export const DuplicateTripDialog = ({ sourceTripId, sourceHouseholdId, household, onClose, onSuccess }: DuplicateTripDialogProps) => {
  const [name, setName] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [scope, setScope] = useState<string>(sourceHouseholdId ?? 'personal')
  const duplicateMutation = useDuplicateTripMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    duplicateMutation.mutate(
      {
        sourceTripId,
        name: trimmedName,
        tripDate: tripDate || null,
        householdId: scope === 'personal' ? null : scope,
      },
      {
        onSuccess: (newTrip) => {
          toast.success('Trip created')
          onSuccess(newTrip.id)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-surface rounded-2xl shadow-lg p-5 animate-fade-in"
      >
        <h2 className="font-display text-lg font-bold text-navy mb-4">Duplicate Trip</h2>

        <FormField label="Trip Name" htmlFor="dup-trip-name" required>
          <input
            id="dup-trip-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Groceries"
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={duplicateMutation.isPending}
          />
        </FormField>

        <FormField label="Trip Date" htmlFor="dup-trip-date">
          <input
            id="dup-trip-date"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={duplicateMutation.isPending}
          />
        </FormField>

        {household && (
          <FormField label="Scope" htmlFor="dup-trip-scope" required>
            <ScopeRadio
              value={scope}
              onChange={setScope}
              household={household}
              disabled={duplicateMutation.isPending}
            />
          </FormField>
        )}

        <ActionCancelFormButtons
          onCancel={onClose}
          submitLabel="Create"
          isPending={duplicateMutation.isPending}
          disabled={!name.trim() || (household !== null && scope === '')}
        />
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run from `frontend/`:
```bash
npx vitest run src/pages/shopping/tests/duplicate-trip-dialog.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/shopping/duplicate-trip-dialog.tsx frontend/src/pages/shopping/tests/duplicate-trip-dialog.test.tsx
git commit -m "feat: add DuplicateTripDialog component with tests"
```

---

## Task 5: Wire Up Duplicate in TripCard and Shopping Page

**Files:**
- Modify: `frontend/src/shared/trip-card.tsx`
- Modify: `frontend/src/pages/shopping/shopping-page.tsx`

- [ ] **Step 1: Add Duplicate option to TripCard kebab menu**

In `frontend/src/shared/trip-card.tsx`:

Add the `Copy` icon import:

```ts
import { Copy, MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'
```

Add `onDuplicate` to the props interface:

```ts
interface TripCardProps {
  trip: Trip
  onUpdate: (tripId: string, name: string, tripDate: string | null) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
  onDuplicate: (tripId: string) => void
}
```

Add it to the destructured props:

```ts
export const TripCard = ({ trip, onUpdate, onDelete, onReopen, onDuplicate }: TripCardProps) => {
```

Add a handler:

```ts
const handleDuplicateClick = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setMenuOpen(false)
  onDuplicate(trip.id)
}
```

Add the Duplicate button in the `DropdownMenu`, between Edit and the Reopen/Delete buttons:

```tsx
<button
  onClick={handleDuplicateClick}
  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
>
  <Copy className="w-4 h-4" />
  Duplicate
</button>
```

- [ ] **Step 2: Wire up duplicate in ShoppingPage**

In `frontend/src/pages/shopping/shopping-page.tsx`:

Add state and imports for the duplicate dialog. Add:

```ts
import { DuplicateTripDialog } from './duplicate-trip-dialog'
```

Add state:

```ts
const [duplicatingTripId, setDuplicatingTripId] = useState<string | null>(null)
```

Find the trip for the dialog:

```ts
const duplicatingTrip = trips?.find((t) => t.id === duplicatingTripId) ?? null
```

Pass `onDuplicate` to each `TripCard`:

```ts
onDuplicate={(tripId) => setDuplicatingTripId(tripId)}
```

Render the dialog (before the closing `</div>`):

```tsx
{duplicatingTripId && duplicatingTrip && (
  <DuplicateTripDialog
    sourceTripId={duplicatingTripId}
    sourceHouseholdId={duplicatingTrip.householdId ?? null}
    household={household ? { id: household.id, name: household.name } : null}
    onClose={() => setDuplicatingTripId(null)}
    onSuccess={(newTripId) => {
      setDuplicatingTripId(null)
      navigate(tripDetailPath(newTripId))
    }}
  />
)}
```

- [ ] **Step 3: Run TypeScript check and lint**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx eslint --fix src/shared/trip-card.tsx src/pages/shopping/shopping-page.tsx src/pages/shopping/duplicate-trip-dialog.tsx
```

- [ ] **Step 4: Run all tests**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: all pass. Existing `TripCard` test mocks may need the new `onDuplicate` prop added — if tests fail, add `onDuplicate: vi.fn()` to the test props.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/trip-card.tsx frontend/src/pages/shopping/shopping-page.tsx
git commit -m "feat: add Duplicate option to trip card kebab menu"
```

---

## Task 6: Wire Up Duplicate on Trip Detail Page

**Files:**
- Modify: `frontend/src/pages/shopping/trip-detail-page.tsx`

- [ ] **Step 1: Add duplicate action to trip detail page**

In `frontend/src/pages/shopping/trip-detail-page.tsx`:

Update the react import to include `useState`:

```ts
import { useMemo, useState } from 'react'
```

Add to lucide imports:

```ts
import { ArrowLeft, Copy, ShoppingCart } from 'lucide-react'
```

Add dialog and household imports:

```ts
import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { DuplicateTripDialog } from './duplicate-trip-dialog'
```

Add state (alongside existing hooks):

```ts
const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
```

Add a Duplicate button in the header area, after the trip name `<h1>`:

```tsx
<button
  onClick={() => setShowDuplicateDialog(true)}
  className="flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-light transition-colors"
>
  <Copy className="w-4 h-4" />
  Duplicate
</button>
```

Render the dialog at the bottom of the component (before the closing `</div>`):

```tsx
{showDuplicateDialog && trip && (
  <DuplicateTripDialog
    sourceTripId={trip.id}
    sourceHouseholdId={trip.householdId ?? null}
    household={household ? { id: household.id, name: household.name } : null}
    onClose={() => setShowDuplicateDialog(false)}
    onSuccess={(newTripId) => {
      setShowDuplicateDialog(false)
      navigate(tripDetailPath(newTripId))
    }}
  />
)}
```

- [ ] **Step 2: Run TypeScript check and full test suite**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/shopping/trip-detail-page.tsx
git commit -m "feat: add Duplicate action to trip detail page"
```

---

## Task 7: Update STATUS.md

**Files:**
- Modify: `.claude/STATUS.md`

- [ ] **Step 1: Update STATUS.md**

- Add "Trip Duplication" to the Planned enhancements table if not already there, then move to Completed
- Update test health counts after running full backend + frontend test suites
- Set "Last Updated" date
- Add planning doc link pointing to `docs/archive/2026-04-06-trip-duplication.md`

- [ ] **Step 2: Move planning docs to archive**

```bash
mv docs/active/2026-04-06-trip-duplication.md docs/archive/2026-04-06-trip-duplication.md
mv docs/active/2026-04-06-trip-duplication-plan.md docs/archive/2026-04-06-trip-duplication-plan.md
```

Update the STATUS.md links to point to `../docs/archive/`.

- [ ] **Step 3: Commit**

```bash
git add .claude/STATUS.md docs/
git commit -m "docs: mark trip duplication as completed"
```
