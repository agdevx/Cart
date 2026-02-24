# Test Coverage Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill all identified test coverage gaps across repository, service, auth extension, and DbContext layers (~105 new tests).

**Architecture:** Layer-by-layer test additions using existing project conventions. Repository tests use EF Core InMemory provider. Service tests use Moq. All tests follow xUnit + FluentAssertions with `Should_[Expected]_When_[Condition]` naming and AAA structure with explicit comments.

**Tech Stack:** .NET 10, xUnit, FluentAssertions, Moq, EF Core InMemory

---

## Conventions Reference

- **Naming:** `Should_[ExpectedBehavior]_When_[Condition]`
- **Structure:** `// Arrange` / `// Act` / `// Assert` comments
- **Assertions:** FluentAssertions (`.Should().Be()`, `.Should().BeOfType()`, `.Should().NotBeNull()`)
- **Async:** All test methods are `async Task`
- **InMemory DB:** Use `Guid.NewGuid().ToString()` for database names to isolate tests
- **Moq:** Field-level `Mock<T>` with constructor setup, `.Setup()` / `.ReturnsAsync()` / `.Verify()`
- **ABOUTME comments:** Every test file starts with two `// ABOUTME:` lines describing the file

---

### Task 1: HouseholdRepository Tests

**Files:**
- Create: `backend/AGDevX.Cart.Data.Tests/Repositories/HouseholdRepositoryTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for HouseholdRepository verifying CRUD operations and membership management.
// ABOUTME: Uses InMemory database provider to test EF Core queries without requiring actual database.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class HouseholdRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateHousehold_When_ValidHouseholdProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123" };

        // Act
        var result = await repo.Create(household);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Home");
        result.InviteCode.Should().Be("ABC123");
    }

    [Fact]
    public async Task Should_ReturnHousehold_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "ABC123" };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(household.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test Home");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeMembers_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Test Home", InviteCode = "ABC123" };
        var member = new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "owner", JoinedAt = DateTime.UtcNow };
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(household);
        context.HouseholdMembers.Add(member);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(householdId);

        // Assert
        result.Should().NotBeNull();
        result!.Members.Should().HaveCount(1);
        result.Members.First().UserId.Should().Be(userId);
    }

    [Fact]
    public async Task Should_ReturnHousehold_When_GetByInviteCodeWithExistingCode()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Test Home", InviteCode = "XK7M2P" };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetByInviteCode("XK7M2P");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test Home");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByInviteCodeWithNonExistingCode()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.GetByInviteCode("XXXXXX");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReturnOnlyUserHouseholds_When_GetUserHouseholds()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var h1 = new Household { Id = Guid.NewGuid(), Name = "My Home", InviteCode = "AAA111" };
        var h2 = new Household { Id = Guid.NewGuid(), Name = "Other Home", InviteCode = "BBB222" };
        context.Users.Add(new User { Id = userId, Email = "me@test.com", DisplayName = "Me" });
        context.Users.Add(new User { Id = otherUserId, Email = "other@test.com", DisplayName = "Other" });
        context.Households.AddRange(h1, h2);
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = h1.Id, UserId = userId, Role = "owner", JoinedAt = DateTime.UtcNow });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = h2.Id, UserId = otherUserId, Role = "owner", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserHouseholds(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Home");
    }

    [Fact]
    public async Task Should_UpdateHousehold_When_ValidHouseholdProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Old Name", InviteCode = "ABC123" };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        household.Name = "New Name";
        var result = await repo.Update(household);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteHousehold_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Doomed", InviteCode = "ABC123" };
        context.Households.Add(household);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(household.Id);

        // Assert
        var result = await context.Households.FindAsync(household.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingHousehold()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_UserIsMember()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserMember(householdId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_UserIsNotMember()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);

        // Act
        var result = await repo.IsUserMember(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_AddMember_When_ValidMemberProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        await context.SaveChangesAsync();
        var member = new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow };

        // Act
        await repo.AddMember(member);

        // Assert
        var exists = await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Should_RemoveMember_When_MemberExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        await repo.RemoveMember(householdId, userId);

        // Assert
        var exists = await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Should_UpdateMemberRole_When_MemberExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new HouseholdRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Households.Add(new Household { Id = householdId, Name = "Home", InviteCode = "ABC123" });
        context.HouseholdMembers.Add(new HouseholdMember { HouseholdId = householdId, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        await repo.UpdateMemberRole(householdId, userId, "owner");

        // Assert
        var member = await context.HouseholdMembers.FirstAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        member.Role.Should().Be("owner");
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~HouseholdRepositoryTests" -v minimal`
Expected: All 16 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/Repositories/HouseholdRepositoryTests.cs
git commit -m "test: add HouseholdRepository tests"
```

---

### Task 2: InventoryRepository Tests

**Files:**
- Create: `backend/AGDevX.Cart.Data.Tests/Repositories/InventoryRepositoryTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for InventoryRepository verifying CRUD operations and privacy filtering.
// ABOUTME: Uses InMemory database provider to test household vs personal inventory queries.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class InventoryRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Milk", OwnerUserId = Guid.NewGuid() };

        // Act
        var result = await repo.Create(item);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Eggs", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(item.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Eggs");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeDefaultStore_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Costco", UserId = Guid.NewGuid() };
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Butter", OwnerUserId = Guid.NewGuid(), DefaultStoreId = store.Id };
        context.Stores.Add(store);
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(item.Id);

        // Assert
        result.Should().NotBeNull();
        result!.DefaultStore.Should().NotBeNull();
        result.DefaultStore!.Name.Should().Be("Costco");
    }

    [Fact]
    public async Task Should_ReturnOnlyHouseholdItems_When_GetHouseholdItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var householdId = Guid.NewGuid();
        var householdItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Shared Milk", HouseholdId = householdId };
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(householdItem, personalItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetHouseholdItems(householdId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Shared Milk");
    }

    [Fact]
    public async Task Should_ReturnOnlyPersonalItems_When_GetPersonalItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var userId = Guid.NewGuid();
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = userId };
        var otherItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Other Snack", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(personalItem, otherItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetPersonalItems(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Snack");
    }

    [Fact]
    public async Task Should_ReturnHouseholdAndPersonalItems_When_GetMergedInventory()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var householdId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var householdItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Shared Milk", HouseholdId = householdId };
        var personalItem = new InventoryItem { Id = Guid.NewGuid(), Name = "My Snack", OwnerUserId = userId };
        var unrelatedItem = new InventoryItem { Id = Guid.NewGuid(), Name = "Unrelated", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.AddRange(householdItem, personalItem, unrelatedItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetMergedInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(i => i.Name).Should().Contain("Shared Milk").And.Contain("My Snack");
    }

    [Fact]
    public async Task Should_UpdateItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Old Name", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        item.Name = "New Name";
        var result = await repo.Update(item);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteItem_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Doomed", OwnerUserId = Guid.NewGuid() };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(item.Id);

        // Assert
        var result = await context.InventoryItems.FindAsync(item.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingItem()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new InventoryRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~InventoryRepositoryTests" -v minimal`
Expected: All 11 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/Repositories/InventoryRepositoryTests.cs
git commit -m "test: add InventoryRepository tests"
```

---

### Task 3: StoreRepository Tests

**Files:**
- Create: `backend/AGDevX.Cart.Data.Tests/Repositories/StoreRepositoryTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for StoreRepository verifying CRUD operations and household/personal filtering.
// ABOUTME: Uses InMemory database provider to test store queries with ordering and navigation loading.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class StoreRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateStore_When_ValidStoreProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() };

        // Act
        var result = await repo.Create(store);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Target");
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Walmart", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(store.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeHousehold_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var household = new Household { Id = Guid.NewGuid(), Name = "Home", InviteCode = "ABC123" };
        var store = new Store { Id = Guid.NewGuid(), Name = "Costco", HouseholdId = household.Id };
        context.Households.Add(household);
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(store.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Household.Should().NotBeNull();
        result.Household!.Name.Should().Be("Home");
    }

    [Fact]
    public async Task Should_ReturnHouseholdStoresOrderedByName_When_GetHouseholdStores()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var householdId = Guid.NewGuid();
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Walmart", HouseholdId = householdId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Aldi", HouseholdId = householdId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() });
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetHouseholdStores(householdId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Aldi");
        result[1].Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_ReturnPersonalStoresOrderedByName_When_GetPersonalStores()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var userId = Guid.NewGuid();
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Walmart", UserId = userId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Aldi", UserId = userId });
        context.Stores.Add(new Store { Id = Guid.NewGuid(), Name = "Target", UserId = Guid.NewGuid() });
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetPersonalStores(userId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Aldi");
        result[1].Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_UpdateStore_When_ValidStoreProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Old Name", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        store.Name = "New Name";
        var result = await repo.Update(store);

        // Assert
        result.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task Should_DeleteStore_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);
        var store = new Store { Id = Guid.NewGuid(), Name = "Doomed", UserId = Guid.NewGuid() };
        context.Stores.Add(store);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(store.Id);

        // Assert
        var result = await context.Stores.FindAsync(store.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingStore()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new StoreRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~StoreRepositoryTests" -v minimal`
Expected: All 10 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/Repositories/StoreRepositoryTests.cs
git commit -m "test: add StoreRepository tests"
```

---

### Task 4: TripRepository Tests

**Files:**
- Create: `backend/AGDevX.Cart.Data.Tests/Repositories/TripRepositoryTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for TripRepository verifying CRUD operations and collaborator management.
// ABOUTME: Uses InMemory database provider to test trip queries including creator and collaborator access.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class TripRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateTrip_When_ValidTripProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Weekly Run", IsCompleted = false };

        // Act
        var result = await repo.Create(trip);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Weekly Run");
    }

    [Fact]
    public async Task Should_ReturnTrip_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Weekly Run", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(trip.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Weekly Run");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeCollaboratorsAndItems_When_GetById()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = userId });
        var trip = new Trip { Id = tripId, Name = "Run", IsCompleted = false };
        context.Trips.Add(trip);
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripId);

        // Assert
        result.Should().NotBeNull();
        result!.Collaborators.Should().HaveCount(1);
        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTripsWhereUserIsCreator_When_GetUserTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "My Trip", IsCompleted = false, CreatedBy = userId.ToString() });
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Other Trip", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_ReturnTripsWhereUserIsCollaborator_When_GetUserTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Collab Trip", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() });
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Collab Trip");
    }

    [Fact]
    public async Task Should_ReturnHouseholdTrips_When_GetHouseholdTrips()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var householdId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Household Trip", IsCompleted = false, HouseholdId = householdId });
        context.Trips.Add(new Trip { Id = Guid.NewGuid(), Name = "Other Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetHouseholdTrips(householdId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Household Trip");
    }

    [Fact]
    public async Task Should_ReturnTrue_When_IsUserCollaboratorAsCreator()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false, CreatedBy = userId.ToString() });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserCollaborator(tripId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnTrue_When_IsUserCollaboratorAsExplicitCollaborator()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() });
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserCollaborator(tripId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_IsUserCollaboratorForUnrelatedUser()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.IsUserCollaborator(tripId, Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_ReturnFalse_When_IsUserCollaboratorForNonExistingTrip()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var result = await repo.IsUserCollaborator(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Should_AddCollaborator_When_ValidIds()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        await context.SaveChangesAsync();

        // Act
        await repo.AddCollaborator(tripId, userId);

        // Assert
        var exists = await context.TripCollaborators.AnyAsync(c => c.TripId == tripId && c.UserId == userId);
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task Should_RemoveCollaborator_When_CollaboratorExists()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var tripId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Users.Add(new User { Id = userId, Email = "test@test.com", DisplayName = "Test" });
        context.Trips.Add(new Trip { Id = tripId, Name = "Trip", IsCompleted = false });
        context.TripCollaborators.Add(new TripCollaborator { TripId = tripId, UserId = userId, Trip = null!, User = null! });
        await context.SaveChangesAsync();

        // Act
        await repo.RemoveCollaborator(tripId, userId);

        // Assert
        var exists = await context.TripCollaborators.AnyAsync(c => c.TripId == tripId && c.UserId == userId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Should_UpdateTrip_When_ValidTripProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Old", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        trip.Name = "Updated";
        var result = await repo.Update(trip);

        // Assert
        result.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task Should_DeleteTrip_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Doomed", IsCompleted = false };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(trip.Id);

        // Assert
        var result = await context.Trips.FindAsync(trip.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingTrip()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~TripRepositoryTests" -v minimal`
Expected: All 17 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/Repositories/TripRepositoryTests.cs
git commit -m "test: add TripRepository tests"
```

---

### Task 5: TripItemRepository Tests

**Files:**
- Create: `backend/AGDevX.Cart.Data.Tests/Repositories/TripItemRepositoryTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for TripItemRepository verifying CRUD operations and navigation property loading.
// ABOUTME: Uses InMemory database provider to test trip item queries with InventoryItem and Store includes.

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests.Repositories;

public class TripItemRepositoryTests
{
    private static CartDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: dbName)
                      .Options;
        return new CartDbContext(options);
    }

    [Fact]
    public async Task Should_CreateTripItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        await context.SaveChangesAsync();
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 2 };

        // Act
        var result = await repo.Create(tripItem);

        // Assert
        result.Should().NotBeNull();
        result.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task Should_ReturnTripItem_When_GetByIdWithExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripItem.Id);

        // Assert
        result.Should().NotBeNull();
        result!.InventoryItem.Should().NotBeNull();
        result.InventoryItem!.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdWithNonExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);

        // Act
        var result = await repo.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_IncludeStore_When_GetByIdWithStoreAssigned()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        context.Stores.Add(new Store { Id = storeId, Name = "Costco", UserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1, StoreId = storeId };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetById(tripItem.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Store.Should().NotBeNull();
        result.Store!.Name.Should().Be("Costco");
    }

    [Fact]
    public async Task Should_ReturnOnlyTripItems_When_GetTripItems()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var otherTripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run 1", IsCompleted = false });
        context.Trips.Add(new Trip { Id = otherTripId, Name = "Run 2", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 });
        context.TripItems.Add(new TripItem { Id = Guid.NewGuid(), TripId = otherTripId, InventoryItemId = inventoryItemId, Quantity = 3 });
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetTripItems(tripId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Quantity.Should().Be(1);
    }

    [Fact]
    public async Task Should_UpdateTripItem_When_ValidItemProvided()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        tripItem.Quantity = 5;
        var result = await repo.Update(tripItem);

        // Assert
        result.Quantity.Should().Be(5);
    }

    [Fact]
    public async Task Should_DeleteTripItem_When_ExistingId()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);
        var tripId = Guid.NewGuid();
        var inventoryItemId = Guid.NewGuid();
        context.Trips.Add(new Trip { Id = tripId, Name = "Run", IsCompleted = false });
        context.InventoryItems.Add(new InventoryItem { Id = inventoryItemId, Name = "Milk", OwnerUserId = Guid.NewGuid() });
        var tripItem = new TripItem { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = inventoryItemId, Quantity = 1 };
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();

        // Act
        await repo.Delete(tripItem.Id);

        // Assert
        var result = await context.TripItems.FindAsync(tripItem.Id);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_NotThrow_When_DeletingNonExistingTripItem()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateContext(dbName);
        var repo = new TripItemRepository(context);

        // Act
        var act = () => repo.Delete(Guid.NewGuid());

        // Assert
        await act.Should().NotThrowAsync();
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~TripItemRepositoryTests" -v minimal`
Expected: All 8 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/Repositories/TripItemRepositoryTests.cs
git commit -m "test: add TripItemRepository tests"
```

---

### Task 6: CartDbContext Audit Field Tests

**Files:**
- Modify: `backend/AGDevX.Cart.Data.Tests/CartDbContextTests.cs` (append after line 65)

**Step 1: Add audit field tests after existing tests**

Append these tests inside the existing `CartDbContextTests` class, before the closing `}`:

```csharp
    [Fact]
    public async Task Should_SetCreatedFields_When_AddingEntity()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "audit@test.com", DisplayName = "Audit" };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert
        user.CreatedBy.Should().Be("System");
        user.CreatedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        user.ModifiedBy.Should().Be("System");
        user.ModifiedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Should_SetModifiedFields_When_UpdatingEntity()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "audit@test.com", DisplayName = "Audit" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var originalCreatedDate = user.CreatedDate;
        var originalCreatedBy = user.CreatedBy;

        // Act
        await Task.Delay(10);
        user.DisplayName = "Updated";
        context.Users.Update(user);
        await context.SaveChangesAsync();

        // Assert
        user.CreatedBy.Should().Be(originalCreatedBy);
        user.CreatedDate.Should().Be(originalCreatedDate);
        user.ModifiedBy.Should().Be("System");
        user.ModifiedDate.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_UseSystemAsCreatedBy_When_NoHttpContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        //== No IHttpContextAccessor passed — simulates background or startup scenarios
        using var context = new CartDbContext(options);
        var user = new User { Id = Guid.NewGuid(), Email = "system@test.com", DisplayName = "System Test" };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert
        user.CreatedBy.Should().Be("System");
        user.ModifiedBy.Should().Be("System");
    }
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Data.Tests --filter "FullyQualifiedName~CartDbContextTests" -v minimal`
Expected: All 5 tests PASS (2 existing + 3 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data.Tests/CartDbContextTests.cs
git commit -m "test: add CartDbContext audit field tests"
```

