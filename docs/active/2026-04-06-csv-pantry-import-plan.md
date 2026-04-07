# CSV Pantry Import + Package Updates + Database Indexes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV pantry item import to Settings, update all npm/NuGet packages, and add beneficial database indexes.

**Architecture:** Frontend parses CSV and sends JSON array to a new `POST /api/v1/inventory/import` endpoint. Backend validates, auto-creates stores, deduplicates, and bulk-creates items in a single transaction. Package updates and index changes are independent tasks.

**Tech Stack:** .NET 10, EF Core, SQLite, React 19, TanStack Query, Tailwind CSS 4, Vitest, xUnit

**Spec:** `docs/active/2026-04-06-csv-pantry-import.md`

---

## File Structure

### Backend (new files)
- `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryItemRequest.cs` — request DTO for a single row
- `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryResult.cs` — response DTO with counts
- `backend/AGDevX.Cart.Services.Tests/InventoryImportServiceTests.cs` — unit tests for import logic

### Backend (modified files)
- `backend/AGDevX.Cart.Services/IInventoryService.cs` — add `ImportInventoryItems` method
- `backend/AGDevX.Cart.Services/InventoryService.cs` — implement `ImportInventoryItems`
- `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs` — add `Import` action
- `backend/AGDevX.Cart.Api.Tests/Controllers/InventoryControllerTests.cs` — add import endpoint tests
- `backend/AGDevX.Cart.Data/CartDbContext.cs` — add new indexes
- All `.csproj` files — NuGet package updates

### Frontend (new files)
- `frontend/src/pages/settings/pantry-section.tsx` — Pantry section component
- `frontend/src/pages/settings/tests/pantry-section.test.tsx` — tests
- `frontend/src/apis/agdevx-cart-api/inventory/import-inventory.mutation.ts` — TanStack mutation hook
- `frontend/src/utils/csv-parser.ts` — CSV parsing utility
- `frontend/src/utils/tests/csv-parser.test.ts` — CSV parser tests

### Frontend (modified files)
- `frontend/src/pages/settings/settings-page.tsx` — add PantrySection
- `frontend/package.json` — npm package updates

---

## Task 1: npm Package Updates

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Check for outdated packages**

Run from `frontend/`:
```bash
npm outdated
```

- [ ] **Step 2: Update all packages except eslint**

Run from `frontend/`:
```bash
npm update
```

If `npm update` doesn't reach latest for some packages (only updates within semver range), manually edit `package.json` to bump version ranges, then run `npm install`. Do NOT change the `eslint` version (`^9.39.4`).

- [ ] **Step 3: Verify frontend builds and passes**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx eslint src/
npx vitest run
npm run dev
```

All must pass with zero errors. Verify dev server starts successfully, then stop it.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: update npm packages (except eslint)"
```

---

## Task 2: NuGet Package Updates

**Files:**
- Modify: all `.csproj` files in `backend/`

- [ ] **Step 1: Check for outdated packages**

Run from `backend/`:
```bash
dotnet list package --outdated
```

- [ ] **Step 2: Update packages**

For each outdated package, update it. Example:
```bash
dotnet add AGDevX.Cart.Api/AGDevX.Cart.Api.csproj package Microsoft.AspNetCore.OpenApi
dotnet add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj package Microsoft.EntityFrameworkCore.Sqlite
```

Repeat for all projects and all outdated packages.

- [ ] **Step 3: Verify backend builds and all tests pass**

Run from `backend/`:
```bash
dotnet build
dotnet test
```

All must pass with zero errors.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "chore: update NuGet packages"
```

---

## Task 3: Database Index Review

**Files:**
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs`

Review the current indexes and query patterns. Here are the existing indexes and the recommended additions:

**Existing indexes (keep as-is):**
- `User`: unique on `Email`, index on `HouseholdId`
- `Household`: unique on `InviteCode`, indexes on `Owner1UserId`, `Owner2UserId`
- `Store`: indexes on `HouseholdId`, `UserId`, composite `(Name, HouseholdId)`, composite `(Name, UserId)`
- `Trip`: indexes on `HouseholdId`, `CreatedBy`
- `TripItem`: indexes on `TripId`, `InventoryItemId`, `StoreId`
- `InventoryItem`: indexes on `HouseholdId`, `OwnerUserId`
- `UserPreferences`: unique on `UserId`

**Recommended addition:**

1. `InventoryItem`: index on `DefaultStoreId` — used in `.Include(i => i.DefaultStore)` FK joins on every inventory query. This is the only missing FK index in the schema.

Boolean columns (`IsCompleted`, `IsChecked`) have extremely low cardinality and offer negligible benefit as standalone indexes in SQLite. No indexes added for those.

- [ ] **Step 1: Add index to CartDbContext**

In `backend/AGDevX.Cart.Data/CartDbContext.cs`, add to the InventoryItem configuration:

```csharp
entity.HasIndex(i => i.DefaultStoreId);
```

- [ ] **Step 2: Create EF Core migration**

