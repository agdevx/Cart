# Trip Editing, Deletion, and Reopening — Design

## Design Spec


## Scope

Add three actions to trip cards on the shopping page: **rename**, **delete**, and **reopen**.

## UI Pattern

### Kebab Menu Per Trip Row

A three-dot (`MoreVertical` from Lucide) icon on each trip card. Tapping it opens a dropdown with context-appropriate actions:

- **Active trips**: Rename, Delete
- **Completed trips**: Rename, Reopen, Delete

The kebab sits in the top-right of each trip card. The dropdown appears below/above the icon (position-aware).

### Rename (Inline Edit)

When "Rename" is selected from the kebab menu:

1. The trip name transforms into a text input, pre-filled with the current name, auto-focused with text selected
2. Save on **Enter** or **blur** (if value changed)
3. Cancel on **Escape** (reverts to original name)
4. While saving, the input is disabled with a subtle loading state
5. Calls `PUT /api/trip/{id}` with the updated name

### Delete (Confirmation Dialog)

When "Delete" is selected:

1. A confirmation dialog appears: "Delete *{trip name}*? This can't be undone."
2. Two buttons: **Cancel** (secondary) and **Delete** (destructive/red)
3. Calls `DELETE /api/trip/{id}`
4. On success, the trip disappears from the list via query invalidation

### Reopen

When "Reopen" is selected from a completed trip's kebab menu:

1. No confirmation needed (low-risk, reversible action)
2. Calls `POST /api/trip/{id}/reopen`
3. Trip moves from Completed back to In Progress via query invalidation

## Backend Changes

### UpdateTripRequest DTO

The current `PUT /api/trip/{id}` endpoint accepts a full `Trip` entity with no authorization checks. Changes needed:

- Create an `UpdateTripRequest` DTO with just `Name` (only field editable via this UI)
- Add authorization in the service layer (creator or collaborator can rename)
- Pass userId through from the controller to the service

### Existing Endpoints (No Changes Needed)

- `DELETE /api/trip/{id}` — already has creator-only authorization
- `POST /api/trip/{id}/reopen` — already implemented

## Components

| Component | Purpose |
|---|---|
| `TripKebabMenu` | Three-dot button + dropdown with Rename/Delete/Reopen options |
| `ConfirmDialog` | Reusable confirmation dialog (Cancel + destructive action) |
| Inline edit state | Managed within the shopping page via local state per trip row |

## New Frontend Hooks

| Hook | Endpoint | Purpose |
|---|---|---|
| `useUpdateTripMutation` | `PUT /api/trip/{id}` | Rename a trip |
| `useDeleteTripMutation` | `DELETE /api/trip/{id}` | Delete a trip |
| `useReopenTripMutation` | `POST /api/trip/{id}/reopen` | Reopen a completed trip |

## Implementation Plan


> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add rename, delete, and reopen actions to trip cards on the shopping page via kebab menus.

**Architecture:** Backend needs an `UpdateTripRequest` DTO and authorization on the update endpoint. Frontend needs three new mutation hooks, a kebab menu dropdown, inline rename editing, a confirmation dialog for delete, and tests for all of it.

**Tech Stack:** .NET 10 (backend), React 19, TanStack Query, Vitest, Lucide Icons, TailwindCSS v4

---

### Task 1: Create UpdateTripRequest DTO

**Files:**
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`

**Step 1: Create the DTO**

```csharp
// ABOUTME: DTO for updating trip properties
// ABOUTME: Currently supports renaming trips via the Name field

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    public string Name { get; set; } = string.Empty;
}
```

**Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs
git commit -m "feat: add UpdateTripRequest DTO"
```

---

### Task 2: Add authorization to UpdateTrip in TripService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs:13`
- Modify: `backend/AGDevX.Cart.Services/TripService.cs:48-51`
- Test: `backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs`

**Step 1: Write failing tests**

Add these tests to `TripServiceTests.cs` after the existing `Should_UpdateTrip_When_ValidTripProvided` test (which will also need updating):

