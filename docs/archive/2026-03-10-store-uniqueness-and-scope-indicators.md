# Store Uniqueness and Scope Indicators

## Design Spec


## Problem

Two small gaps in the current store experience:

1. Users can create duplicate stores with the same name within the same scope (e.g., two "Costco" entries in their personal store list).
2. When a user has "Costco" as a personal store and their household also has "Costco," there's no visual indication of which is which.

## Solution

1. Enforce unique store names within a scope (case-insensitive).
2. Add scope indicators — "(Personal)" or "(Household Name)" — to store names in the UI when a name collision exists across scopes.

## Design

### Backend: Unique Store Names Per Scope

**Validation rule:** No two stores in the same scope can share a name (case-insensitive comparison).

- Personal scope: No duplicate names among a user's personal stores.
- Household scope: No duplicate names among a single household's stores.
- Cross-scope duplicates are allowed. "Costco" can exist as both a personal store and a household store.

**Enforcement location:** `StoreService.CreateStore()` and `StoreService.UpdateStore()`. Before creating or renaming, query for an existing store with the same name (case-insensitive) in the same scope. Return `409 Conflict` if a match is found.

**Update considerations:**
- The duplicate query must **exclude the store being updated** (by ID) to avoid self-matching. Changing "costco" to "Costco" (case-only change) should not 409.
- When a store's scope changes (personal → household or vice versa), the duplicate check must validate against the **destination** scope. Moving "Costco" from personal to a household that already has "Costco" → 409, even if the name didn't change.

**No data model changes.** No unique index needed — the service layer enforces this rule. A unique index would be complex to express (conditional on `UserId` vs `HouseholdId` nullability) and the service layer already handles all store writes.

### Frontend: Scope Indicators

**When to show:** When the combined store list (personal + all household stores) contains duplicate names across scopes (case-insensitive comparison), append a scope label to disambiguate:

- Personal store: `"Costco (Personal)"`
- Household store: `"Costco (Smith Family)"` using the household's actual name

Non-duplicate names display without any suffix.

**Where to show:** Everywhere store names appear in the UI **except**:
- **Trip accordions** — group by denormalized `StoreName` on `TripItem`, so items from a personal "Costco" and a household "Costco" merge into one "Costco" group. This is desirable behavior for shopping convenience.
- **Pantry management view** — stores are already grouped under section headers ("Personal Stores", "Smith Family"), so scope indicators would be redundant.

Affected locations include:
- Store pickers / dropdowns (trip items, inventory items)
- Store filter tabs (e.g., add-trip-items page)
- Any other place a store name is displayed outside of the exceptions above

**Implementation:** A shared utility function that takes the full store list and returns display names. Consumers call this instead of using `store.name` directly.

### Frontend: Duplicate Name Validation

When creating or editing a store, the frontend should validate the name against existing stores in the same scope before submitting. Display an inline error if a duplicate is detected (case-insensitive). This provides immediate feedback without waiting for the backend 409.