Run from `backend/`:
```bash
dotnet ef migrations add AddPerformanceIndexes --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 3: Review the generated migration**

Read the migration file in `backend/AGDevX.Cart.Data/Migrations/` and verify it only contains a `CreateIndex` call for `DefaultStoreId`. No table drops, no column changes.

- [ ] **Step 4: Verify build and tests pass**

Run from `backend/`:
```bash
dotnet build
dotnet test
```

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Data/
git commit -m "feat: add database index for InventoryItem.DefaultStoreId"
```

---

## Task 4: Backend DTOs for Import

**Files:**
- Create: `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryItemRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryResult.cs`

- [ ] **Step 1: Create the request DTO**

Create `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryItemRequest.cs`:

```csharp
// ABOUTME: DTO for a single row in a CSV pantry import request
// ABOUTME: Represents one item to import with name, notes, default store name, and scope

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class ImportInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? DefaultStore { get; set; }

    [Required]
    public string Scope { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Create the response DTO**

Create `backend/AGDevX.Cart.Shared/DTOs/ImportInventoryResult.cs`:

```csharp
// ABOUTME: Response DTO for the inventory import endpoint
// ABOUTME: Reports how many items were imported and how many were skipped by category

namespace AGDevX.Cart.Shared.DTOs;