```csharp
[Fact]
public async Task Should_UpdateTripName_When_UserIsCollaborator()
{
    // Arrange
    var userId = Guid.NewGuid();
    var tripId = Guid.NewGuid();
    var trip = new Trip { Id = tripId, Name = "Old Name", IsCompleted = false };

    _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
    _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
    _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>())).ReturnsAsync((Trip t) => t);

    // Act
    var result = await _tripService.UpdateTrip(tripId, "New Name", userId);

    // Assert
    result.Name.Should().Be("New Name");
}

[Fact]
public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingTripAsNonCollaborator()
{
    // Arrange
    var userId = Guid.NewGuid();
    var tripId = Guid.NewGuid();

    _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

    // Act
    var act = () => _tripService.UpdateTrip(tripId, "New Name", userId);

    // Assert
    await act.Should().ThrowAsync<UnauthorizedAccessException>();
}

[Fact]
public async Task Should_ThrowKeyNotFoundException_When_UpdatingNonExistingTrip()
{
    // Arrange
    var userId = Guid.NewGuid();
    var tripId = Guid.NewGuid();

    _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
    _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync((Trip?)null);

    // Act
    var act = () => _tripService.UpdateTrip(tripId, "New Name", userId);

    // Assert
    await act.Should().ThrowAsync<KeyNotFoundException>();
}
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && dotnet test --filter "TripServiceTests" --no-build`
Expected: FAIL — `UpdateTrip` doesn't accept these parameters yet

**Step 3: Update the interface**

In `ITripService.cs`, change the `UpdateTrip` signature at line 13:

```csharp
// Old:
Task<Trip> UpdateTrip(Trip trip);

// New:
Task<Trip> UpdateTrip(Guid tripId, string name, Guid userId);
```

**Step 4: Update the implementation**

In `TripService.cs`, replace the `UpdateTrip` method (lines 48-51):

```csharp
public async Task<Trip> UpdateTrip(Guid tripId, string name, Guid userId)
{
    //== Verify user is collaborator before updating trip
    var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
    if (!isCollaborator)
    {
        throw new UnauthorizedAccessException("User is not a collaborator on this trip");
    }

    var trip = await tripRepository.GetById(tripId)
                    ?? throw new KeyNotFoundException("Trip not found");

    trip.Name = name;
    return await tripRepository.Update(trip);
}
```

**Step 5: Remove the old `Should_UpdateTrip_When_ValidTripProvided` test** since the signature changed. The three new tests replace it.

**Step 6: Run tests to verify they pass**

Run: `cd backend && dotnet test --filter "TripServiceTests"`
Expected: All PASS

**Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Services/ITripService.cs backend/AGDevX.Cart.Services/TripService.cs backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs
git commit -m "feat: add authorization to UpdateTrip service method"
```

---

### Task 3: Update TripController to use UpdateTripRequest DTO

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs:87-103`
- Test: `backend/AGDevX.Cart.Api.Tests/Controllers/TripControllerTests.cs`

**Step 1: Update the existing controller tests**

The three existing Update tests (lines 196-284) need to be updated to match the new signature. Update `Should_ReturnNoContent_When_UpdateTripSuccessful`:

```csharp
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

    var request = new UpdateTripRequest { Name = "Updated Trip" };
    var trip = new Trip { Id = tripId, Name = "Updated Trip" };

    mockService.Setup(s => s.UpdateTrip(tripId, request.Name, userId))
               .ReturnsAsync(trip);

    // Act
    var result = await controller.Update(tripId, request);

    // Assert
    result.Should().BeOfType<NoContentResult>();
}
```

Update `Should_ReturnNotFound_When_UpdateTripNotFound`:

```csharp
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

    var request = new UpdateTripRequest { Name = "Updated Trip" };

    mockService.Setup(s => s.UpdateTrip(tripId, request.Name, userId))
               .ThrowsAsync(new ArgumentException("Trip not found"));

    // Act
    var result = await controller.Update(tripId, request);

    // Assert
    result.Should().BeOfType<NotFoundObjectResult>();
}
```

Update `Should_ReturnUnauthorized_When_UpdateTripUnauthorized`:

```csharp
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

    var request = new UpdateTripRequest { Name = "Updated Trip" };

    mockService.Setup(s => s.UpdateTrip(tripId, request.Name, userId))
               .ThrowsAsync(new UnauthorizedAccessException("User is not authorized to update this trip"));

    // Act
    var result = await controller.Update(tripId, request);

    // Assert
    result.Should().BeOfType<UnauthorizedObjectResult>();
}
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && dotnet test --filter "TripControllerTests"`
Expected: FAIL — controller still uses old signature

**Step 3: Update the controller**

In `TripController.cs`, replace the `Update` method (lines 87-103):