---

### Task 7: ClaimsPrincipalExtensions Tests

**Files:**
- Create: `backend/AGDevX.Cart.Auth.Tests/Extensions/ClaimsPrincipalExtensionsTests.cs`

**Step 1: Write all tests**

```csharp
// ABOUTME: Tests for ClaimsPrincipalExtensions verifying user ID extraction from claims.
// ABOUTME: Covers valid claims, missing claims, and invalid claim values.

using System.Security.Claims;
using AGDevX.Cart.Auth.Extensions;
using FluentAssertions;

namespace AGDevX.Cart.Auth.Tests.Extensions;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void Should_ReturnUserId_When_ValidGuidClaim()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().Be(userId);
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_MissingClaim()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.Email, "test@test.com")
        ]));

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_InvalidGuidValue()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "not-a-guid")
        ]));

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }

    [Fact]
    public void Should_ThrowUnauthorizedAccessException_When_NoClaims()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
           .WithMessage("User ID not found in claims");
    }
}
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Auth.Tests --filter "FullyQualifiedName~ClaimsPrincipalExtensionsTests" -v minimal`
Expected: All 4 tests PASS

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Auth.Tests/Extensions/ClaimsPrincipalExtensionsTests.cs
git commit -m "test: add ClaimsPrincipalExtensions tests"
```

---

### Task 8: InventoryService Test Expansion

**Files:**
- Modify: `backend/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs` (append after line 87)

**Step 1: Add new tests after existing tests**

Append these tests inside the existing `InventoryServiceTests` class, before the closing `}`:

```csharp
    [Fact]
    public async Task Should_SetOwnerUserId_When_CreatingPersonalItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Personal Snack" };

        _mockInventoryRepository.Setup(r => r.Create(It.IsAny<InventoryItem>()))
                                .ReturnsAsync((InventoryItem i) => i);

        // Act
        var result = await _service.CreateInventoryItem(item, userId);

        // Assert
        result.OwnerUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdItemAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home", Members = new List<HouseholdMember>() };
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Milk", HouseholdId = householdId };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var act = () => _service.CreateInventoryItem(item, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdItemWithInvalidHousehold()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Milk", HouseholdId = Guid.NewGuid() };

        _mockHouseholdRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Household?)null);

        // Act
        var act = () => _service.CreateInventoryItem(item, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_AggregatePersonalAndHouseholdItems_When_GetAllUserInventory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home" };
        var personalItems = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Personal", OwnerUserId = userId } };
        var householdItems = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Shared", HouseholdId = householdId } };

        _mockHouseholdRepository.Setup(r => r.GetUserHouseholds(userId)).ReturnsAsync(new[] { household });
        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId)).ReturnsAsync(personalItems);
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId)).ReturnsAsync(householdItems);

        // Act
        var result = await _service.GetAllUserInventory(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(i => i.Name).Should().Contain("Personal").And.Contain("Shared");
    }

    [Fact]
    public async Task Should_ReturnHouseholdItems_When_GetHouseholdInventoryAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };
        var items = new List<InventoryItem> { new() { Id = Guid.NewGuid(), Name = "Milk", HouseholdId = householdId } };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId)).ReturnsAsync(items);

        // Act
        var result = await _service.GetHouseholdInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetHouseholdInventoryAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home", Members = new List<HouseholdMember>() };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var act = () => _service.GetHouseholdInventory(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnMergedItems_When_GetMergedInventoryAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };
        var items = new List<InventoryItem>
        {
            new() { Id = Guid.NewGuid(), Name = "Shared", HouseholdId = householdId },
            new() { Id = Guid.NewGuid(), Name = "Personal", OwnerUserId = userId }
        };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockInventoryRepository.Setup(r => r.GetMergedInventory(householdId, userId)).ReturnsAsync(items);

        // Act
        var result = await _service.GetMergedInventory(householdId, userId);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetMergedInventoryAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home", Members = new List<HouseholdMember>() };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var act = () => _service.GetMergedInventory(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdForHouseholdItemAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var item = new InventoryItem { Id = itemId, Name = "Milk", HouseholdId = householdId };
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };

        _mockInventoryRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(item);
        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var result = await _service.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdForPersonalItemAsOwner()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var item = new InventoryItem { Id = itemId, Name = "My Snack", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(item);

        // Act
        var result = await _service.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Snack");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((InventoryItem?)null);

        // Act
        var result = await _service.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdForOtherUsersPersonalItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var item = new InventoryItem { Id = itemId, Name = "Not Yours", OwnerUserId = Guid.NewGuid() };

        _mockInventoryRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(item);

        // Act
        var act = () => _service.GetById(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_UpdateItem_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var existing = new InventoryItem { Id = itemId, Name = "Old", OwnerUserId = userId };
        var updated = new InventoryItem { Id = itemId, Name = "New", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(existing);
        _mockInventoryRepository.Setup(r => r.Update(It.IsAny<InventoryItem>())).ReturnsAsync(updated);

        // Act
        var result = await _service.UpdateInventoryItem(updated, userId);

        // Assert
        result.Name.Should().Be("New");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((InventoryItem?)null);
        var item = new InventoryItem { Id = Guid.NewGuid(), Name = "Ghost" };

        // Act
        var act = () => _service.UpdateInventoryItem(item, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_DeleteItem_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var existing = new InventoryItem { Id = itemId, Name = "Doomed", OwnerUserId = userId };

        _mockInventoryRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(existing);
        _mockInventoryRepository.Setup(r => r.Delete(itemId)).Returns(Task.CompletedTask);

        // Act
        await _service.DeleteInventoryItem(itemId, userId);

        // Assert
        _mockInventoryRepository.Verify(r => r.Delete(itemId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingNonExistingItem()
    {
        // Arrange
        _mockInventoryRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((InventoryItem?)null);

        // Act
        var act = () => _service.DeleteInventoryItem(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
```

**Note:** The existing file uses field-level mocks `_mockInventoryRepository` and `_mockHouseholdRepository` and `_service` initialized in the constructor. Read the existing file first to confirm the field names match.

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~InventoryServiceTests" -v minimal`
Expected: All 19 tests PASS (2 existing + 17 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs
git commit -m "test: expand InventoryService tests"
```

---

### Task 9: StoreService Test Expansion

**Files:**
- Modify: `backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs` (append after line 86)

**Step 1: Add new tests after existing tests**

Append these tests inside the existing `StoreServiceTests` class, before the closing `}`. Read the existing file first to confirm field names for mocks.

```csharp
    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingHouseholdStoreAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household { Id = householdId, Name = "Home", Members = new List<HouseholdMember>() };
        var store = new Store { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var act = () => _service.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_CreatingPersonalStoreForDifferentUser()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var store = new Store { Id = Guid.NewGuid(), Name = "My Store", UserId = Guid.NewGuid() };

        // Act
        var act = () => _service.CreateStore(store, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnStores_When_GetHouseholdStoresAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };
        var stores = new List<Store> { new() { Id = Guid.NewGuid(), Name = "Target", HouseholdId = householdId } };

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId)).ReturnsAsync(stores);

        // Act
        var result = await _service.GetHouseholdStores(householdId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetHouseholdStoresAsNonMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();

        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync((Household?)null);

        // Act
        var act = () => _service.GetHouseholdStores(householdId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnPersonalStores_When_GetPersonalStores()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var stores = new List<Store> { new() { Id = Guid.NewGuid(), Name = "My Store", UserId = userId } };

        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId)).ReturnsAsync(stores);

        // Act
        var result = await _service.GetPersonalStores(userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdForHouseholdStoreAsMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "Target", HouseholdId = householdId };
        var household = new Household
        {
            Id = householdId,
            Name = "Home",
            Members = new List<HouseholdMember> { new() { UserId = userId, HouseholdId = householdId } }
        };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);
        _mockHouseholdRepository.Setup(r => r.GetById(householdId)).ReturnsAsync(household);

        // Act
        var result = await _service.GetById(storeId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Target");
    }

    [Fact]
    public async Task Should_ReturnStore_When_GetByIdForPersonalStoreAsOwner()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "My Store", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);

        // Act
        var result = await _service.GetById(storeId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Store");
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var result = await _service.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdForOtherUsersStore()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var store = new Store { Id = storeId, Name = "Not Yours", UserId = Guid.NewGuid() };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(store);

        // Act
        var act = () => _service.GetById(storeId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_UpdateStore_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var existing = new Store { Id = storeId, Name = "Old", UserId = userId };
        var updated = new Store { Id = storeId, Name = "New", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.Update(It.IsAny<Store>())).ReturnsAsync(updated);

        // Act
        var result = await _service.UpdateStore(updated, userId);

        // Assert
        result.Name.Should().Be("New");
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_UpdatingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _service.UpdateStore(new Store { Id = Guid.NewGuid(), Name = "Ghost" }, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_DeleteStore_When_UserIsAuthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var storeId = Guid.NewGuid();
        var existing = new Store { Id = storeId, Name = "Doomed", UserId = userId };

        _mockStoreRepository.Setup(r => r.GetById(storeId)).ReturnsAsync(existing);
        _mockStoreRepository.Setup(r => r.Delete(storeId)).Returns(Task.CompletedTask);

        // Act
        await _service.DeleteStore(storeId, userId);

        // Assert
        _mockStoreRepository.Verify(r => r.Delete(storeId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingNonExistingStore()
    {
        // Arrange
        _mockStoreRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Store?)null);

        // Act
        var act = () => _service.DeleteStore(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~StoreServiceTests" -v minimal`
Expected: All 16 tests PASS (2 existing + 14 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services.Tests/StoreServiceTests.cs
git commit -m "test: expand StoreService tests"
```

---

### Task 10: TripService Test Expansion

**Files:**
- Modify: `backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs` (append after line 118)

**Step 1: Add new tests after existing tests**

Append these tests inside the existing `TripServiceTests` class, before the closing `}`. Read the existing file first to confirm field names for mocks.

```csharp
    [Fact]
    public async Task Should_ReturnTrips_When_GetUserTrips()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var trips = new List<Trip> { new() { Id = Guid.NewGuid(), Name = "Trip 1", IsCompleted = false } };

        _mockTripRepository.Setup(r => r.GetUserTrips(userId)).ReturnsAsync(trips);

        // Act
        var result = await _service.GetUserTrips(userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTrips_When_GetHouseholdTrips()
    {
        // Arrange
        var householdId = Guid.NewGuid();
        var trips = new List<Trip> { new() { Id = Guid.NewGuid(), Name = "Household Trip", IsCompleted = false } };

        _mockTripRepository.Setup(r => r.GetHouseholdTrips(householdId)).ReturnsAsync(trips);

        // Act
        var result = await _service.GetHouseholdTrips(householdId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ReturnTrip_When_GetById()
    {
        // Arrange
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "My Trip", IsCompleted = false };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);

        // Act
        var result = await _service.GetById(tripId);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("My Trip");
    }

    [Fact]
    public async Task Should_UpdateTrip_When_ValidTripProvided()
    {
        // Arrange
        var trip = new Trip { Id = Guid.NewGuid(), Name = "Updated", IsCompleted = false };

        _mockTripRepository.Setup(r => r.Update(trip)).ReturnsAsync(trip);

        // Act
        var result = await _service.UpdateTrip(trip);

        // Assert
        result.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task Should_DeleteTrip_When_UserIsCreator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Doomed", IsCompleted = false, CreatedBy = userId.ToString() };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Delete(tripId)).Returns(Task.CompletedTask);

        // Act
        await _service.DeleteTrip(tripId, userId);

        // Assert
        _mockTripRepository.Verify(r => r.Delete(tripId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingTripAsNonCreator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Not Yours", IsCompleted = false, CreatedBy = Guid.NewGuid().ToString() };

        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);

        // Act
        var act = () => _service.DeleteTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_DeletingNonExistingTrip()
    {
        // Arrange
        _mockTripRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Trip?)null);

        // Act
        var act = () => _service.DeleteTrip(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_ReopenTrip_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Completed", IsCompleted = true, CompletedAt = DateTime.UtcNow };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockTripRepository.Setup(r => r.Update(It.IsAny<Trip>())).ReturnsAsync((Trip t) => t);

        // Act
        var result = await _service.ReopenTrip(tripId, userId);

        // Assert
        result.IsCompleted.Should().BeFalse();
        result.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_ReopeningTripAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.ReopenTrip(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_AddCollaborator_When_UserIsCollaboratorAndTargetIsHouseholdMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false, HouseholdId = householdId };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockHouseholdRepository.Setup(r => r.IsUserMember(householdId, collaboratorUserId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.AddCollaborator(tripId, collaboratorUserId)).Returns(Task.CompletedTask);

        // Act
        await _service.AddCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        _mockTripRepository.Verify(r => r.AddCollaborator(tripId, collaboratorUserId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_AddingCollaboratorAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.AddCollaborator(tripId, userId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_AddingNonHouseholdMemberAsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        var trip = new Trip { Id = tripId, Name = "Trip", IsCompleted = false, HouseholdId = householdId };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.GetById(tripId)).ReturnsAsync(trip);
        _mockHouseholdRepository.Setup(r => r.IsUserMember(householdId, collaboratorUserId)).ReturnsAsync(false);

        // Act
        var act = () => _service.AddCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_RemoveCollaborator_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var collaboratorUserId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripRepository.Setup(r => r.RemoveCollaborator(tripId, collaboratorUserId)).Returns(Task.CompletedTask);

        // Act
        await _service.RemoveCollaborator(tripId, userId, collaboratorUserId);

        // Assert
        _mockTripRepository.Verify(r => r.RemoveCollaborator(tripId, collaboratorUserId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_RemovingCollaboratorAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.RemoveCollaborator(tripId, userId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripServiceTests" -v minimal`
Expected: All 19 tests PASS (4 existing + 15 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services.Tests/TripServiceTests.cs
git commit -m "test: expand TripService tests"
```

---

### Task 11: TripItemService Test Expansion

**Files:**
- Modify: `backend/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs` (append after line 293)

**Step 1: Add new tests after existing tests**

Append these tests inside the existing `TripItemServiceTests` class, before the closing `}`. Read the existing file first to confirm field names for mocks.

```csharp
    [Fact]
    public async Task Should_ReturnItems_When_GetTripItemsAsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var items = new List<TripItem> { new() { Id = Guid.NewGuid(), TripId = tripId, InventoryItemId = Guid.NewGuid(), Quantity = 1 } };

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripItemRepository.Setup(r => r.GetTripItems(tripId)).ReturnsAsync(items);

        // Act
        var result = await _service.GetTripItems(tripId, userId);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetTripItemsAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();

        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.GetTripItems(tripId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ReturnItem_When_GetByIdAsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), Quantity = 2 };

        _mockTripItemRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);

        // Act
        var result = await _service.GetById(itemId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task Should_ReturnNull_When_GetByIdForNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((TripItem?)null);

        // Act
        var result = await _service.GetById(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_GetByIdAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), Quantity = 1 };

        _mockTripItemRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.GetById(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_UpdatingNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((TripItem?)null);

        // Act
        var act = () => _service.UpdateTripItem(Guid.NewGuid(), 1, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Should_DeleteTripItem_When_UserIsCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), Quantity = 1 };

        _mockTripItemRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(true);
        _mockTripItemRepository.Setup(r => r.Delete(itemId)).Returns(Task.CompletedTask);

        // Act
        await _service.DeleteTripItem(itemId, userId);

        // Assert
        _mockTripItemRepository.Verify(r => r.Delete(itemId), Times.Once);
    }

    [Fact]
    public async Task Should_ThrowUnauthorizedAccessException_When_DeletingTripItemAsNonCollaborator()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tripId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var tripItem = new TripItem { Id = itemId, TripId = tripId, InventoryItemId = Guid.NewGuid(), Quantity = 1 };

        _mockTripItemRepository.Setup(r => r.GetById(itemId)).ReturnsAsync(tripItem);
        _mockTripRepository.Setup(r => r.IsUserCollaborator(tripId, userId)).ReturnsAsync(false);

        // Act
        var act = () => _service.DeleteTripItem(itemId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Should_ThrowKeyNotFoundException_When_DeletingNonExistingTripItem()
    {
        // Arrange
        _mockTripItemRepository.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((TripItem?)null);

        // Act
        var act = () => _service.DeleteTripItem(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripItemServiceTests" -v minimal`
Expected: All 18 tests PASS (9 existing + 9 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs
git commit -m "test: expand TripItemService tests"
```

---

### Task 12: TripEventService Test Expansion

**Files:**
- Modify: `backend/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs` (append after line 39)

**Step 1: Add new tests after existing tests**

Append these tests inside the existing `TripEventServiceTests` class, before the closing `}`:

```csharp
    [Fact]
    public void Should_ReturnObservable_When_SubscribingToTrip()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();

        // Act
        var observable = service.SubscribeToTrip(tripId);

        // Assert
        observable.Should().NotBeNull();
    }

    [Fact]
    public void Should_NotThrow_When_PublishingEventWithNoSubscribers()
    {
        // Arrange
        var service = new TripEventService();
        var tripEvent = new TripEvent
        {
            TripId = Guid.NewGuid(),
            EventType = "ItemAdded",
            Data = "{}",
            Timestamp = DateTime.UtcNow
        };

        // Act
        var act = () => service.PublishEvent(tripEvent);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Should_CompleteSubject_When_UnsubscribingFromTrip()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();
        var completed = false;

        var observable = service.SubscribeToTrip(tripId);
        observable.Subscribe(_ => { }, () => completed = true);

        // Act
        service.UnsubscribeFromTrip(tripId);

        // Assert
        completed.Should().BeTrue();
    }

    [Fact]
    public void Should_DeliverToMultipleSubscribers_When_PublishingEvent()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();
        var received1 = new List<TripEvent>();
        var received2 = new List<TripEvent>();

        var observable = service.SubscribeToTrip(tripId);
        observable.Subscribe(e => received1.Add(e));
        observable.Subscribe(e => received2.Add(e));

        var tripEvent = new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            Data = "{}",
            Timestamp = DateTime.UtcNow
        };

        // Act
        service.PublishEvent(tripEvent);

        // Assert
        received1.Should().HaveCount(1);
        received2.Should().HaveCount(1);
    }

    [Fact]
    public void Should_ReturnSameObservable_When_SubscribingToSameTripTwice()
    {
        // Arrange
        var service = new TripEventService();
        var tripId = Guid.NewGuid();

        // Act
        var observable1 = service.SubscribeToTrip(tripId);
        var observable2 = service.SubscribeToTrip(tripId);

        // Assert
        observable1.Should().BeSameAs(observable2);
    }
```

**Step 2: Run tests to verify they pass**

Run: `dotnet test backend/AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~TripEventServiceTests" -v minimal`
Expected: All 6 tests PASS (1 existing + 5 new)

**Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services.Tests/TripEventServiceTests.cs
git commit -m "test: expand TripEventService tests"
```

---

### Task 13: Run Full Test Suite

**Step 1: Run all tests**

Run: `dotnet test backend/AGDevX.Cart.slnx -v minimal`
Expected: All tests PASS (existing ~140 + ~105 new ≈ 245 total)

**Step 2: Commit if any adjustments needed**

If tests reveal issues, fix and commit fixes individually.

---

### Task 14: Final Commit and Summary

**Step 1: Verify clean state**

Run: `git status`
Expected: Clean working tree, all changes committed

**Step 2: Review commit log**

Run: `git log --oneline test/fill-test-coverage-gaps ^main`
Expected: Design doc commit + 12 test commits