public class ImportInventoryResult
{
    public int PersonalItemsImported { get; set; }
    public int HouseholdItemsImported { get; set; }
    public int DuplicatesSkipped { get; set; }
    public int HouseholdItemsSkipped { get; set; }
    public int InvalidRowsSkipped { get; set; }
}
```

- [ ] **Step 3: Verify build**

Run from `backend/`:
```bash
dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Shared/DTOs/ImportInventoryItemRequest.cs backend/AGDevX.Cart.Shared/DTOs/ImportInventoryResult.cs
git commit -m "feat: add DTOs for inventory CSV import"
```

---

## Task 5: Backend Import Service Logic

**Files:**
- Modify: `backend/AGDevX.Cart.Services/IInventoryService.cs`
- Modify: `backend/AGDevX.Cart.Services/InventoryService.cs`

- [ ] **Step 1: Add method to IInventoryService**

In `backend/AGDevX.Cart.Services/IInventoryService.cs`, add:

```csharp
Task<ImportInventoryResult> ImportInventoryItems(IList<ImportInventoryItemRequest> items, Guid userId, CancellationToken cancellationToken = default);
```

Add the using at the top:

```csharp
using AGDevX.Cart.Shared.DTOs;
```

- [ ] **Step 2: Write failing tests**

Create `backend/AGDevX.Cart.Services.Tests/InventoryImportServiceTests.cs`:

```csharp
// ABOUTME: Tests for the ImportInventoryItems service method
// ABOUTME: Validates item creation, store auto-creation, duplicate skipping, household validation, and row validation

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class InventoryImportServiceTests
{
    private readonly Mock<IInventoryRepository> _mockInventoryRepository;
    private readonly Mock<ITripItemRepository> _mockTripItemRepository;
    private readonly Mock<IStoreRepository> _mockStoreRepository;
    private readonly CartDbContext _dbContext;
    private readonly InventoryService _inventoryService;

    public InventoryImportServiceTests()
    {
        _mockInventoryRepository = new Mock<IInventoryRepository>();
        _mockTripItemRepository = new Mock<ITripItemRepository>();
        _mockStoreRepository = new Mock<IStoreRepository>();

        var options = new DbContextOptionsBuilder<CartDbContext>()
                      .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                      .Options;
        _dbContext = new CartDbContext(options);

        _inventoryService = new InventoryService(
            _mockInventoryRepository.Object,
            _dbContext,
            _mockTripItemRepository.Object,
            _mockStoreRepository.Object);
    }

    private async Task SeedUser(Guid userId, Guid? householdId = null)
    {
        _dbContext.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Name = "Test", HouseholdId = householdId });
        await _dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Should_ImportPersonalItems_When_ValidInput()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "Bread", Notes = "Whole wheat", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(2);
        result.HouseholdItemsImported.Should().Be(0);
        result.DuplicatesSkipped.Should().Be(0);
        result.HouseholdItemsSkipped.Should().Be(0);
        result.InvalidRowsSkipped.Should().Be(0);
    }

    [Fact]
    public async Task Should_ImportHouseholdItems_When_UserHasHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "household" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsImported.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipHouseholdItems_When_UserHasNoHousehold()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "household" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipDuplicates_AgainstExistingItems()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem> { new() { Name = "Milk", OwnerUserId = userId } });
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "milk", Scope = "personal" },
            new() { Name = "Bread", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_SkipDuplicates_WithinCsv()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "milk", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(1);
    }

    [Fact]
    public async Task Should_AllowSameNameInDifferentScopes()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", Scope = "personal" },
            new() { Name = "Milk", Scope = "household" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.HouseholdItemsImported.Should().Be(1);
        result.DuplicatesSkipped.Should().Be(0);
    }

    [Fact]
    public async Task Should_SkipInvalidRows()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "", Scope = "personal" },
            new() { Name = "  ", Scope = "personal" },
            new() { Name = "Valid", Scope = "badscope" },
            new() { Name = "Good Item", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);
        result.InvalidRowsSkipped.Should().Be(3);
    }

    [Fact]
    public async Task Should_AutoCreateStores_WhenNotExisting()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "Costco", Scope = "personal" },
            new() { Name = "Bread", DefaultStore = "Costco", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(2);

        //== Verify only one store was created for both items referencing "Costco"
        _dbContext.ChangeTracker.Entries<Store>().Should().HaveCount(1);
    }

    [Fact]
    public async Task Should_AutoCreateHouseholdStore_WhenNotExisting()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        var householdId = Guid.NewGuid();
        await SeedUser(userId, householdId);

        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockInventoryRepository.Setup(r => r.GetHouseholdItems(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());
        _mockStoreRepository.Setup(r => r.GetHouseholdStores(householdId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store>());

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "Costco", Scope = "household" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.HouseholdItemsImported.Should().Be(1);

        var createdStore = _dbContext.ChangeTracker.Entries<Store>().Single().Entity;
        createdStore.HouseholdId.Should().Be(householdId);
        createdStore.UserId.Should().BeNull();
    }

    [Fact]
    public async Task Should_ReuseExistingStore_CaseInsensitive()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var existingStore = new Store { Id = Guid.NewGuid(), Name = "COSTCO", UserId = userId };
        _mockInventoryRepository.Setup(r => r.GetPersonalItems(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryItem>());
        _mockStoreRepository.Setup(r => r.GetPersonalStores(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Store> { existingStore });

        var items = new List<ImportInventoryItemRequest>
        {
            new() { Name = "Milk", DefaultStore = "costco", Scope = "personal" },
        };

        //== Act
        var result = await _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        result.PersonalItemsImported.Should().Be(1);

        //== No new stores should be created — existing "COSTCO" matches "costco"
        _dbContext.ChangeTracker.Entries<Store>().Should().HaveCount(0);
    }

    [Fact]
    public async Task Should_Reject_WhenOverRowLimit()
    {
        //== Arrange
        var userId = Guid.NewGuid();
        await SeedUser(userId);

        var items = Enumerable.Range(0, 501)
            .Select(i => new ImportInventoryItemRequest { Name = $"Item {i}", Scope = "personal" })
            .ToList();

        //== Act
        var act = () => _inventoryService.ImportInventoryItems(items, userId);

        //== Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*500*");
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests --filter "FullyQualifiedName~InventoryImportServiceTests"
```

Expected: compilation error — `ImportInventoryItems` doesn't exist yet, and `InventoryService` constructor doesn't accept `IStoreRepository`.

- [ ] **Step 4: Implement ImportInventoryItems**

First, update the `InventoryService` constructor to also accept `IStoreRepository`. In `backend/AGDevX.Cart.Services/InventoryService.cs`, change:

```csharp
public class InventoryService(IInventoryRepository inventoryRepository, CartDbContext dbContext, ITripItemRepository tripItemRepository) : IInventoryService
```

to:

```csharp
public class InventoryService(IInventoryRepository inventoryRepository, CartDbContext dbContext, ITripItemRepository tripItemRepository, IStoreRepository storeRepository) : IInventoryService
```

Add the using at the top:

```csharp
using AGDevX.Cart.Shared.DTOs;
```

Then add the `ImportInventoryItems` method to `InventoryService`:

```csharp
public async Task<ImportInventoryResult> ImportInventoryItems(IList<ImportInventoryItemRequest> items, Guid userId, CancellationToken cancellationToken = default)
{
    if (items.Count > 500)
    {
        throw new ArgumentException("Import cannot exceed 500 items");
    }

    var user = await GetUserOrThrow(userId, cancellationToken);
    var result = new ImportInventoryResult();

    //== Step 1: Validate and partition rows
    var validPersonalRows = new List<ImportInventoryItemRequest>();
    var validHouseholdRows = new List<ImportInventoryItemRequest>();

    foreach (var item in items)
    {
        var trimmedName = item.Name?.Trim() ?? "";
        var trimmedNotes = item.Notes?.Trim();
        var trimmedStore = item.DefaultStore?.Trim();
        var trimmedScope = item.Scope?.Trim().ToLowerInvariant() ?? "";

        if (string.IsNullOrWhiteSpace(trimmedName) || trimmedName.Length > 200
            || (trimmedNotes != null && trimmedNotes.Length > 500)
            || (trimmedStore != null && trimmedStore.Length > 100)
            || (trimmedScope != "personal" && trimmedScope != "household"))
        {
            result.InvalidRowsSkipped++;
            continue;
        }

        item.Name = trimmedName;
        item.Notes = trimmedNotes;
        item.DefaultStore = trimmedStore;
        item.Scope = trimmedScope;

        if (trimmedScope == "household")
        {
            if (!user.HouseholdId.HasValue)
            {
                result.HouseholdItemsSkipped++;
                continue;
            }
            validHouseholdRows.Add(item);
        }
        else
        {
            validPersonalRows.Add(item);
        }
    }

    //== Step 2: Fetch existing data for duplicate detection
    var existingPersonalItems = await inventoryRepository.GetPersonalItems(userId, cancellationToken);
    var existingPersonalStores = await storeRepository.GetPersonalStores(userId, cancellationToken);

    var existingHouseholdItems = user.HouseholdId.HasValue
        ? await inventoryRepository.GetHouseholdItems(user.HouseholdId.Value, cancellationToken)
        : Enumerable.Empty<InventoryItem>();
    var existingHouseholdStores = user.HouseholdId.HasValue
        ? await storeRepository.GetHouseholdStores(user.HouseholdId.Value, cancellationToken)
        : Enumerable.Empty<Store>();

    //== Build lookup sets for duplicate detection (existing + already-seen CSV names)
    var personalNamesSeen = new HashSet<string>(
        existingPersonalItems.Select(i => i.Name.ToLowerInvariant()));
    var householdNamesSeen = new HashSet<string>(
        existingHouseholdItems.Select(i => i.Name.ToLowerInvariant()));

    //== Build store lookup maps
    var personalStoreMap = existingPersonalStores
        .GroupBy(s => s.Name.ToLowerInvariant())
        .ToDictionary(g => g.Key, g => g.First().Id);
    var householdStoreMap = existingHouseholdStores
        .GroupBy(s => s.Name.ToLowerInvariant())
        .ToDictionary(g => g.Key, g => g.First().Id);

    //== Step 3: Process rows, resolve stores, deduplicate
    var itemsToCreate = new List<InventoryItem>();

    ProcessRows(validPersonalRows, personalNamesSeen, personalStoreMap, userId, null, itemsToCreate, result, isHousehold: false);

    if (user.HouseholdId.HasValue)
    {
        ProcessRows(validHouseholdRows, householdNamesSeen, householdStoreMap, userId, user.HouseholdId.Value, itemsToCreate, result, isHousehold: true);
    }

    //== Step 4: Bulk create
    if (itemsToCreate.Count > 0)
    {
        dbContext.InventoryItems.AddRange(itemsToCreate);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    return result;
}

private void ProcessRows(
    List<ImportInventoryItemRequest> rows,
    HashSet<string> namesSeen,
    Dictionary<string, Guid> storeMap,
    Guid userId,
    Guid? householdId,
    List<InventoryItem> itemsToCreate,
    ImportInventoryResult result,
    bool isHousehold)
{
    foreach (var row in rows)
    {
        var lowerName = row.Name.ToLowerInvariant();

        if (!namesSeen.Add(lowerName))
        {
            result.DuplicatesSkipped++;
            continue;
        }

        //== Resolve default store
        Guid? storeId = null;

        if (!string.IsNullOrWhiteSpace(row.DefaultStore))
        {
            var lowerStore = row.DefaultStore.ToLowerInvariant();

            if (storeMap.TryGetValue(lowerStore, out var existingStoreId))
            {
                storeId = existingStoreId;
            }
            else
            {
                //== Auto-create store
                var newStore = new Store
                {
                    Id = Guid.NewGuid(),
                    Name = row.DefaultStore,
                    UserId = isHousehold ? null : userId,
                    HouseholdId = householdId,
                };
                dbContext.Stores.Add(newStore);
                storeMap[lowerStore] = newStore.Id;
                storeId = newStore.Id;
            }
        }

        var inventoryItem = new InventoryItem
        {
            Name = row.Name,
            Notes = string.IsNullOrWhiteSpace(row.Notes) ? null : row.Notes,
            DefaultStoreId = storeId,
            OwnerUserId = isHousehold ? null : userId,
            HouseholdId = householdId,
        };

        itemsToCreate.Add(inventoryItem);

        if (isHousehold)
        {
            result.HouseholdItemsImported++;
        }
        else
        {
            result.PersonalItemsImported++;
        }
    }
}
```

- [ ] **Step 5: Update existing InventoryServiceTests constructor**

The existing `InventoryServiceTests` also needs to pass `IStoreRepository` to the updated constructor. In `backend/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs`, update the constructor:

Add a field:
```csharp
private readonly Mock<IStoreRepository> _mockStoreRepository;
```

In the constructor, add:
```csharp
_mockStoreRepository = new Mock<IStoreRepository>();
```

Update the `InventoryService` instantiation:
```csharp
_inventoryService = new InventoryService(_mockInventoryRepository.Object, _dbContext, _mockTripItemRepository.Object, _mockStoreRepository.Object);
```

- [ ] **Step 6: Run all service tests**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Services.Tests
```

Expected: all tests pass (both existing and new).

- [ ] **Step 7: Commit**

```bash
git add backend/AGDevX.Cart.Services/ backend/AGDevX.Cart.Services.Tests/
git commit -m "feat: implement ImportInventoryItems service method with tests"
```

---

## Task 6: Backend Import Controller Endpoint

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs`
- Modify: `backend/AGDevX.Cart.Api.Tests/Controllers/InventoryControllerTests.cs`

- [ ] **Step 1: Check existing controller test patterns**

Read `backend/AGDevX.Cart.Api.Tests/Controllers/InventoryControllerTests.cs` to see how controller tests are structured (mock setup, `ClaimsPrincipal` injection, etc.).

- [ ] **Step 2: Add the Import action to InventoryController**

In `backend/AGDevX.Cart.Api/Controllers/InventoryController.cs`, add after the `Create` action:

```csharp
//== Import inventory items from CSV data
[HttpPost("import")]
public async Task<IActionResult> Import([FromBody] IList<ImportInventoryItemRequest> items, CancellationToken cancellationToken = default)
{
    try
    {
        var userId = User.GetUserId();
        var result = await inventoryService.ImportInventoryItems(items, userId, cancellationToken);
        return Ok(result);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { errorCode = "BAD_REQUEST", message = ex.Message });
    }
}
```

Add the using at the top if not already present:
```csharp
using AGDevX.Cart.Shared.DTOs;
```

- [ ] **Step 3: Write controller tests**

Add to `backend/AGDevX.Cart.Api.Tests/Controllers/InventoryControllerTests.cs`:

```csharp
[Fact]
public async Task Should_ReturnOk_When_ImportSucceeds()
{
    // Arrange
    var mockService = new Mock<IInventoryService>();
    var controller = new InventoryController(mockService.Object);
    var userId = Guid.NewGuid();

    var user = new ClaimsPrincipal(new ClaimsIdentity([
        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
    ]));

    controller.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext { User = user }
    };

    var importResult = new ImportInventoryResult
    {
        PersonalItemsImported = 3,
        HouseholdItemsImported = 0,
        DuplicatesSkipped = 1,
        HouseholdItemsSkipped = 0,
        InvalidRowsSkipped = 0,
    };

    var items = new List<ImportInventoryItemRequest>
    {
        new() { Name = "Milk", Scope = "personal" },
    };

    mockService.Setup(s => s.ImportInventoryItems(It.IsAny<IList<ImportInventoryItemRequest>>(), userId, It.IsAny<CancellationToken>()))
               .ReturnsAsync(importResult);

    // Act
    var result = await controller.Import(items);

    // Assert
    var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
    okResult.Value.Should().BeEquivalentTo(importResult);
}

[Fact]
public async Task Should_ReturnBadRequest_When_ImportExceedsLimit()
{
    // Arrange
    var mockService = new Mock<IInventoryService>();
    var controller = new InventoryController(mockService.Object);
    var userId = Guid.NewGuid();

    var user = new ClaimsPrincipal(new ClaimsIdentity([
        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
    ]));

    controller.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext { User = user }
    };

    var items = Enumerable.Range(0, 501)
        .Select(i => new ImportInventoryItemRequest { Name = $"Item {i}", Scope = "personal" })
        .ToList();

    mockService.Setup(s => s.ImportInventoryItems(It.IsAny<IList<ImportInventoryItemRequest>>(), userId, It.IsAny<CancellationToken>()))
               .ThrowsAsync(new ArgumentException("Import cannot exceed 500 items"));

    // Act
    var result = await controller.Import(items);

    // Assert
    result.Should().BeOfType<BadRequestObjectResult>();
}

[Fact]
public async Task Should_ReturnUnauthorized_When_ImportUserNotFound()
{
    // Arrange
    var mockService = new Mock<IInventoryService>();
    var controller = new InventoryController(mockService.Object);
    var userId = Guid.NewGuid();

    var user = new ClaimsPrincipal(new ClaimsIdentity([
        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
    ]));

    controller.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext { User = user }
    };

    var items = new List<ImportInventoryItemRequest>
    {
        new() { Name = "Milk", Scope = "personal" },
    };

    mockService.Setup(s => s.ImportInventoryItems(It.IsAny<IList<ImportInventoryItemRequest>>(), userId, It.IsAny<CancellationToken>()))
               .ThrowsAsync(new UnauthorizedAccessException("User not found"));

    // Act
    var result = await controller.Import(items);

    // Assert
    result.Should().BeOfType<UnauthorizedObjectResult>();
}
```

- [ ] **Step 4: Run all API tests**

Run from `backend/`:
```bash
dotnet test AGDevX.Cart.Api.Tests
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Api/ backend/AGDevX.Cart.Api.Tests/
git commit -m "feat: add POST /api/v1/inventory/import endpoint"
```

---

## Task 7: Update DI Registration

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs`