```csharp
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTripRequest request)
{
    try
    {
        var userId = User.GetUserId();
        await tripService.UpdateTrip(id, request.Name, userId);
        return NoContent();
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new { errorCode = "NOT_FOUND", message = ex.Message });
    }
}
```

Add the `using` for the DTO at the top of the file:

```csharp
using AGDevX.Cart.Shared.DTOs;
```

**Step 4: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: All PASS

**Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/TripController.cs backend/AGDevX.Cart.Api.Tests/Controllers/TripControllerTests.cs
git commit -m "feat: use UpdateTripRequest DTO with auth in TripController"
```

---

### Task 4: Create frontend mutation hooks

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/delete-trip.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/reopen-trip.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/trip/tests/update-trip.mutation.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip.mutation.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/trip/tests/reopen-trip.mutation.test.tsx`

**Step 1: Write test for update trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/tests/update-trip.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the update trip mutation hook
// ABOUTME: Verifies rename calls correct endpoint and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Trip } from '../../models/trip'
import { useUpdateTripMutation } from '../update-trip.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockAuth = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useUpdateTripMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates trip name successfully', async () => {
    mockAuth()

    const mockTrip: Trip = {
      id: 'trip1',
      name: 'Renamed Trip',
      householdId: null,
      createdByUserId: 'user1',
      isCompleted: false,
      completedAt: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-02',
    }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTrip,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateTripMutation(), { wrapper })

    result.current.mutate({ tripId: 'trip1', name: 'Renamed Trip' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip/trip1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed Trip' }),
    })
  })

  it('invalidates trips queries on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTripMutation(), { wrapper })

    result.current.mutate({ tripId: 'trip1', name: 'New Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trips'] })
  })

  it('handles update error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateTripMutation(), { wrapper })

    result.current.mutate({ tripId: 'trip1', name: 'New Name' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 2: Write test for delete trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the delete trip mutation hook
// ABOUTME: Verifies delete calls correct endpoint and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useDeleteTripMutation } from '../delete-trip.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockAuth = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useDeleteTripMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('deletes trip successfully', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip/trip1', {
      method: 'DELETE',
    })
  })

  it('invalidates trips queries on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trips'] })
  })

  it('handles delete error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useDeleteTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 3: Write test for reopen trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/tests/reopen-trip.mutation.test.tsx`:

```tsx
// ABOUTME: Tests for the reopen trip mutation hook
// ABOUTME: Verifies reopen calls correct endpoint and invalidates cache

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Trip } from '../../models/trip'
import { useReopenTripMutation } from '../reopen-trip.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockAuth = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useReopenTripMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('reopens trip successfully', async () => {
    mockAuth()

    const mockTrip: Trip = {
      id: 'trip1',
      name: 'Reopened Trip',
      householdId: null,
      createdByUserId: 'user1',
      isCompleted: false,
      completedAt: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-03',
    }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTrip,
    } as unknown as Response)

    const { result } = renderHook(() => useReopenTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip/trip1/reopen', {
      method: 'POST',
    })
  })

  it('invalidates trips queries on success', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReopenTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trips'] })
  })

  it('handles reopen error', async () => {
    mockAuth()

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useReopenTripMutation(), { wrapper })

    result.current.mutate('trip1')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Step 4: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/trip/tests/update-trip.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/delete-trip.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/reopen-trip.mutation.test.tsx`
Expected: FAIL — hooks don't exist yet

**Step 5: Implement update trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts`:

```ts
// ABOUTME: Mutation hook for renaming trips
// ABOUTME: Sends updated name to API and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripRequest {
  tripId: string
  name: string
}

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateTripRequest): Promise<void> => {
      const response = await apiFetch(`/api/trip/${request.tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: request.name }),
      })
      if (!response.ok) {
        throw new Error('Failed to update trip')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

**Step 6: Implement delete trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/delete-trip.mutation.ts`:

```ts
// ABOUTME: Mutation hook for deleting trips
// ABOUTME: Sends delete request to API and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<void> => {
      const response = await apiFetch(`/api/trip/${tripId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete trip')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

**Step 7: Implement reopen trip mutation**

Create `frontend/src/apis/agdevx-cart-api/trip/reopen-trip.mutation.ts`:

```ts
// ABOUTME: Mutation hook for reopening completed trips
// ABOUTME: Sends reopen request to API and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

export const useReopenTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<Trip> => {
      const response = await apiFetch(`/api/trip/${tripId}/reopen`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to reopen trip')
      }
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

**Step 8: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/apis/agdevx-cart-api/trip/tests/update-trip.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/delete-trip.mutation.test.tsx src/apis/agdevx-cart-api/trip/tests/reopen-trip.mutation.test.tsx`
Expected: All PASS

**Step 9: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/trip/update-trip.mutation.ts frontend/src/apis/agdevx-cart-api/trip/delete-trip.mutation.ts frontend/src/apis/agdevx-cart-api/trip/reopen-trip.mutation.ts frontend/src/apis/agdevx-cart-api/trip/tests/update-trip.mutation.test.tsx frontend/src/apis/agdevx-cart-api/trip/tests/delete-trip.mutation.test.tsx frontend/src/apis/agdevx-cart-api/trip/tests/reopen-trip.mutation.test.tsx
git commit -m "feat: add update, delete, and reopen trip mutation hooks with tests"
```

---

### Task 5: Build TripCard component with kebab menu

**Files:**
- Create: `frontend/src/pages/components/trip-card.tsx`
- Create: `frontend/src/pages/components/tests/trip-card.test.tsx`

**Step 1: Write tests for TripCard**

Create `frontend/src/pages/components/tests/trip-card.test.tsx`:

```tsx
// ABOUTME: Tests for the TripCard component
// ABOUTME: Verifies kebab menu, inline rename, delete confirmation, and reopen

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'

import { TripCard } from '../trip-card'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockActiveTrip: Trip = {
  id: 'trip1',
  name: 'Weekly Groceries',
  householdId: null,
  createdByUserId: 'user1',
  isCompleted: false,
  completedAt: null,
  createdBy: 'user1',
  createdDate: '2024-01-15',
  modifiedBy: null,
  modifiedDate: null,
}

const mockCompletedTrip: Trip = {
  id: 'trip2',
  name: 'Holiday Shopping',
  householdId: 'household1',
  createdByUserId: 'user1',
  isCompleted: true,
  completedAt: '2024-01-20',
  createdBy: 'user1',
  createdDate: '2024-01-15',
  modifiedBy: 'user1',
  modifiedDate: '2024-01-20',
}

describe('TripCard', () => {
  const onRename = vi.fn()
  const onDelete = vi.fn()
  const onReopen = vi.fn()

  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders active trip with name and date', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
  })

  it('renders completed trip with completion date', () => {
    render(
      <TripCard trip={mockCompletedTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    expect(screen.getByText('Holiday Shopping')).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('shows kebab menu with Rename and Delete for active trip', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.queryByText('Reopen')).not.toBeInTheDocument()
  })

  it('shows kebab menu with Rename, Reopen, and Delete for completed trip', () => {
    render(
      <TripCard trip={mockCompletedTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))

    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Reopen')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('enters inline edit mode when Rename is clicked', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    expect(screen.getByDisplayValue('Weekly Groceries')).toBeInTheDocument()
  })

  it('calls onRename when Enter is pressed in edit mode', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Renamed Trip' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRename).toHaveBeenCalledWith('trip1', 'Renamed Trip')
  })

  it('cancels rename when Escape is pressed', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onRename).not.toHaveBeenCalled()
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
  })

  it('does not call onRename when name is unchanged', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRename).not.toHaveBeenCalled()
  })

  it('calls onDelete when Delete is clicked', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Delete'))

    expect(onDelete).toHaveBeenCalledWith('trip1', 'Weekly Groceries')
  })

  it('calls onReopen when Reopen is clicked on completed trip', () => {
    render(
      <TripCard trip={mockCompletedTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    fireEvent.click(screen.getByText('Reopen'))

    expect(onReopen).toHaveBeenCalledWith('trip2')
  })

  it('closes kebab menu when clicking outside', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    fireEvent.click(screen.getByLabelText('Trip actions'))
    expect(screen.getByText('Rename')).toBeInTheDocument()

    fireEvent.mouseDown(document)

    expect(screen.queryByText('Rename')).not.toBeInTheDocument()
  })

  it('active trip card links to trip detail page', () => {
    render(
      <TripCard trip={mockActiveTrip} onRename={onRename} onDelete={onDelete} onReopen={onReopen} />,
      { wrapper }
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/shopping/trip1')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/components/tests/trip-card.test.tsx`
Expected: FAIL — component doesn't exist yet

**Step 3: Implement TripCard component**

Create `frontend/src/pages/components/trip-card.tsx`:

```tsx
// ABOUTME: Trip card component with kebab menu for rename, delete, and reopen actions
// ABOUTME: Supports inline editing for rename and dispatches action callbacks to parent

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'

interface TripCardProps {
  trip: Trip
  onRename: (tripId: string, newName: string) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
}

export const TripCard = ({ trip, onRename, onDelete, onReopen }: TripCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(trip.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Auto-focus and select input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleRenameClick = () => {
    setMenuOpen(false)
    setEditName(trip.name)
    setEditing(true)
  }

  const handleRenameSubmit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== trip.name) {
      onRename(trip.id, trimmed)
    }
    setEditing(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setEditName(trip.name)
    }
  }

  const handleDeleteClick = () => {
    setMenuOpen(false)
    onDelete(trip.id, trip.name)
  }

  const handleReopenClick = () => {
    setMenuOpen(false)
    onReopen(trip.id)
  }

  const cardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              className="font-display text-lg font-bold text-navy bg-transparent border-b-2 border-teal outline-none w-full"
            />
          ) : (
            <h3 className={`font-display text-lg font-bold ${trip.isCompleted ? 'text-navy-soft' : 'text-navy'}`}>
              {trip.name}
            </h3>
          )}
          <p className="text-[13px] text-text-secondary font-medium mt-1">
            {trip.isCompleted
              ? `Completed: ${trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}`
              : `Started: ${new Date(trip.createdDate).toLocaleDateString()}`}
          </p>
        </div>

        {/* Kebab menu */}
        <div className="relative ml-2" ref={menuRef}>
          <button
            aria-label="Trip actions"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1.5 rounded-lg hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-text-secondary" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleRenameClick()
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </button>
              {trip.isCompleted && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReopenClick()
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDeleteClick()
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  // Active trips are clickable links; completed trips are static
  if (!trip.isCompleted && !editing) {
    return (
      <Link
        to={`/shopping/${trip.id}`}
        className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={`p-5 bg-surface rounded-2xl shadow-sm ${trip.isCompleted ? 'opacity-60' : ''}`}>
      {cardContent}
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/components/tests/trip-card.test.tsx`
Expected: All PASS

**Step 5: Commit**

```bash
git add frontend/src/pages/components/trip-card.tsx frontend/src/pages/components/tests/trip-card.test.tsx
git commit -m "feat: add TripCard component with kebab menu, inline rename, and action callbacks"
```

---

### Task 6: Build ConfirmDialog component

**Files:**
- Create: `frontend/src/pages/components/confirm-dialog.tsx`
- Create: `frontend/src/pages/components/tests/confirm-dialog.test.tsx`

**Step 1: Write tests for ConfirmDialog**

Create `frontend/src/pages/components/tests/confirm-dialog.test.tsx`:

```tsx
// ABOUTME: Tests for the reusable confirmation dialog component
// ABOUTME: Verifies rendering, confirm/cancel actions, and destructive styling

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '../confirm-dialog'

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDialog
        title="Delete Trip"
        message='Delete "Weekly Groceries"? This can\'t be undone.'
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Trip')).toBeInTheDocument()
    expect(screen.getByText(/Delete "Weekly Groceries"/)).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Delete'))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables confirm button when isPending is true', () => {
    render(
      <ConfirmDialog
        title="Delete Trip"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isPending={true}
      />
    )

    expect(screen.getByText('Delete')).toBeDisabled()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/components/tests/confirm-dialog.test.tsx`
Expected: FAIL — component doesn't exist yet

**Step 3: Implement ConfirmDialog**

Create `frontend/src/pages/components/confirm-dialog.tsx`:

```tsx
// ABOUTME: Reusable confirmation dialog with overlay backdrop
// ABOUTME: Supports customizable title, message, and destructive confirm button styling

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

export const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onCancel, isPending }: ConfirmDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg">
        <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
        <p className="text-text-secondary mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold bg-bg-warm text-navy-soft rounded-xl hover:bg-navy/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/components/tests/confirm-dialog.test.tsx`
Expected: All PASS

**Step 5: Commit**

```bash
git add frontend/src/pages/components/confirm-dialog.tsx frontend/src/pages/components/tests/confirm-dialog.test.tsx
git commit -m "feat: add reusable ConfirmDialog component with tests"
```

---

### Task 7: Wire up ShoppingPage with TripCard, mutations, and delete confirmation

**Files:**
- Modify: `frontend/src/pages/shopping-page.tsx`
- Modify: `frontend/src/pages/tests/shopping-page.test.tsx` (if it exists; create if not)

**Step 1: Write/update tests for the shopping page**

Check if `frontend/src/pages/tests/shopping-page.test.tsx` exists. If not, create it. Add tests for the new behavior:

```tsx
// ABOUTME: Tests for the ShoppingPage trip management features
// ABOUTME: Verifies kebab menu actions (rename, delete, reopen) on trip cards

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { Household } from '@/apis/agdevx-cart-api/models/household'
import * as tripsQueryModule from '@/apis/agdevx-cart-api/trip/use-trips.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import * as updateTripModule from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import * as deleteTripModule from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import * as reopenTripModule from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import * as createTripModule from '@/apis/agdevx-cart-api/trip/create-trip.mutation'

import { ShoppingPage } from '../shopping-page'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const mockTrips: Trip[] = [
  {
    id: 'trip1',
    name: 'Weekly Groceries',
    householdId: null,
    createdByUserId: 'user1',
    isCompleted: false,
    completedAt: null,
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'trip2',
    name: 'Holiday Shopping',
    householdId: null,
    createdByUserId: 'user1',
    isCompleted: true,
    completedAt: '2024-01-20',
    createdBy: 'user1',
    createdDate: '2024-01-15',
    modifiedBy: 'user1',
    modifiedDate: '2024-01-20',
  },
]

const setupMocks = (options?: { trips?: Trip[]; tripsLoading?: boolean }) => {
  const trips = options?.trips ?? mockTrips
  const tripsLoading = options?.tripsLoading ?? false

  vi.spyOn(tripsQueryModule, 'useTripsQuery').mockReturnValue({
    data: tripsLoading ? undefined : trips,
    isLoading: tripsLoading,
  } as UseQueryResult<Trip[]>)

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: [],
    isLoading: false,
  } as UseQueryResult<Household[]>)

  const mutateFn = vi.fn()
  vi.spyOn(createTripModule, 'useCreateTripMutation').mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any)

  const updateMutateFn = vi.fn()
  vi.spyOn(updateTripModule, 'useUpdateTripMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as any)

  const deleteMutateFn = vi.fn()
  vi.spyOn(deleteTripModule, 'useDeleteTripMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as any)

  const reopenMutateFn = vi.fn()
  vi.spyOn(reopenTripModule, 'useReopenTripMutation').mockReturnValue({
    mutate: reopenMutateFn,
    isPending: false,
  } as any)

  return { updateMutateFn, deleteMutateFn, reopenMutateFn }
}

describe('ShoppingPage - trip management', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders trip cards with kebab menus', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText('Holiday Shopping')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Trip actions')).toHaveLength(2)
  })

  it('renames a trip via inline edit', () => {
    const { updateMutateFn } = setupMocks()
    render(<ShoppingPage />, { wrapper })

    // Open kebab menu on first trip
    fireEvent.click(screen.getAllByLabelText('Trip actions')[0])
    fireEvent.click(screen.getByText('Rename'))

    // Edit the name
    const input = screen.getByDisplayValue('Weekly Groceries')
    fireEvent.change(input, { target: { value: 'Renamed Trip' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(updateMutateFn).toHaveBeenCalledWith({ tripId: 'trip1', name: 'Renamed Trip' })
  })

  it('shows delete confirmation dialog', () => {
    setupMocks()
    render(<ShoppingPage />, { wrapper })

    fireEvent.click(screen.getAllByLabelText('Trip actions')[0])
    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByText('Delete Trip')).toBeInTheDocument()
    expect(screen.getByText(/Weekly Groceries/)).toBeInTheDocument()
  })

  it('deletes a trip when confirmed', () => {
    const { deleteMutateFn } = setupMocks()
    render(<ShoppingPage />, { wrapper })

    fireEvent.click(screen.getAllByLabelText('Trip actions')[0])
    fireEvent.click(screen.getByText('Delete'))

    // Confirm deletion in dialog
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }))

    expect(deleteMutateFn).toHaveBeenCalledWith('trip1')
  })

  it('cancels delete when Cancel is clicked in dialog', () => {
    const { deleteMutateFn } = setupMocks()
    render(<ShoppingPage />, { wrapper })

    fireEvent.click(screen.getAllByLabelText('Trip actions')[0])
    fireEvent.click(screen.getByText('Delete'))

    fireEvent.click(screen.getByText('Cancel'))

    expect(deleteMutateFn).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete Trip')).not.toBeInTheDocument()
  })

  it('reopens a completed trip', () => {
    const { reopenMutateFn } = setupMocks()
    render(<ShoppingPage />, { wrapper })

    // Open kebab on completed trip (second trip)
    fireEvent.click(screen.getAllByLabelText('Trip actions')[1])
    fireEvent.click(screen.getByText('Reopen'))

    expect(reopenMutateFn).toHaveBeenCalledWith('trip2')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/tests/shopping-page.test.tsx`
Expected: FAIL — ShoppingPage doesn't use TripCard or the new mutations yet

**Step 3: Update ShoppingPage**

Replace the contents of `frontend/src/pages/shopping-page.tsx` to use TripCard, the new mutations, and ConfirmDialog. Key changes:

- Import `TripCard`, `ConfirmDialog`, and the three new mutation hooks
- Add `deleteConfirm` state for the confirmation dialog
- Replace the inline `<Link>` and `<div>` trip renderings with `<TripCard>` components
- Wire up `onRename`, `onDelete`, `onReopen` handlers

```tsx
// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useDeleteTripMutation } from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import { useReopenTripMutation } from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import { useUpdateTripMutation } from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'

import { ConfirmDialog } from './components/confirm-dialog'
import { TripCard } from './components/trip-card'

export const ShoppingPage = () => {
  const { data: trips, isLoading } = useTripsQuery()
  const { data: households } = useHouseholdsQuery()
  const createMutation = useCreateTripMutation()
  const updateMutation = useUpdateTripMutation()
  const deleteMutation = useDeleteTripMutation()
  const reopenMutation = useReopenTripMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tripName, setTripName] = useState('')
  const [householdId, setHouseholdId] = useState<string>('personal')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const activeTrips = trips?.filter((trip) => !trip.isCompleted) || []
  const completedTrips = trips?.filter((trip) => trip.isCompleted) || []

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tripName.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({
        name: tripName.trim(),
        householdId: householdId === 'personal' ? null : householdId,
      })
      setTripName('')
      setShowCreateForm(false)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleRename = (tripId: string, newName: string) => {
    updateMutation.mutate({ tripId, name: newName })
  }

  const handleDelete = (tripId: string, tripName: string) => {
    setDeleteConfirm({ id: tripId, name: tripName })
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleReopen = (tripId: string) => {
    reopenMutation.mutate(tripId)
  }

  if (isLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading trips...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Trips</span>
        </h1>
      </div>

      {/* New Trip Button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-2"
      >
        <Plus className="w-5 h-5" />
        {showCreateForm ? 'Cancel' : 'Plan a new trip'}
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreateTrip} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
          <div className="mb-3">
            <label htmlFor="tripName" className="block text-sm font-semibold text-navy-soft mb-1">
              Trip Name
            </label>
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="household" className="block text-sm font-semibold text-navy-soft mb-1">
              Type
            </label>
            <select
              id="household"
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            >
              <option value="personal">Personal Trip</option>
              {households?.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !tripName.trim()}
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      )}

      {activeTrips.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">In Progress</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onRename={handleRename}
                onDelete={handleDelete}
                onReopen={handleReopen}
              />
            ))}
          </div>
        </div>
      )}

      {completedTrips.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Completed</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {completedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onRename={handleRename}
                onDelete={handleDelete}
                onReopen={handleReopen}
              />
            ))}
          </div>
        </div>
      )}

      {trips && trips.length === 0 && (
        <p className="text-text-secondary mt-4">No trips yet. Create your first shopping trip!</p>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete "${deleteConfirm.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
```

**Step 4: Run shopping page tests**

Run: `cd frontend && npx vitest run src/pages/tests/shopping-page.test.tsx`
Expected: All PASS

**Step 5: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 6: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/pages/shopping-page.tsx frontend/src/pages/tests/shopping-page.test.tsx
git commit -m "feat: wire up trip rename, delete, and reopen in ShoppingPage"
```

---

### Task 8: Run full test suites and verify

**Step 1: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: All PASS

**Step 2: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All PASS

**Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

**Step 4: Manual smoke test** (optional)

Run backend and frontend together and verify:
- Active trip kebab shows Rename + Delete
- Completed trip kebab shows Rename + Reopen + Delete
- Rename: inline edit → Enter saves → name updates
- Delete: confirmation dialog → Confirm → trip disappears
- Reopen: completed trip moves to In Progress section