When editing, the validation must check against the **selected** scope (which may differ from the store's current scope if the user is changing it) and must exclude the store being edited.

## Edge Cases

**Renaming a store to match another in the same scope:** Blocked by the same validation — both backend (409) and frontend (inline error).

**Two households with stores that share a name:** Both get their household name appended. E.g., "Costco (Smith Family)" and "Costco (Jones Family)". If both households also share a name, the labels would appear identical — this is unlikely enough to not warrant special handling.

## Non-Changes

- Store data model (`Store` entity, `UserId`, `HouseholdId`)
- Store ownership and CRUD authorization
- Denormalized `StoreName` on `TripItem`
- Trip accordion grouping behavior
- Store scoping rules (stores are still personal or household)
- Existing store endpoints
- `useStoresQuery` hook

## Implementation Plan


> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce unique store names within a scope and show disambiguation labels when names collide across scopes.

**Architecture:** Backend adds a duplicate-check repository method and validation in StoreService's create/update paths, returning 409 via InvalidOperationException (matching existing patterns in HouseholdController and AuthController). Frontend adds a shared utility for computing store display names and integrates it into all store dropdowns/tabs (except trip accordions and pantry management view). Pantry stores view gains inline duplicate validation on create/edit forms.

**Tech Stack:** .NET 9 (C#), EF Core, xUnit/Moq/FluentAssertions, React/TypeScript, Vitest/React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-10-cross-scope-store-visibility-design.md`

---

## Chunk 1: Backend — Unique Store Name Enforcement

### Task 1: Add Repository Method for Duplicate Name Check

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/IStoreRepository.cs:8-16`
- Modify: `backend/AGDevX.Cart.Data/Repositories/StoreRepository.cs:9-54`
- Test: `backend/AGDevX.Cart.Data.Tests/Repositories/StoreRepositoryTests.cs`

- [ ] **Step 1: Write the failing test for personal scope duplicate check**

**Important:** This test file uses a per-test pattern with `CreateContext(dbName)` — no shared instance fields. Each test creates its own `CartDbContext` and `StoreRepository`. Follow this pattern exactly.

Add to `StoreRepositoryTests.cs`:

```csharp
[Fact]
public async Task ExistsWithName_Should_ReturnTrue_When_PersonalStoreDuplicateExists()
{
    // Arrange
    var dbName = Guid.NewGuid().ToString();
    using var context = CreateContext(dbName);
    var repo = new StoreRepository(context);
    var userId = Guid.NewGuid();
    var existing = new Store { Id = Guid.NewGuid(), Name = "Costco", UserId = userId };
    context.Stores.Add(existing);
    await context.SaveChangesAsync();

    // Act
    var result = await repo.ExistsWithName("costco", userId: userId, householdId: null, excludeStoreId: null);

    // Assert
    result.Should().BeTrue();
}

[Fact]
public async Task ExistsWithName_Should_ReturnFalse_When_NoPersonalStoreDuplicateExists()
{
    // Arrange
    var dbName = Guid.NewGuid().ToString();
    using var context = CreateContext(dbName);
    var repo = new StoreRepository(context);
    var userId = Guid.NewGuid();
    var existing = new Store { Id = Guid.NewGuid(), Name = "Target", UserId = userId };
    context.Stores.Add(existing);
    await context.SaveChangesAsync();

    // Act
    var result = await repo.ExistsWithName("costco", userId: userId, householdId: null, excludeStoreId: null);

    // Assert
    result.Should().BeFalse();
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "ExistsWithName" -v n`
Expected: FAIL — method does not exist

- [ ] **Step 3: Add interface method**

In `IStoreRepository.cs`, add after line 12 (`GetPersonalStores`):

```csharp
Task<bool> ExistsWithName(string name, Guid? userId, Guid? householdId, Guid? excludeStoreId);
```

- [ ] **Step 4: Implement repository method**

In `StoreRepository.cs`, add after the `GetPersonalStores` method:

```csharp
public async Task<bool> ExistsWithName(string name, Guid? userId, Guid? householdId, Guid? excludeStoreId)
{
    var query = context.Stores.AsQueryable();

    if (householdId.HasValue)
    {
        query = query.Where(s => s.HouseholdId == householdId.Value);
    }
    else if (userId.HasValue)
    {
        query = query.Where(s => s.UserId == userId.Value);
    }

    if (excludeStoreId.HasValue)
    {
        query = query.Where(s => s.Id != excludeStoreId.Value);
    }

    return await query.AnyAsync(s => s.Name.ToLower() == name.ToLower());
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "ExistsWithName" -v n`
Expected: PASS

- [ ] **Step 6: Write tests for household scope and excludeStoreId**

Add to `StoreRepositoryTests.cs`:

```csharp
[Fact]
public async Task ExistsWithName_Should_ReturnTrue_When_HouseholdStoreDuplicateExists()
{
    // Arrange
    var dbName = Guid.NewGuid().ToString();
    using var context = CreateContext(dbName);
    var repo = new StoreRepository(context);
    var householdId = Guid.NewGuid();
    var existing = new Store { Id = Guid.NewGuid(), Name = "Costco", HouseholdId = householdId };
    context.Stores.Add(existing);
    await context.SaveChangesAsync();

    // Act
    var result = await repo.ExistsWithName("COSTCO", userId: null, householdId: householdId, excludeStoreId: null);

    // Assert
    result.Should().BeTrue();
}

[Fact]
public async Task ExistsWithName_Should_ReturnFalse_When_ExcludedStoreId()
{
    // Arrange
    var dbName = Guid.NewGuid().ToString();
    using var context = CreateContext(dbName);
    var repo = new StoreRepository(context);
    var userId = Guid.NewGuid();
    var storeId = Guid.NewGuid();
    var existing = new Store { Id = storeId, Name = "Costco", UserId = userId };
    context.Stores.Add(existing);
    await context.SaveChangesAsync();

    // Act
    var result = await repo.ExistsWithName("costco", userId: userId, householdId: null, excludeStoreId: storeId);

    // Assert
    result.Should().BeFalse();
}

[Fact]
public async Task ExistsWithName_Should_NotMatchAcrossScopes()
{
    // Arrange — "Costco" exists as personal, check household scope
    var dbName = Guid.NewGuid().ToString();
    using var context = CreateContext(dbName);
    var repo = new StoreRepository(context);
    var userId = Guid.NewGuid();
    var householdId = Guid.NewGuid();
    var existing = new Store { Id = Guid.NewGuid(), Name = "Costco", UserId = userId };
    context.Stores.Add(existing);
    await context.SaveChangesAsync();

    // Act
    var result = await repo.ExistsWithName("costco", userId: null, householdId: householdId, excludeStoreId: null);

    // Assert
    result.Should().BeFalse();
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "ExistsWithName" -v n`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/IStoreRepository.cs backend/AGDevX.Cart.Data/Repositories/StoreRepository.cs backend/AGDevX.Cart.Data.Tests/
git commit -m "feat: add ExistsWithName repository method for store duplicate checking"
```

---

### Task 2: Add Uniqueness Check to CreateStore

**Files:**
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs:11-31`
- Test: `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`

- [ ] **Step 1: Write failing tests**

Add to `StoreServiceTests.cs`:

```csharp
[Fact]
public async Task CreateStore_Should_Throw_When_DuplicateNameInPersonalScope()
{
    // Arrange
    var userId = Guid.NewGuid();
    var store = new Store { Name = "Costco" };

    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, null))
                        .ReturnsAsync(true);

    // Act
    var act = () => _storeService.CreateStore(store, userId);

    // Assert
    await act.Should().ThrowAsync<InvalidOperationException>()
             .WithMessage("*already exists*");
}

[Fact]
public async Task CreateStore_Should_Throw_When_DuplicateNameInHouseholdScope()
{
    // Arrange
    var userId = Guid.NewGuid();
    var householdId = Guid.NewGuid();
    var store = new Store { Name = "Costco", HouseholdId = householdId };
    var household = new Household
    {
        Id = householdId,
        Name = "Home",
        Members = new List<HouseholdMember> { new() { UserId = userId } }
    };

    _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", null, householdId, null))
                        .ReturnsAsync(true);

    // Act
    var act = () => _storeService.CreateStore(store, userId);

    // Assert
    await act.Should().ThrowAsync<InvalidOperationException>()
             .WithMessage("*already exists*");
}

[Fact]
public async Task CreateStore_Should_Succeed_When_SameNameDifferentScope()
{
    // Arrange — "Costco" exists in household, creating personal "Costco"
    var userId = Guid.NewGuid();
    var store = new Store { Name = "Costco" };

    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, null))
                        .ReturnsAsync(false);
    _mockStoreRepository.Setup(r => r.Create(It.IsAny<Store>()))
                        .ReturnsAsync(store);

    // Act
    var result = await _storeService.CreateStore(store, userId);

    // Assert
    result.Should().NotBeNull();
    result.Name.Should().Be("Costco");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "CreateStore_Should_Throw_When_Duplicate" -v n`
Expected: FAIL

- [ ] **Step 3: Add uniqueness validation to CreateStore**

In `StoreService.cs`, add the duplicate check in `CreateStore` after the household membership check (line 23) but before the `storeRepository.Create` call (line 30). The check must run after the scope is determined (userId is assigned on line 27 for personal stores):

Replace the method body (lines 11-31) with:

```csharp
public async Task<Store> CreateStore(Store store, Guid userId)
{
    //== Household-scoped store: verify user is a member
    if (store.HouseholdId.HasValue)
    {
        var household = await householdRepository.GetById(store.HouseholdId.Value)
                            ?? throw new UnauthorizedAccessException("Household not found");

        if (!household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }
    }
    //== Personal store: automatically set owner to current user
    else
    {
        store.UserId = userId;
    }

    //== Check for duplicate name in the destination scope
    var duplicateExists = await storeRepository.ExistsWithName(
        store.Name, store.UserId, store.HouseholdId, excludeStoreId: null);

    if (duplicateExists)
    {
        throw new InvalidOperationException($"A store named \"{store.Name}\" already exists in this scope");
    }

    return await storeRepository.Create(store);
}
```

- [ ] **Step 4: Fix existing CreateStore tests that need the mock**

The existing `CreateStore` tests now call `ExistsWithName`, which defaults to returning `false` (Moq default for `Task<bool>`), so they should continue to pass. Run all store service tests to verify:

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "StoreServiceTests" -v n`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Services/StoreService.cs backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs
git commit -m "feat: enforce unique store names on create within same scope"
```

---

### Task 3: Add Uniqueness Check to UpdateStore

**Files:**
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs:76-113`
- Test: `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`

- [ ] **Step 1: Write failing tests**

Add to `StoreServiceTests.cs`:

```csharp
[Fact]
public async Task UpdateStore_Should_Throw_When_DuplicateNameInSameScope()
{
    // Arrange
    var userId = Guid.NewGuid();
    var storeId = Guid.NewGuid();
    var existing = new Store { Id = storeId, Name = "Target", UserId = userId };

    _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, storeId))
                        .ReturnsAsync(true);

    // Act
    var act = () => _storeService.UpdateStore(storeId, "Costco", null, userId);

    // Assert
    await act.Should().ThrowAsync<InvalidOperationException>()
             .WithMessage("*already exists*");
}

[Fact]
public async Task UpdateStore_Should_Throw_When_DuplicateNameInDestinationScope()
{
    // Arrange — moving personal store to household that already has same name
    var userId = Guid.NewGuid();
    var storeId = Guid.NewGuid();
    var householdId = Guid.NewGuid();
    var existing = new Store { Id = storeId, Name = "Costco", UserId = userId };
    var household = new Household
    {
        Id = householdId,
        Name = "Home",
        Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
    };

    _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
    _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", null, householdId, storeId))
                        .ReturnsAsync(true);

    // Act
    var act = () => _storeService.UpdateStore(storeId, "Costco", householdId, userId);

    // Assert
    await act.Should().ThrowAsync<InvalidOperationException>()
             .WithMessage("*already exists*");
}

[Fact]
public async Task UpdateStore_Should_AllowCaseOnlyRename()
{
    // Arrange — "costco" → "Costco" should NOT 409
    var userId = Guid.NewGuid();
    var storeId = Guid.NewGuid();
    var existing = new Store { Id = storeId, Name = "costco", UserId = userId };

    _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
    _mockStoreRepository.Setup(r => r.ExistsWithName("Costco", userId, null, storeId))
                        .ReturnsAsync(false);
    _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>()))
                        .ReturnsAsync((Store s) => s);

    // Act
    var result = await _storeService.UpdateStore(storeId, "Costco", null, userId);

    // Assert
    result.Name.Should().Be("Costco");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "UpdateStore_Should_Throw_When_DuplicateName" -v n`
Expected: FAIL

- [ ] **Step 3: Add uniqueness validation to UpdateStore**

In `StoreService.cs`, in the `UpdateStore` method, add the duplicate check after the scope change logic (after line 105) but before the `storeRepository.Update` call (line 107). The check must use the **destination** scope values (which are already set on `existingStore` at this point):

Insert before `var result = await storeRepository.Update(existingStore);` (line 107):

```csharp
//== Check for duplicate name in the destination scope
var duplicateExists = await storeRepository.ExistsWithName(
    name, existingStore.UserId, existingStore.HouseholdId, excludeStoreId: storeId);

if (duplicateExists)
{
    throw new InvalidOperationException($"A store named \"{name}\" already exists in this scope");
}
```

- [ ] **Step 4: Run all store service tests**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "StoreServiceTests" -v n`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Services/StoreService.cs backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs
git commit -m "feat: enforce unique store names on update with destination scope check"
```

---

### Task 4: Add 409 Conflict Handling to StoreController

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/StoreController.cs:72-85` (Create) and `88-105` (Update)
- Test: `backend/AGDevX.Cart.Api.Tests/Controllers/StoreControllerTests.cs`

- [ ] **Step 1: Write failing controller tests**

Add to `StoreControllerTests.cs`:

```csharp
[Fact]
public async Task Should_ReturnConflict_When_CreateStoreWithDuplicateName()
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

    var store = new Store { Name = "Costco" };

    mockService.Setup(s => s.CreateStore(store, userId))
               .ThrowsAsync(new InvalidOperationException("A store named \"Costco\" already exists in this scope"));

    // Act
    var result = await controller.Create(store);

    // Assert
    var conflictResult = result.Should().BeOfType<ConflictObjectResult>().Subject;
    var value = conflictResult.Value as dynamic;
    ((string)value!.errorCode).Should().Be("DUPLICATE_STORE_NAME");
}

[Fact]
public async Task Should_ReturnConflict_When_UpdateStoreWithDuplicateName()
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

    var store = new Store { Name = "Costco" };

    mockService.Setup(s => s.UpdateStore(storeId, "Costco", null, userId))
               .ThrowsAsync(new InvalidOperationException("A store named \"Costco\" already exists in this scope"));

    // Act
    var result = await controller.Update(storeId, store);

    // Assert
    var conflictResult = result.Should().BeOfType<ConflictObjectResult>().Subject;
    var value = conflictResult.Value as dynamic;
    ((string)value!.errorCode).Should().Be("DUPLICATE_STORE_NAME");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend/AGDevX.Cart.Api.Tests --filter "Conflict_When" -v n`
Expected: FAIL — InvalidOperationException not caught

- [ ] **Step 3: Add InvalidOperationException catch to Create and Update**

In `StoreController.cs`, add a catch block to the `Create` method (after the `UnauthorizedAccessException` catch, before the closing brace of the try-catch):

```csharp
catch (InvalidOperationException ex)
{
    return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
}
```

Add the same catch block to the `Update` method (after the `UnauthorizedAccessException` catch, before the `ArgumentException` catch):

```csharp
catch (InvalidOperationException ex)
{
    return Conflict(new { errorCode = "DUPLICATE_STORE_NAME", message = ex.Message });
}
```

- [ ] **Step 4: Run all store controller tests**

Run: `dotnet test backend/AGDevX.Cart.Api.Tests --filter "StoreControllerTests" -v n`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/StoreController.cs backend/AGDevX.Cart.Api.Tests/
git commit -m "feat: return 409 Conflict for duplicate store names in create and update"
```

---

## Chunk 2: Frontend — Scope Indicators and Duplicate Validation

### Task 5: Create Store Display Names Utility

**Files:**
- Create: `frontend/src/utils/get-store-display-names.ts`
- Create: `frontend/src/utils/get-store-display-names.test.ts`

This utility takes the full store list and a households list, detects cross-scope name collisions (case-insensitive), and returns a `Map<string, string>` from store ID to display name.

- [ ] **Step 1: Write failing tests**

Create `frontend/src/utils/get-store-display-names.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'

import { getStoreDisplayNames } from './get-store-display-names'

const makeStore = (overrides: Partial<Store> & { id: string; name: string }): Store => ({
  householdId: null,
  userId: null,
  createdBy: null,
  createdDate: '',
  modifiedBy: null,
  modifiedDate: null,
  ...overrides,
})

const makeHousehold = (id: string, name: string): Household => ({
  id,
  name,
  createdBy: null,
  createdDate: '',
  modifiedBy: null,
  modifiedDate: null,
})

describe('getStoreDisplayNames', () => {
  it('should return plain names when no duplicates', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should append scope labels when names collide across scopes', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should detect duplicates case-insensitively', () => {
    const stores = [
      makeStore({ id: '1', name: 'costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should disambiguate stores from different households', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', householdId: 'h1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h2' }),
    ]
    const households = [
      makeHousehold('h1', 'Smith Family'),
      makeHousehold('h2', 'Jones Family'),
    ]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Smith Family)')
    expect(result.get('2')).toBe('Costco (Jones Family)')
  })

  it('should not disambiguate stores with same name in same scope', () => {
    // This shouldn't happen with uniqueness enforcement, but utility should handle it
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', userId: 'u1' }),
    ]

    const result = getStoreDisplayNames(stores, [])

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should handle empty store list', () => {
    const result = getStoreDisplayNames([], [])
    expect(result.size).toBe(0)
  })

  it('should fall back to "Household" when household not found in list', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h-unknown' }),
    ]

    const result = getStoreDisplayNames(stores, [])

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Household)')
  })

  it('should handle three-way collision (personal + two households)', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
      makeStore({ id: '3', name: 'Costco', householdId: 'h2' }),
    ]
    const households = [
      makeHousehold('h1', 'Smith Family'),
      makeHousehold('h2', 'Jones Family'),
    ]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
    expect(result.get('3')).toBe('Costco (Jones Family)')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/get-store-display-names.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the utility**

Create `frontend/src/utils/get-store-display-names.ts`:

```typescript
// ABOUTME: Computes display names for stores, appending scope labels when names collide across scopes
// ABOUTME: Returns a Map from store ID to display name — "(Personal)" or "(Household Name)" suffix on collision

import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'

export function getStoreDisplayNames(
  stores: Store[],
  households: Household[]
): Map<string, string> {
  const displayNames = new Map<string, string>()

  //== Group stores by lowercase name to detect cross-scope collisions
  const byName = new Map<string, Store[]>()
  for (const store of stores) {
    const key = store.name.toLowerCase()
    const group = byName.get(key) ?? []
    group.push(store)
    byName.set(key, group)
  }

  const householdNameMap = new Map<string, string>()
  for (const h of households) {
    householdNameMap.set(h.id, h.name ?? 'Household')
  }

  for (const [, group] of byName) {
    //== No collision: all stores in this name group have distinct scopes? Check if cross-scope.
    //== A collision requires 2+ stores with the same name in DIFFERENT scopes.
    const hasMultipleScopes = group.length > 1 && hasCrossScopeDuplicates(group)

    for (const store of group) {
      if (hasMultipleScopes) {
        const label = store.householdId
          ? householdNameMap.get(store.householdId) ?? 'Household'
          : 'Personal'
        displayNames.set(store.id, `${store.name} (${label})`)
      } else {
        displayNames.set(store.id, store.name)
      }
    }
  }

  return displayNames
}

//== Check if stores in a group span different scopes
function hasCrossScopeDuplicates(group: Store[]): boolean {
  const scopes = new Set(group.map((s) => s.householdId ?? `personal:${s.userId}`))
  return scopes.size > 1
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/get-store-display-names.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/get-store-display-names.ts frontend/src/utils/get-store-display-names.test.ts
git commit -m "feat: add getStoreDisplayNames utility for cross-scope store disambiguation"
```

---

### Task 6: Integrate Display Names into Store Dropdowns

**Files:**
- Modify: `frontend/src/pages/add-trip-items-page.tsx:252-265` (store filter tabs), `317-320` (item store dropdown)
- Modify: `frontend/src/pages/components/trip-item-row.tsx:338-340` (edit form store dropdown)
- Modify: `frontend/src/pages/pantry-items-view.tsx:246-248` (create form store dropdown), `333-344` (edit form store dropdown)

All four locations follow the same pattern: import `getStoreDisplayNames`, compute the map using the stores + households already available in component scope, and use `displayNames.get(store.id)` instead of `store.name`.

- [ ] **Step 1: Update add-trip-items-page.tsx — store filter tabs**

Import at the top of the file (after existing imports):

```typescript
import { getStoreDisplayNames } from '@/utils/get-store-display-names'
```

Add a `useMemo` after the `filteredStores` memo (after line 60):

```typescript
const storeDisplayNames = useMemo(
  () => getStoreDisplayNames(stores ?? [], households ?? []),
  [stores, households]
)
```

Replace `{store.name}` on line 264 (inside the store filter tab button) with:

```typescript
{storeDisplayNames.get(store.id) ?? store.name}
```

Replace `{store.name}` on line 320 (inside the item store dropdown `<option>`) with:

```typescript
{storeDisplayNames.get(store.id) ?? store.name}
```

- [ ] **Step 2: Update trip-item-row.tsx — edit form store dropdown**

The `trip-item-row.tsx` component receives `stores` as a prop. It does NOT have direct access to households. The parent component (`active-trip-page.tsx` or `trip-detail-page.tsx`) will need to pass display names.

**Option:** Add a `storeDisplayNames` prop of type `Map<string, string>` to the component. The parent already has both `stores` and `households` available.

Add to the component's props interface (around line 10-20):

```typescript
storeDisplayNames: Map<string, string>
```

Replace `{store.name}` on line 339 with:

```typescript
{storeDisplayNames.get(store.id) ?? store.name}
```

Then update the parent components that render `TripItemRow` to compute and pass the `storeDisplayNames` prop. Check these files:
- `frontend/src/pages/active-trip-page.tsx`
- `frontend/src/pages/trip-detail-page.tsx`

In each parent, import `getStoreDisplayNames`, compute the map in a `useMemo`, and pass it as a prop.

- [ ] **Step 3: Update trip-item-row tests**

The existing tests in `frontend/src/pages/components/tests/trip-item-row.test.tsx` pass `stores={mockStores}` but not the new `storeDisplayNames` prop. Every test that renders `<TripItemRow>` will break. Update the test file:

1. Import `getStoreDisplayNames` (or create a simple `new Map()` from mockStores)
2. Add `storeDisplayNames={mockStoreDisplayNames}` to every `<TripItemRow>` render call
3. The simplest approach: create `const mockStoreDisplayNames = new Map(mockStores.map(s => [s.id, s.name]))` and pass it to all render calls

Run: `cd frontend && npx vitest run src/pages/components/tests/trip-item-row.test.tsx`
Expected: ALL PASS

- [ ] **Step 4: Update pantry-items-view.tsx — create and edit form store dropdowns**

Import at the top:

```typescript
import { getStoreDisplayNames } from '@/utils/get-store-display-names'
```

Add a `useMemo` after the store queries:

```typescript
const storeDisplayNames = useMemo(
  () => getStoreDisplayNames(stores ?? [], households ?? []),
  [stores, households]
)
```

Replace `{store.name}` on line 247 (create form `<option>`) with:

```typescript
{storeDisplayNames.get(store.id) ?? store.name}
```

Replace `{store.name}` on line 343 (edit form `<option>`) with:

```typescript
{storeDisplayNames.get(store.id) ?? store.name}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/add-trip-items-page.tsx frontend/src/pages/components/trip-item-row.tsx frontend/src/pages/components/tests/trip-item-row.test.tsx frontend/src/pages/pantry-items-view.tsx frontend/src/pages/active-trip-page.tsx frontend/src/pages/trip-detail-page.tsx
git commit -m "feat: integrate store display names into all store dropdowns and filter tabs"
```

---

### Task 7: Add Frontend Duplicate Name Validation to Pantry Stores View

**Files:**
- Modify: `frontend/src/pages/pantry-stores-view.tsx`

Add inline validation that checks the typed store name against existing stores in the selected scope (case-insensitive). Display an error message below the input. Disable the submit/save button when a duplicate is detected.

- [ ] **Step 1: Add validation to the create form**

In `pantry-stores-view.tsx`, add a computed duplicate check after the state declarations (around line 33):

```typescript
const createDuplicateError = useMemo(() => {
  if (!storeName.trim() || !stores) return null
  const scopeStores = storeScope === 'personal'
    ? stores.filter((s) => s.userId !== null)
    : stores.filter((s) => s.householdId === storeScope)
  const isDuplicate = scopeStores.some(
    (s) => s.name.toLowerCase() === storeName.trim().toLowerCase()
  )
  return isDuplicate ? 'A store with this name already exists in this scope' : null
}, [storeName, storeScope, stores])
```

Add an error message below the store name input in the create form (after line 238):

```tsx
{createDuplicateError && (
  <p className="text-coral text-sm mt-1">{createDuplicateError}</p>
)}
```

Update the create button's disabled condition (line 266) to also check for duplicates:

```typescript
disabled={createMutation.isPending || !storeName.trim() || !!createDuplicateError}
```

- [ ] **Step 2: Add validation to the edit form**

Add a computed duplicate check for the edit form:

```typescript
const editDuplicateError = useMemo(() => {
  if (!editingName.trim() || !stores || !editingStoreId) return null
  const scopeStores = editingScope === 'personal'
    ? stores.filter((s) => s.userId !== null)
    : stores.filter((s) => s.householdId === editingScope)
  const isDuplicate = scopeStores.some(
    (s) => s.id !== editingStoreId && s.name.toLowerCase() === editingName.trim().toLowerCase()
  )
  return isDuplicate ? 'A store with this name already exists in this scope' : null
}, [editingName, editingScope, editingStoreId, stores])
```

Add an error message below the edit store name input (after line 173):

```tsx
{editDuplicateError && (
  <p className="text-coral text-sm mt-1">{editDuplicateError}</p>
)}
```

Update the save button's disabled condition (line 201) to also check:

```typescript
disabled={updateMutation.isPending || !editingName.trim() || !!editDuplicateError}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: No errors

- [ ] **Step 4: Manual verification**

Open the app, go to Pantry → Stores tab:
1. Create a store "Costco" in Personal scope → should succeed
2. Try to create another "Costco" in Personal scope → inline error, button disabled
3. Try "costco" (different case) → inline error, button disabled
4. Create "Costco" in a household scope → should succeed (different scope)
5. Edit the household "Costco" and try to rename to match another store in same scope → inline error

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/pantry-stores-view.tsx
git commit -m "feat: add inline duplicate name validation to store create and edit forms"
```