The `InventoryService` constructor now requires `IStoreRepository`. Since `IStoreRepository` is already registered in DI (it's used by `StoreService`), no new registration is needed — the DI container already resolves it. But verify this works.

- [ ] **Step 1: Verify the full backend builds and all tests pass**

Run from `backend/`:
```bash
dotnet build
dotnet test
```

Expected: all pass. If `InventoryService` can't resolve `IStoreRepository`, a runtime error would occur — verify by checking that `IStoreRepository` is already in `Program.cs`:
```csharp
builder.Services.AddScoped<IStoreRepository, StoreRepository>();
```

- [ ] **Step 2: Commit (if any changes were needed)**

Only commit if changes were required. If DI already resolves correctly, move on.

---

## Task 8: Frontend CSV Parser Utility

**Files:**
- Create: `frontend/src/utils/csv-parser.ts`
- Create: `frontend/src/utils/tests/csv-parser.test.ts`

- [ ] **Step 1: Write failing tests for CSV parser**

Create `frontend/src/utils/tests/csv-parser.test.ts`:

```ts
// ABOUTME: Tests for the CSV parser utility
// ABOUTME: Validates RFC 4180 parsing, BOM handling, encoding fallback, and edge cases

import { describe, expect, it } from 'vitest'

import { parseCsv } from '../csv-parser'

/*
 * readFileWithEncodingFallback is not unit-tested here because it depends on
 * the browser FileReader API. It should be verified via manual testing with
 * Excel-exported CSVs in both "CSV UTF-8" and plain "CSV" formats.
 */

describe('parseCsv', () => {
  it('should parse simple CSV rows', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk,,Costco,personal\nBread,Whole wheat,Target,household'
    const rows = parseCsv(csv)
    expect(rows).toEqual([
      ['Milk', '', 'Costco', 'personal'],
      ['Bread', 'Whole wheat', 'Target', 'household'],
    ])
  })

  it('should skip the header row', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk,,,'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('should handle quoted fields with commas', () => {
    const csv = 'Name,Notes,Store,Scope\n"Chicken, Boneless",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Chicken, Boneless')
  })

  it('should handle escaped double quotes', () => {
    const csv = 'Name,Notes,Store,Scope\n"Item ""A""",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Item "A"')
  })

  it('should handle CRLF line endings', () => {
    const csv = 'Name,Notes,Store,Scope\r\nMilk,,,personal\r\nBread,,,household'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('should strip BOM', () => {
    const csv = '\uFEFFName,Notes,Store,Scope\nMilk,,,personal'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('Milk')
  })

  it('should skip entirely empty rows', () => {
    const csv = 'Name,Notes,Store,Scope\n\nMilk,,,personal\n  \n,,,\nBread,,,personal'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('should pad rows with fewer than 4 columns', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk'
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual(['Milk', '', '', ''])
  })

  it('should ignore extra columns beyond 4', () => {
    const csv = 'Name,Notes,Store,Scope,Extra\nMilk,,,personal,ignored'
    const rows = parseCsv(csv)
    expect(rows[0]).toHaveLength(4)
  })

  it('should trim whitespace from values', () => {
    const csv = 'Name,Notes,Store,Scope\n  Milk , some notes , Costco , personal '
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual(['Milk', 'some notes', 'Costco', 'personal'])
  })

  it('should handle quoted fields with newlines', () => {
    const csv = 'Name,Notes,Store,Scope\n"Multi\nLine",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Multi\nLine')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/utils/tests/csv-parser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the CSV parser**

Create `frontend/src/utils/csv-parser.ts`:

```ts
// ABOUTME: RFC 4180 compliant CSV parser with BOM handling and encoding fallback
// ABOUTME: Parses CSV text into rows of trimmed string arrays, skipping header and empty rows

const COLUMN_COUNT = 4

/**
 * Reads a File as text, trying UTF-8 first.
 * If the result contains the Unicode replacement character (U+FFFD), re-reads as Windows-1252.
 */
export const readFileWithEncodingFallback = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const text = reader.result as string

      if (text.includes('\uFFFD')) {
        const fallbackReader = new FileReader()

        fallbackReader.onload = () => {
          resolve(fallbackReader.result as string)
        }

        fallbackReader.onerror = () => reject(fallbackReader.error)
        fallbackReader.readAsText(file, 'windows-1252')
      } else {
        resolve(text)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * Parses CSV text into an array of string arrays.
 * Skips the header row and empty rows. Pads short rows, truncates long rows to COLUMN_COUNT.
 */
export const parseCsv = (text: string): string[][] => {
  const stripped = text.replace(/^\uFEFF/, '')
  const rows = parseRfc4180(stripped)

  if (rows.length === 0) {
    return []
  }

  //== Skip header row
  const dataRows = rows.slice(1)

  return dataRows
    .filter((row) => !isEmptyRow(row))
    .map((row) => {
      //== Pad short rows, truncate long rows
      const padded = [...row, ...Array(Math.max(0, COLUMN_COUNT - row.length)).fill('')]
      return padded.slice(0, COLUMN_COUNT).map((cell) => cell.trim())
    })
}

const isEmptyRow = (row: string[]): boolean => {
  return row.every((cell) => cell.trim() === '')
}

/**
 * RFC 4180 parser that handles quoted fields, embedded commas, embedded newlines, and escaped quotes.
 */
const parseRfc4180 = (text: string): string[][] => {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        current.push(field)
        field = ''
        i++
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else if (char === '\n') {
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else {
        field += char
        i++
      }
    }
  }

  //== Push last field/row
  if (field !== '' || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  return rows
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`:
```bash
npx vitest run src/utils/tests/csv-parser.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/csv-parser.ts frontend/src/utils/tests/csv-parser.test.ts
git commit -m "feat: add RFC 4180 CSV parser with encoding fallback"
```

---

## Task 9: Frontend Import Mutation Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/inventory/import-inventory.mutation.ts`

- [ ] **Step 1: Create the mutation hook**

Create `frontend/src/apis/agdevx-cart-api/inventory/import-inventory.mutation.ts`:

```ts
// ABOUTME: TanStack Query mutation hook for bulk importing inventory items from CSV
// ABOUTME: Sends parsed CSV rows to POST /api/v1/inventory/import, invalidates inventory and store caches

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface ImportInventoryItemRequest {
  name: string
  notes: string | null
  defaultStore: string | null
  scope: string
}

export interface ImportInventoryResult {
  personalItemsImported: number
  householdItemsImported: number
  duplicatesSkipped: number
  householdItemsSkipped: number
  invalidRowsSkipped: number
}

export const useImportInventoryMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['inventory', 'import'],
    mutationFn: async (items: ImportInventoryItemRequest[]): Promise<ImportInventoryResult> => {
      const response = await apiFetch('/api/v1/inventory/import', {
        method: 'POST',
        body: JSON.stringify(items),
      })
      return response.json() as Promise<ImportInventoryResult>
    },
    meta: { handlesErrors: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
```

Note: `meta: { handlesErrors: true }` opts out of the global error toast so the component can handle errors inline.

- [ ] **Step 2: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/inventory/import-inventory.mutation.ts
git commit -m "feat: add useImportInventoryMutation hook"
```

---

## Task 10: Frontend Pantry Settings Section

**Files:**
- Create: `frontend/src/pages/settings/pantry-section.tsx`
- Create: `frontend/src/pages/settings/tests/pantry-section.test.tsx`
- Modify: `frontend/src/pages/settings/settings-page.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/settings/tests/pantry-section.test.tsx`:

```tsx
// ABOUTME: Tests for PantrySection settings component
// ABOUTME: Verifies CSV template download, file selection, import flow, and toast messaging

import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useImportInventoryMutation } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'
import type { ImportInventoryResult } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'

import { PantrySection } from '../pantry-section'

vi.mock('@/apis/agdevx-cart-api/inventory/import-inventory.mutation')

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('PantrySection', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useImportInventoryMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useImportInventoryMutation>)
  })

  it('should render the section header and description', () => {
    render(createElement(PantrySection), { wrapper })
    expect(screen.getByText('Pantry')).toBeInTheDocument()
    expect(screen.getByText('Import Items')).toBeInTheDocument()
    expect(screen.getByText('Add pantry items in bulk from a CSV file')).toBeInTheDocument()
  })

  it('should render download template link', () => {
    render(createElement(PantrySection), { wrapper })
    expect(screen.getByText('Download Template')).toBeInTheDocument()
  })

  it('should disable import button when no file selected', () => {
    render(createElement(PantrySection), { wrapper })
    const importButton = screen.getByRole('button', { name: /import/i })
    expect(importButton).toBeDisabled()
  })

  it('should show spinner when import is pending', () => {
    vi.mocked(useImportInventoryMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useImportInventoryMutation>)

    render(createElement(PantrySection), { wrapper })
    expect(screen.getByRole('button', { name: /import/i })).toBeDisabled()
  })

  it('should enable import button after file selection', async () => {
    render(createElement(PantrySection), { wrapper })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Name,Notes,Store,Scope\nMilk,,,personal'], 'test.csv', { type: 'text/csv' })

    await userEvent.upload(fileInput, csvFile)

    expect(screen.getByRole('button', { name: /import/i })).toBeEnabled()
    expect(screen.getByText('test.csv')).toBeInTheDocument()
  })

  it('should call mutate with parsed CSV data on import', async () => {
    render(createElement(PantrySection), { wrapper })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Name,Notes,Store,Scope\nMilk,,Costco,personal'], 'test.csv', { type: 'text/csv' })

    await userEvent.upload(fileInput, csvFile)
    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      [{ name: 'Milk', notes: null, defaultStore: 'Costco', scope: 'personal' }],
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/pages/settings/tests/pantry-section.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PantrySection component**

Create `frontend/src/pages/settings/pantry-section.tsx`:

```tsx
// ABOUTME: Pantry section in Settings for CSV import of inventory items
// ABOUTME: Compact card layout with template download, file picker, and import button

import { useRef, useState } from 'react'

import { FileText } from 'lucide-react'
import { toast } from 'sonner'

import type { ImportInventoryResult } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'
import { useImportInventoryMutation } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'
import { Spinner } from '@/shared/spinner'
import { parseCsv, readFileWithEncodingFallback } from '@/utils/csv-parser'

const CSV_TEMPLATE = `Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,`

const MAX_ROWS = 500

const showResultToasts = (result: ImportInventoryResult) => {
  const { personalItemsImported, householdItemsImported, duplicatesSkipped, householdItemsSkipped, invalidRowsSkipped } = result
  const totalImported = personalItemsImported + householdItemsImported

  //== Success toast
  if (totalImported > 0) {
    if (personalItemsImported > 0 && householdItemsImported > 0) {
      toast.success(`Imported ${personalItemsImported} personal items and ${householdItemsImported} household items`)
    } else {
      toast.success(`Imported ${totalImported} items`)
    }
  }

  //== Household skip toast
  if (householdItemsSkipped > 0) {
    toast.warning('Since you are not in a household, we could not import those items')
  }

  //== Validation/duplicate skip toast
  if (duplicatesSkipped > 0 && invalidRowsSkipped > 0) {
    toast.warning(`${duplicatesSkipped} duplicate and ${invalidRowsSkipped} invalid items were skipped`)
  } else if (duplicatesSkipped > 0) {
    toast.warning(`${duplicatesSkipped} duplicate items were skipped`)
  } else if (invalidRowsSkipped > 0) {
    toast.warning(`${invalidRowsSkipped} invalid items were skipped`)
  }
}

export const PantrySection = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportInventoryMutation()

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pantry-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      const text = await readFileWithEncodingFallback(selectedFile)
      const rows = parseCsv(text)

      if (rows.length === 0) {
        toast.error('No items found in CSV')
        return
      }

      if (rows.length > MAX_ROWS) {
        toast.error('CSV exceeds the 500 row limit')
        return
      }

      const items = rows.map(([name, notes, defaultStore, scope]) => ({
        name,
        notes: notes || null,
        defaultStore: defaultStore || null,
        scope: scope.toLowerCase() || 'personal',
      }))

      importMutation.mutate(items, {
        onSuccess: (result) => {
          showResultToasts(result)
          setSelectedFile(null)

          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        },
        onError: () => {
          toast.error('Import failed. Please try again.')
        },
      })
    } catch {
      toast.error('Could not read the file')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Pantry</span>
      </div>

      <div className="rounded-xl bg-surface overflow-hidden">
        <div className="px-4 py-3">
          <div className="text-xs text-text-tertiary">Import Items</div>
          <div className="text-sm text-navy-soft mt-0.5">Add pantry items in bulk from a CSV file</div>
        </div>

        <div className="border-t border-bg px-4 py-3">
          <div className="flex gap-2 items-center min-w-0">
            <button
              onClick={handleDownloadTemplate}
              className="text-xs font-semibold text-teal hover:text-teal-light transition-colors whitespace-nowrap flex-shrink-0"
            >
              Download Template
            </button>

            <span className="text-bg-warm flex-shrink-0">|</span>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-xs cursor-pointer flex items-center gap-1.5 ${
                selectedFile
                  ? 'border-teal/30 bg-teal/[0.04] text-navy-soft'
                  : 'border-navy/10 bg-surface text-text-tertiary'
              }`}
            >
              {selectedFile && <FileText className="w-3 h-3 text-teal flex-shrink-0" />}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button
            onClick={() => void handleImport()}
            disabled={!selectedFile || importMutation.isPending}
            aria-label="Import"
            className="mt-2.5 w-full flex items-center justify-center py-2 bg-teal text-white rounded-lg text-xs font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
          >
            {importMutation.isPending ? <Spinner /> : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add PantrySection to SettingsPage**

In `frontend/src/pages/settings/settings-page.tsx`, add the import:

```ts
import { PantrySection } from './pantry-section'
```

Add the component after `SecuritySection` and before the Logout button:

```tsx
<PantrySection />
```

- [ ] **Step 5: Run tests**

Run from `frontend/`:
```bash
npx vitest run src/pages/settings/tests/pantry-section.test.tsx
npx vitest run
```

Expected: all pass.

- [ ] **Step 6: Run TypeScript check and lint**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
npx eslint src/pages/settings/pantry-section.tsx src/pages/settings/settings-page.tsx
```

Fix any import sorting issues with `npx eslint --fix`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/settings/pantry-section.tsx frontend/src/pages/settings/tests/pantry-section.test.tsx frontend/src/pages/settings/settings-page.tsx
git commit -m "feat: add Pantry section to Settings with CSV import UI"
```

---

## Task 11: Update STATUS.md

**Files:**
- Modify: `.claude/STATUS.md`

- [ ] **Step 1: Update STATUS.md**

- Move "Seed pantry items", "CSV Import (Stores & Items)", "Database Index Review", and "NuGet Package Updates" from Planned to Completed
- Update test health counts after running full suites
- Set "Last Updated" date
- Add planning doc link pointing to `docs/active/2026-04-06-csv-pantry-import.md`

- [ ] **Step 2: Move planning doc to archive**

```bash
mv docs/active/2026-04-06-csv-pantry-import.md docs/archive/2026-04-06-csv-pantry-import.md
mv docs/active/2026-04-06-csv-pantry-import-plan.md docs/archive/2026-04-06-csv-pantry-import-plan.md
```

Update the STATUS.md links to point to `../docs/archive/`.

- [ ] **Step 3: Commit**

```bash
git add .claude/STATUS.md docs/
git commit -m "docs: mark CSV import, package updates, and index review as completed"
```
