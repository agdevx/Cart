# Single Household Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from multi-household (many-to-many join table) to single-household (nullable FK on User) architecture, add trip scoping, and simplify the frontend UX.

**Architecture:** Schema-first migration — update data models and DB schema, then services/repositories, then controllers/API, then frontend. Fresh DB (delete all migrations + SQLite file, generate clean initial migration).

**Tech Stack:** .NET 10, EF Core (SQLite), React 19, TypeScript, TanStack Query, Jotai, Tailwind CSS 4, Vitest + React Testing Library

**Spec:** `docs/active/2026-03-30-single-household.md`

---

## Phase 1: Data Model & Schema

### Task 1: Update BaseEntity audit fields

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/BaseEntity.cs`
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs` (SaveChangesAsync)

- [ ] **Step 1: Update BaseEntity model**

Change `CreatedBy` and `ModifiedBy` from `string?` to `Guid`:

```csharp
// ABOUTME: Base class for all database entities with common audit fields
// ABOUTME: Provides Id, CreatedBy, CreatedDate, ModifiedBy, and ModifiedDate properties
namespace AGDevX.Cart.Data.Models;

public abstract class BaseEntity
{
    public Guid Id { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public Guid ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
```

- [ ] **Step 2: Update SaveChangesAsync in CartDbContext**

Change the audit field population to use `Guid` parsing instead of string:

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var userIdClaim = httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var now = DateTime.UtcNow;

    foreach (var entry in ChangeTracker.Entries<BaseEntity>())
    {
        if (entry.State == EntityState.Added)
        {
            /*
             * For self-referencing entities (e.g., User registration), CreatedBy may already
             * be set to the entity's own Id before SaveChanges. Only overwrite if it's empty.
             */
            if (entry.Entity.CreatedBy == Guid.Empty && userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                entry.Entity.CreatedBy = parsedUserId;
                entry.Entity.ModifiedBy = parsedUserId;
            }

            entry.Entity.CreatedDate = now;
            entry.Entity.ModifiedDate = now;
        }
        else if (entry.State == EntityState.Modified)
        {
            if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedModifiedBy))
            {
                entry.Entity.ModifiedBy = parsedModifiedBy;
            }

            entry.Entity.ModifiedDate = now;
        }
    }

    return await base.SaveChangesAsync(cancellationToken);
}
```

- [ ] **Step 3: Update AuthService registration to self-reference audit fields**

In `backend/AGDevX.Cart.Auth/AuthService.cs`, the `Register` method creates a new User without an authenticated context. Set the audit fields to self-reference:

```csharp
var user = new User
{
    Id = Guid.NewGuid(),
    Email = request.Email,
    PasswordHash = passwordHash,
    Name = request.Name
};

//== Self-reference: user is their own creator during registration
user.CreatedBy = user.Id;
user.ModifiedBy = user.Id;

context.Users.Add(user);
await context.SaveChangesAsync(cancellationToken);
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && dotnet build`
Expected: Build may have errors from downstream code still using string CreatedBy — that's expected, we'll fix those in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/BaseEntity.cs backend/AGDevX.Cart.Data/CartDbContext.cs backend/AGDevX.Cart.Auth/AuthService.cs
git commit -m "refactor: change BaseEntity audit fields from string to Guid FK"
```

---

### Task 2: Update User model

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/User.cs`

- [ ] **Step 1: Add HouseholdId FK to User**

```csharp
// ABOUTME: User entity representing an authenticated user account
// ABOUTME: Contains authentication details and nullable household membership FK
using System.Text.Json.Serialization;

namespace AGDevX.Cart.Data.Models;

public class User : BaseEntity
{
    public string? Email { get; set; }

    [JsonIgnore]
    public string? PasswordHash { get; set; }
    public string? Name { get; set; }

    //== Household this user belongs to (null = solo user, no household)
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
```

Note: The old `HouseholdMemberships` navigation collection is removed.

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/User.cs
git commit -m "refactor: replace User.HouseholdMemberships with nullable HouseholdId FK"
```

---

### Task 3: Update Household model

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/Household.cs`

- [ ] **Step 1: Update Household with owner FKs, required Name, remove Members collection**

```csharp
// ABOUTME: Household entity representing a shared shopping group
// ABOUTME: Supports two equal co-owners via Owner1UserId and Owner2UserId
namespace AGDevX.Cart.Data.Models;

public class Household : BaseEntity
{
    public required string Name { get; set; }
    public string InviteCode { get; set; } = string.Empty;

    //== Primary owner — required, always populated
    public Guid Owner1UserId { get; set; }
    public User? Owner1User { get; set; }

    //== Secondary owner — optional, equal permissions to Owner1
    public Guid? Owner2UserId { get; set; }
    public User? Owner2User { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/Household.cs
git commit -m "refactor: add Owner1/Owner2 FKs to Household, make Name required"
```

---

### Task 4: Delete HouseholdMember and TripCollaborator models

**Files:**
- Delete: `backend/AGDevX.Cart.Data/Models/HouseholdMember.cs`
- Delete: `backend/AGDevX.Cart.Data/Models/TripCollaborator.cs`

- [ ] **Step 1: Delete both files**

Delete `backend/AGDevX.Cart.Data/Models/HouseholdMember.cs` and `backend/AGDevX.Cart.Data/Models/TripCollaborator.cs`.

- [ ] **Step 2: Commit**

```bash
git add -u backend/AGDevX.Cart.Data/Models/HouseholdMember.cs backend/AGDevX.Cart.Data/Models/TripCollaborator.cs
git commit -m "refactor: delete HouseholdMember and TripCollaborator join tables"
```

---

### Task 5: Update Trip model

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/Trip.cs`

- [ ] **Step 1: Add HouseholdId FK, remove Collaborators collection**

```csharp
// ABOUTME: Represents a discrete shopping session or trip
// ABOUTME: Can be personal (HouseholdId null) or household-scoped (visible to all members)
namespace AGDevX.Cart.Data.Models;

public class Trip : BaseEntity
{
    //== Name of the trip (e.g., "Weekly Grocery Run")
    public required string Name { get; set; }

    //== Whether the trip has been completed
    public bool IsCompleted { get; set; }

    //== When the trip was marked as completed
    public DateTime? CompletedAt { get; set; }

    //== Whether the trip has been started (moved from planning to active)
    public bool IsStarted { get; set; }

    //== When the trip was started
    public DateTime? StartedAt { get; set; }

    //== User-facing date for the trip (e.g., "when is this trip")
    public DateOnly? TripDate { get; set; }

    //== Household scope — null means personal trip (creator only), set means visible to all household members
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    //== Items to purchase on this trip
    public ICollection<TripItem> Items { get; set; } = [];
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/Trip.cs
git commit -m "refactor: add HouseholdId FK to Trip, remove Collaborators"
```

---

### Task 6: Update TripItem model

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/TripItem.cs`

- [ ] **Step 1: Add IsHouseholdItem denormalized flag**

```csharp
// ABOUTME: Links inventory items to specific trips with shopping details
// ABOUTME: Tracks quantity, store preference, notes, checked status, and scope snapshot
namespace AGDevX.Cart.Data.Models;

public class TripItem : BaseEntity
{
    //== Trip this item belongs to
    public required Guid TripId { get; set; }
    public Trip? Trip { get; set; }

    //== Inventory item being purchased (nullable for SET NULL on delete)
    public Guid? InventoryItemId { get; set; }
    public InventoryItem? InventoryItem { get; set; }

    //== Denormalized item name from InventoryItem for display after deletion
    public required string ItemName { get; set; }

    //== Denormalized store name from Store for display after deletion
    public string? StoreName { get; set; }

    //== Quantity to purchase
    public int Quantity { get; set; }

    //== Optional preferred store for this item
    public Guid? StoreId { get; set; }
    public Store? Store { get; set; }

    //== Additional notes or details for this item
    public string? Notes { get; set; }

    //== Whether this item has been checked off the list
    public bool IsChecked { get; set; }

    //== When the item was checked off
    public DateTime? CheckedAt { get; set; }

    //== Scope snapshot: true if the source InventoryItem was household-scoped when added.
    //== Used for visibility filtering on household trips — personal items are only
    //== visible to the user who added them (CreatedBy). This denormalization ensures
    //== correct visibility even if the source InventoryItem is later deleted.
    public bool IsHouseholdItem { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/TripItem.cs
git commit -m "feat: add IsHouseholdItem scope snapshot to TripItem"
```

---

### Task 7: Update UserPreferences model

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/UserPreferences.cs`

- [ ] **Step 1: Add ShowHouseholdPage field**

```csharp
// ABOUTME: Entity model for per-user preferences including default landing page and location data.
// ABOUTME: Has a one-to-one relationship with User (cascade delete, unique index on UserId).

namespace AGDevX.Cart.Data.Models;

public class UserPreferences : BaseEntity
{
    public Guid UserId { get; set; }

    public string? DefaultPage { get; set; }

    //== Controls whether the Household tab appears in the bottom nav
    public bool ShowHouseholdPage { get; set; } = true;

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }

    public bool ShowWeatherIcons { get; set; } = true;

    public bool ShowWeatherTemps { get; set; } = true;

    public User User { get; set; } = null!;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Data/Models/UserPreferences.cs
git commit -m "feat: add ShowHouseholdPage to UserPreferences"
```

---

### Task 8: Update CartDbContext entity configuration

**Files:**
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs`

- [ ] **Step 1: Rewrite OnModelCreating for new schema**

Remove `HouseholdMember` and `TripCollaborator` configurations. Add `User`, `Household`, `Trip`, and `BaseEntity` audit FK configurations. Full replacement of the `OnModelCreating` method:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    //== Configure User
    modelBuilder.Entity<User>(entity =>
    {
        entity.HasIndex(u => u.Email).IsUnique();
        entity.Property(u => u.Name).HasMaxLength(64);
        entity.Property(u => u.Email).HasMaxLength(254);
        entity.Property(u => u.PasswordHash).HasMaxLength(256);
        entity.HasIndex(u => u.HouseholdId);

        entity.HasOne(u => u.Household)
              .WithMany()
              .HasForeignKey(u => u.HouseholdId)
              .OnDelete(DeleteBehavior.SetNull);
    });

    //== Configure Household
    modelBuilder.Entity<Household>(entity =>
    {
        entity.Property(h => h.Name).IsRequired().HasMaxLength(100);
        entity.Property(h => h.InviteCode).HasMaxLength(8);
        entity.HasIndex(h => h.InviteCode).IsUnique();
        entity.HasIndex(h => h.Owner1UserId);
        entity.HasIndex(h => h.Owner2UserId);

        entity.HasOne(h => h.Owner1User)
              .WithMany()
              .HasForeignKey(h => h.Owner1UserId)
              .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(h => h.Owner2User)
              .WithMany()
              .HasForeignKey(h => h.Owner2UserId)
              .OnDelete(DeleteBehavior.Restrict);
    });

    //== Configure Trip
    modelBuilder.Entity<Trip>(entity =>
    {
        entity.HasIndex(t => t.HouseholdId);
        entity.HasIndex(t => t.CreatedBy);

        entity.HasOne(t => t.Household)
              .WithMany()
              .HasForeignKey(t => t.HouseholdId)
              .OnDelete(DeleteBehavior.Cascade);
    });

    //== InventoryItem FK behaviors
    modelBuilder.Entity<InventoryItem>(entity =>
    {
        entity.HasIndex(i => i.HouseholdId);
        entity.HasIndex(i => i.OwnerUserId);

        //== Cascade delete inventory items when household is deleted
        entity.HasOne(i => i.Household)
              .WithMany()
              .HasForeignKey(i => i.HouseholdId)
              .OnDelete(DeleteBehavior.Cascade);

        //== SET NULL on DefaultStore delete so items survive store removal
        entity.HasOne(i => i.DefaultStore)
              .WithMany()
              .HasForeignKey(i => i.DefaultStoreId)
              .OnDelete(DeleteBehavior.SetNull);

        //== Restrict delete on OwnerUser — user deletion is blocked
        entity.HasOne(i => i.OwnerUser)
              .WithMany()
              .HasForeignKey(i => i.OwnerUserId)
              .OnDelete(DeleteBehavior.Restrict);
    });

    //== TripItem FK behaviors
    modelBuilder.Entity<TripItem>(entity =>
    {
        entity.HasIndex(ti => ti.TripId);
        entity.HasIndex(ti => ti.InventoryItemId);
        entity.HasIndex(ti => ti.StoreId);

        //== SET NULL on InventoryItem delete so trip items survive pantry cleanup
        entity.HasOne(ti => ti.InventoryItem)
              .WithMany()
              .HasForeignKey(ti => ti.InventoryItemId)
              .OnDelete(DeleteBehavior.SetNull);

        //== SET NULL on Store delete so trip items survive store removal
        entity.HasOne(ti => ti.Store)
              .WithMany()
              .HasForeignKey(ti => ti.StoreId)
              .OnDelete(DeleteBehavior.SetNull);
    });

    //== Store FK behaviors
    modelBuilder.Entity<Store>(entity =>
    {
        entity.HasIndex(s => s.HouseholdId);
        entity.HasIndex(s => s.UserId);
        entity.HasIndex(s => new { s.Name, s.HouseholdId });
        entity.HasIndex(s => new { s.Name, s.UserId });

        //== Cascade delete stores when household is deleted
        entity.HasOne(s => s.Household)
              .WithMany()
              .HasForeignKey(s => s.HouseholdId)
              .OnDelete(DeleteBehavior.Cascade);

        //== Restrict delete on User — user deletion is blocked
        entity.HasOne(s => s.User)
              .WithMany()
              .HasForeignKey(s => s.UserId)
              .OnDelete(DeleteBehavior.Restrict);
    });

    //== UserPreferences: one-to-one with User, cascade delete
    modelBuilder.Entity<UserPreferences>(entity =>
    {
        entity.HasIndex(e => e.UserId).IsUnique();

        entity.HasOne(e => e.User)
              .WithOne()
              .HasForeignKey<UserPreferences>(e => e.UserId)
              .OnDelete(DeleteBehavior.Cascade);
    });
}
```

- [ ] **Step 2: Remove HouseholdMembers and TripCollaborators DbSets**

In the DbSets section at the top of `CartDbContext`, remove:
```csharp
public DbSet<HouseholdMember> HouseholdMembers { get; set; }
public DbSet<TripCollaborator> TripCollaborators { get; set; }
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && dotnet build`
Expected: Will likely have compile errors in repositories/services that reference deleted types — expected, fixed in Phase 2.

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Data/CartDbContext.cs
git commit -m "refactor: update CartDbContext for single-household schema"
```

---

### Task 9: Delete old migrations and DB, generate fresh migration

**Files:**
- Delete: all files in `backend/AGDevX.Cart.Data/Migrations/`
- Delete: `backend/AGDevX.Cart.Api/cart.db` (if it exists)

- [ ] **Step 1: Delete all migration files**

```bash
rm -rf backend/AGDevX.Cart.Data/Migrations/*
```

- [ ] **Step 2: Delete the SQLite database file**

```bash
rm -f backend/AGDevX.Cart.Api/cart.db
```

- [ ] **Step 3: Generate fresh initial migration**

Note: This step must wait until the full solution compiles (after Phase 2 repository/service changes). Mark this step as blocked until Phase 2 compiles.

```bash
cd backend && dotnet ef migrations add InitialCreate --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 4: Commit**

```bash
git add -A backend/AGDevX.Cart.Data/Migrations/ backend/AGDevX.Cart.Api/cart.db
git commit -m "refactor: fresh DB schema migration for single-household architecture"
```

---

### Task 10: Update DTOs

**Files:**
- Modify: `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateUserPreferencesRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UserPreferencesResponse.cs`
- Delete: `backend/AGDevX.Cart.Shared/DTOs/AddCollaboratorRequest.cs`
- Delete: `backend/AGDevX.Cart.Shared/DTOs/TransferOwnershipRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/PromoteOwnerRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/DemoteOwnerRequest.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/SwapStatusResponse.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/HouseholdMemberResponse.cs`

- [ ] **Step 1: Update CreateTripRequest to include HouseholdId**

```csharp
// ABOUTME: DTO for creating new trips with optional household scope
// ABOUTME: HouseholdId null = personal trip, set = household-scoped trip
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public DateOnly? TripDate { get; set; }

    //== Null for personal trips, set for household-scoped trips
    public Guid? HouseholdId { get; set; }
}
```

- [ ] **Step 2: Update UpdateUserPreferencesRequest**

```csharp
// ABOUTME: DTO for updating user preferences via the API. All fields are optional to support partial updates.

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateUserPreferencesRequest
{
    public string? DefaultPage { get; set; }

    public bool? ShowHouseholdPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }

    public bool? ShowWeatherIcons { get; set; }

    public bool? ShowWeatherTemps { get; set; }
}
```

- [ ] **Step 3: Update UserPreferencesResponse**

Read the file first to see its current shape, then add `ShowHouseholdPage`:

```csharp
public bool ShowHouseholdPage { get; set; }
```

- [ ] **Step 4: Delete AddCollaboratorRequest and TransferOwnershipRequest**

```bash
rm backend/AGDevX.Cart.Shared/DTOs/AddCollaboratorRequest.cs
rm backend/AGDevX.Cart.Shared/DTOs/TransferOwnershipRequest.cs
```

- [ ] **Step 5: Create PromoteOwnerRequest**

```csharp
// ABOUTME: DTO for promoting a household member to owner

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class PromoteOwnerRequest
{
    [Required]
    public Guid? UserId { get; set; }
}
```

- [ ] **Step 6: Create DemoteOwnerRequest**

```csharp
// ABOUTME: DTO for demoting a household owner to regular member

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class DemoteOwnerRequest
{
    [Required]
    public Guid? UserId { get; set; }
}
```

- [ ] **Step 7: Create SwapStatusResponse**

```csharp
// ABOUTME: Response DTO for the household swap-status advisory endpoint
// ABOUTME: Tells the frontend which confirmation modal to show before join/create

namespace AGDevX.Cart.Shared.DTOs;

public class SwapStatusResponse
{
    //== Scenario types: "none", "regular-member", "has-co-owner", "sole-member", "ownership-transfer-required"
    public string Scenario { get; set; } = "none";
    public Guid? CurrentHouseholdId { get; set; }
    public string? CurrentHouseholdName { get; set; }
    public string? CoOwnerName { get; set; }
}
```

- [ ] **Step 8: Create HouseholdMemberResponse**

```csharp
// ABOUTME: Response DTO for household member list endpoint
// ABOUTME: Returns user details with ownership status

namespace AGDevX.Cart.Shared.DTOs;

public class HouseholdMemberResponse
{
    public Guid UserId { get; set; }
    public string? Name { get; set; }
    public bool IsOwner { get; set; }
}
```

- [ ] **Step 9: Commit**

```bash
git add -A backend/AGDevX.Cart.Shared/DTOs/
git commit -m "refactor: update DTOs for single-household architecture"
```

---

## Phase 2: Backend Repositories & Services

### Task 11: Rewrite HouseholdRepository

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/IHouseholdRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs`

- [ ] **Step 1: Rewrite IHouseholdRepository interface**

Remove all member-management methods. Add owner-based queries:

```csharp
// ABOUTME: Repository interface for household data access operations
// ABOUTME: Single-household model — membership is via User.HouseholdId, not a join table
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default);
    Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default);
    Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetMembers(Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> Create(Household household, CancellationToken cancellationToken = default);
    Task<Household> Update(Household household, CancellationToken cancellationToken = default);
    Task Delete(Guid householdId, CancellationToken cancellationToken = default);
    Task<bool> IsUserOwner(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Rewrite HouseholdRepository implementation**

```csharp
// ABOUTME: Repository implementation for household data access operations
// ABOUTME: Single-household model — queries User.HouseholdId instead of join table

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    public async Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Households.FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
    }

    public async Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default)
    {
        return await context.Households.FirstOrDefaultAsync(h => h.InviteCode == inviteCode, cancellationToken);
    }

    public async Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.Include(u => u.Household).FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user?.Household;
    }

    public async Task<IEnumerable<User>> GetMembers(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Users.Where(u => u.HouseholdId == householdId).ToListAsync(cancellationToken);
    }

    public async Task<Household> Create(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Add(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    public async Task<Household> Update(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Update(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    public async Task Delete(Guid householdId, CancellationToken cancellationToken = default)
    {
        var household = await context.Households.FindAsync(new object[] { householdId }, cancellationToken);
        if (household != null)
        {
            context.Households.Remove(household);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> IsUserOwner(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        var household = await context.Households.FindAsync(new object[] { householdId }, cancellationToken);
        if (household == null) return false;
        return household.Owner1UserId == userId || household.Owner2UserId == userId;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/IHouseholdRepository.cs backend/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs
git commit -m "refactor: rewrite HouseholdRepository for single-household model"
```

---

### Task 12: Rewrite TripRepository

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Repositories/ITripRepository.cs`
- Modify: `backend/AGDevX.Cart.Data/Repositories/TripRepository.cs`

- [ ] **Step 1: Rewrite ITripRepository — remove collaborator methods, add HasTripAccess**

```csharp
// ABOUTME: Repository interface for Trip entities providing CRUD and scope-based authorization
// ABOUTME: Authorization checks use CreatedBy (personal) or HouseholdId (household membership)
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default);
    Task<Trip> Create(Trip trip, CancellationToken cancellationToken = default);
    Task<Trip> Update(Trip trip, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
    Task<bool> HasTripAccess(Guid tripId, Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default);
    Task DeletePersonalTripItemsForUser(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Rewrite TripRepository implementation**

```csharp
// ABOUTME: Repository implementation for Trip entities with scope-based authorization
// ABOUTME: Personal trips check CreatedBy, household trips check HouseholdId membership
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripRepository(CartDbContext context) : ITripRepository
{
    public async Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Trips.Include(t => t.Items)
                                  .ThenInclude(ti => ti.InventoryItem)
                                  .Include(t => t.Items)
                                  .ThenInclude(ti => ti.Store)
                                  .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default)
    {
        return await context.Trips.Include(t => t.Items)
                                  .Where(t =>
                                      (t.CreatedBy == userId && t.HouseholdId == null) ||
                                      (userHouseholdId != null && t.HouseholdId == userHouseholdId))
                                  .ToListAsync(cancellationToken);
    }

    public async Task<Trip> Create(Trip trip, CancellationToken cancellationToken = default)
    {
        context.Trips.Add(trip);
        await context.SaveChangesAsync(cancellationToken);
        return trip;
    }

    public async Task<Trip> Update(Trip trip, CancellationToken cancellationToken = default)
    {
        context.Trips.Update(trip);
        await context.SaveChangesAsync(cancellationToken);
        return trip;
    }

    public async Task Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var trip = await context.Trips.FindAsync(new object[] { id }, cancellationToken);
        if (trip != null)
        {
            context.Trips.Remove(trip);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> HasTripAccess(Guid tripId, Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default)
    {
        var trip = await context.Trips.FindAsync(new object[] { tripId }, cancellationToken);
        if (trip == null) return false;

        //== Personal trip: only the creator
        if (trip.HouseholdId == null)
        {
            return trip.CreatedBy == userId;
        }

        //== Household trip: any member of the household
        return userHouseholdId != null && trip.HouseholdId == userHouseholdId;
    }

    //== Delete personal TripItems for a user leaving a household
    //== Prevents ghost data that no one can see after the user leaves
    public async Task DeletePersonalTripItemsForUser(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        var personalItems = await context.TripItems
            .Include(ti => ti.Trip)
            .Where(ti =>
                ti.Trip != null &&
                ti.Trip.HouseholdId == householdId &&
                !ti.IsHouseholdItem &&
                ti.CreatedBy == userId)
            .ToListAsync(cancellationToken);

        context.TripItems.RemoveRange(personalItems);
        await context.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Data/Repositories/ITripRepository.cs backend/AGDevX.Cart.Data/Repositories/TripRepository.cs
git commit -m "refactor: rewrite TripRepository for scope-based authorization"
```

---

### Task 13: Rewrite HouseholdService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/IHouseholdService.cs`
- Modify: `backend/AGDevX.Cart.Services/HouseholdService.cs`

This is the most complex service. It handles: create, join, leave, delete, get members, swap-status, promote, demote, remove member, invite code management.

- [ ] **Step 1: Rewrite IHouseholdService interface**

```csharp
// ABOUTME: Service interface for household business logic
// ABOUTME: Single-household model with equal co-ownership and auto-swap on join/create
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHousehold(Guid userId, string name, CancellationToken cancellationToken = default);
    Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<Household?> GetById(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name, CancellationToken cancellationToken = default);
    Task DeleteHousehold(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> JoinHousehold(Guid userId, string inviteCode, CancellationToken cancellationToken = default);
    Task LeaveHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<SwapStatusResponse> GetSwapStatus(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HouseholdMemberResponse>> GetMembers(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task PromoteToOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task DemoteOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId, CancellationToken cancellationToken = default);
    Task<string> GetInviteCode(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Rewrite HouseholdService implementation**

This is a large file. Key changes:
- `CreateHousehold` creates household with `Owner1UserId`, sets `User.HouseholdId`, resets `ShowHouseholdPage = true`
- `JoinHousehold` finds by invite code, re-evaluates swap status, executes swap if confirmed, sets `User.HouseholdId`
- `LeaveHousehold` has 4 scenarios (non-owner, owner with co-owner, owner blocked, sole member)
- `GetSwapStatus` returns advisory scenario for the frontend modal
- `PromoteToOwner` / `DemoteOwner` with guards
- `RemoveMember` blocks self-removal and owner removal

The full implementation should follow the spec's service logic exactly. Each method needs:
- User lookup via `IUserRepository` or direct DbContext access
- Household lookup
- Authorization checks
- The specific business logic
- Cleanup of personal TripItems on leave/remove via `ITripRepository.DeletePersonalTripItemsForUser`

Note: The service needs access to `IUserPreferencesRepository` to reset `ShowHouseholdPage` on join/create. Add this as a constructor dependency.

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services/IHouseholdService.cs backend/AGDevX.Cart.Services/HouseholdService.cs
git commit -m "refactor: rewrite HouseholdService for single-household model"
```

---

### Task 14: Rewrite TripService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/ITripService.cs`
- Modify: `backend/AGDevX.Cart.Services/TripService.cs`

- [ ] **Step 1: Rewrite ITripService — remove collaborator methods, add HouseholdId to CreateTrip**

```csharp
// ABOUTME: Service interface for Trip business logic including lifecycle and scope-based authorization
// ABOUTME: Personal trips: creator only. Household trips: any household member.
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTrip(string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default);
    Task<Trip?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> UpdateTrip(Guid tripId, string name, DateOnly? tripDate, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Rewrite TripService implementation**

Key changes from current:
- `CreateTrip` accepts optional `householdId`. If provided, verify `user.HouseholdId == householdId`.
- All `IsUserCollaborator` checks replaced with `HasTripAccess(tripId, userId, user.HouseholdId)`.
- `GetUserTrips` passes `user.HouseholdId` to the repository.
- `DeleteTrip` — personal: creator only. Household: any member.
- Remove `AddCollaborator` and `RemoveCollaborator` methods entirely.

The service needs to look up the user's `HouseholdId` for authorization. Either inject a user repository or accept it as a parameter from the controller.

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services/ITripService.cs backend/AGDevX.Cart.Services/TripService.cs
git commit -m "refactor: rewrite TripService for scope-based authorization"
```

---

### Task 15: Update TripItemService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/TripItemService.cs`

- [ ] **Step 1: Replace IsUserCollaborator with HasTripAccess**

Every method that calls `_tripRepository.IsUserCollaborator` changes to `_tripRepository.HasTripAccess(tripId, userId, user.HouseholdId)`.

- [ ] **Step 2: Set IsHouseholdItem when adding TripItems**

In `AddTripItem`, after looking up the inventory item:
```csharp
var tripItem = new TripItem
{
    TripId = tripId,
    InventoryItemId = inventoryItemId,
    ItemName = inventoryItem.Name,
    StoreName = storeName,
    Quantity = quantity,
    Notes = notes,
    StoreId = storeId,
    IsChecked = false,
    CheckedAt = null,
    IsHouseholdItem = inventoryItem.HouseholdId.HasValue,
};
```

- [ ] **Step 3: Add visibility filtering to GetTripItems**

After retrieving all trip items, filter based on trip scope:
```csharp
var trip = await _tripRepository.GetById(tripId, cancellationToken);
if (trip?.HouseholdId != null)
{
    //== Household trip: filter out personal items not created by this user
    items = items.Where(ti => ti.IsHouseholdItem || ti.CreatedBy == userId).ToList();
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Services/TripItemService.cs
git commit -m "refactor: update TripItemService for scope-based auth and visibility"
```

---

### Task 16: Update InventoryService and StoreService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/InventoryService.cs`
- Modify: `backend/AGDevX.Cart.Services/StoreService.cs`

- [ ] **Step 1: Simplify InventoryService membership checks**

Replace all `householdRepository.GetById` + `Members.Any(m => m.UserId == userId)` patterns with simple `user.HouseholdId == householdId` checks. The service needs to look up the user to get their `HouseholdId`.

`GetAllUserInventory` simplifies: get personal items + items for the single household (no loop over multiple households).

- [ ] **Step 2: Simplify StoreService membership checks**

Same pattern as InventoryService — replace join table membership checks with `user.HouseholdId == householdId`.

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Services/InventoryService.cs backend/AGDevX.Cart.Services/StoreService.cs
git commit -m "refactor: simplify Inventory/Store services for single-household"
```

---

### Task 17: Update UserPreferencesService

**Files:**
- Modify: `backend/AGDevX.Cart.Services/UserPreferencesService.cs`
- Modify: `backend/AGDevX.Cart.Services/IUserPreferencesService.cs` (if needed)

- [ ] **Step 1: Handle ShowHouseholdPage in update**

The existing update logic uses partial updates — only overwrite fields that are non-null in the request. Add `ShowHouseholdPage` to this pattern:

```csharp
if (request.ShowHouseholdPage.HasValue)
{
    preferences.ShowHouseholdPage = request.ShowHouseholdPage.Value;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Services/UserPreferencesService.cs backend/AGDevX.Cart.Services/IUserPreferencesService.cs
git commit -m "feat: add ShowHouseholdPage support to UserPreferencesService"
```

---

## Phase 3: Backend Controllers

### Task 18: Rewrite HouseholdController

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/HouseholdController.cs`

- [ ] **Step 1: Rewrite controller**

Key changes:
- `GET /api/v1/household` — returns 200 with null or the single household
- `POST /api/v1/household/join` (fix: was plural `households`)
- `POST /api/v1/household/{id}/leave` — new endpoint
- `PUT /api/v1/household/{id}/owner/promote` — split from old transfer
- `PUT /api/v1/household/{id}/owner/demote` — new endpoint
- `GET /api/v1/household/swap-status` — new advisory endpoint
- Remove collaborator endpoints from TripController (they were here, on TripController)

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/HouseholdController.cs
git commit -m "refactor: rewrite HouseholdController for single-household"
```

---

### Task 19: Update TripController

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripController.cs`

- [ ] **Step 1: Update controller**

Key changes:
- `Create` passes `request.HouseholdId` to service
- Remove `AddCollaborator` and `RemoveCollaborator` endpoints
- All authorization is handled by the service layer (which uses `HasTripAccess`)

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/TripController.cs
git commit -m "refactor: update TripController for scope-based trips"
```

---

### Task 20: Update TripEventsController

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs`

- [ ] **Step 1: Replace IsUserCollaborator with scope-based auth**

Replace the collaborator check with:
```csharp
var userId = User.GetUserId();
var user = await userRepository.GetById(userId);
var hasAccess = await tripRepository.HasTripAccess(tripId, userId, user?.HouseholdId);
if (!hasAccess)
{
    Response.StatusCode = 403;
    return;
}
```

- [ ] **Step 2: Add SSE event visibility filtering**

In the streaming loop, filter personal item events:
```csharp
var trip = await tripRepository.GetById(tripId);
var isHouseholdTrip = trip?.HouseholdId != null;

await foreach (var tripEvent in subscription.ToAsyncEnumerable().WithCancellation(cancellationToken))
{
    //== On household trips, skip personal item events for other users
    if (isHouseholdTrip && ShouldFilterEvent(tripEvent, userId))
    {
        continue;
    }

    var eventData = $"data: {JsonSerializer.Serialize(tripEvent, _jsonSerializerOptions)}\n\n";
    await Response.WriteAsync(eventData, cancellationToken);
    await Response.Body.FlushAsync(cancellationToken);
}
```

The `ShouldFilterEvent` method parses the event data to check `IsHouseholdItem` and `CreatedBy`.

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Api/Controllers/TripEventsController.cs
git commit -m "refactor: update TripEventsController for scope-based auth and visibility"
```

---

### Task 21: Update Program.cs DI registrations

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs`

- [ ] **Step 1: Remove any references to deleted types/services**

Verify that all DI registrations reference types that still exist. The repository and service registrations should already be correct if the interfaces/implementations were updated in place.

If a `IUserRepository` was added as a new dependency, register it here.

- [ ] **Step 2: Commit**

```bash
git add backend/AGDevX.Cart.Api/Program.cs
git commit -m "refactor: update DI registrations for single-household"
```

---

### Task 22: Generate migration and verify build

**Files:**
- Create: `backend/AGDevX.Cart.Data/Migrations/` (new migration files)

- [ ] **Step 1: Build the full solution**

```bash
cd backend && dotnet build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Generate the fresh migration**

```bash
cd backend && dotnet ef migrations add InitialCreate --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 3: Verify migration was created**

Check that the migration files exist in `backend/AGDevX.Cart.Data/Migrations/`.

- [ ] **Step 4: Create the database**

```bash
cd backend && dotnet ef database update --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 5: Commit**

```bash
git add backend/AGDevX.Cart.Data/Migrations/
git commit -m "feat: generate fresh InitialCreate migration for single-household schema"
```

---

## Phase 4: Backend Tests

### Task 23: Rewrite backend tests

**Files:**
- Modify: All test files in `backend/AGDevX.Cart.Data.Tests/`
- Modify: All test files in `backend/AGDevX.Cart.Services.Tests/`
- Modify: All test files in `backend/AGDevX.Cart.Api.Tests/`

This is the largest task by file count. The approach:

- [ ] **Step 1: Fix Data.Tests**

Update `CartDbContextTests.cs` — remove HouseholdMember/TripCollaborator assertions, add new schema assertions.

Update `Repositories/HouseholdRepositoryTests.cs` — test new interface methods (`GetUserHousehold`, `GetMembers`, `IsUserOwner`). Remove `AddMember`, `RemoveMember`, `UpdateMemberRole` tests.

Update `Repositories/TripRepositoryTests.cs` — test `HasTripAccess` (personal and household scenarios), `GetUserTrips` with household filter, `DeletePersonalTripItemsForUser`. Remove `IsUserCollaborator`, `AddCollaborator`, `RemoveCollaborator` tests.

Update other repository tests to work with new schema (BaseEntity Guid audit fields, no HouseholdMember seeding).

Run: `cd backend && dotnet test AGDevX.Cart.Data.Tests`

- [ ] **Step 2: Fix Services.Tests**

Update `HouseholdServiceTests.cs` — test all new methods: create with auto-swap, join with auto-swap, leave (4 scenarios), swap-status (5 scenarios), promote, demote (with zero-owner guard), remove member (self-removal blocked, owner blocked).

Update `TripServiceTests.cs` — test scope-based authorization for all operations, trip creation with HouseholdId.

Update `TripItemServiceTests.cs` — test IsHouseholdItem set on add, visibility filtering in GetTripItems.

Update `InventoryServiceTests.cs` and `StoreServiceTests.cs` — simplified membership checks.

Run: `cd backend && dotnet test AGDevX.Cart.Services.Tests`

- [ ] **Step 3: Fix Api.Tests**

Update all controller tests to use new DTOs and service interfaces. Remove collaborator endpoint tests. Add swap-status, leave, promote/demote tests.

Run: `cd backend && dotnet test AGDevX.Cart.Api.Tests`

- [ ] **Step 4: Run full test suite**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A backend/AGDevX.Cart.Data.Tests/ backend/AGDevX.Cart.Services.Tests/ backend/AGDevX.Cart.Api.Tests/
git commit -m "test: rewrite backend tests for single-household architecture"
```

---

## Phase 5: Frontend API Layer

### Task 24: Update frontend models

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/models/household.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip-item.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/models/user-preferences.ts`

- [ ] **Step 1: Update Household model**

Remove `HouseholdMember` interface. Update `Household` to include owner fields:

```typescript
export interface Household {
  id: string
  name: string
  inviteCode?: string
  owner1UserId: string
  owner2UserId: string | null
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string | null
}

export interface HouseholdMember {
  userId: string
  name: string | null
  isOwner: boolean
}
```

- [ ] **Step 2: Update Trip model — add householdId**

```typescript
export interface Trip {
  id: string
  name: string
  createdBy: string
  isStarted: boolean
  startedAt: string | null
  isCompleted: boolean
  completedAt: string | null
  tripDate: string | null
  householdId: string | null
  createdDate: string
  modifiedBy: string
  modifiedDate: string | null
}
```

- [ ] **Step 3: Update TripItem model — add isHouseholdItem**

```typescript
export interface TripItem {
  id: string
  tripId: string
  inventoryItemId: string | null
  itemName: string
  storeName: string | null
  quantity: number
  storeId: string | null
  notes: string | null
  isChecked: boolean
  checkedAt: string | null
  isHouseholdItem: boolean
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string | null
}
```

- [ ] **Step 4: Update UserPreferences model — add showHouseholdPage**

Add `showHouseholdPage: boolean` to the preferences interface.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/models/
git commit -m "refactor: update frontend API models for single-household"
```

---

### Task 25: Update household API hooks

**Files:**
- Delete: `frontend/src/apis/agdevx-cart-api/household/use-households.query.ts` (plural)
- Delete: `frontend/src/apis/agdevx-cart-api/household/transfer-household-ownership.mutation.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-household.query.ts` (singular — returns single or null)
- Modify: `frontend/src/apis/agdevx-cart-api/household/use-household-members.query.ts` (returns HouseholdMember[])
- Modify: `frontend/src/apis/agdevx-cart-api/household/join-household.mutation.ts` (fix endpoint to singular)
- Create: `frontend/src/apis/agdevx-cart-api/household/use-swap-status.query.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/leave-household.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/promote-owner.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/household/demote-owner.mutation.ts`

- [ ] **Step 1: Delete plural query and transfer mutation**

- [ ] **Step 2: Update use-household.query.ts**

Change to call `GET /api/v1/household` (no ID), returns single household or null.

- [ ] **Step 3: Update use-household-members.query.ts**

Response shape changes to `HouseholdMember[]` with `{ userId, name, isOwner }`.

- [ ] **Step 4: Update join-household.mutation.ts**

Fix endpoint from `/api/v1/households/join` to `/api/v1/household/join`.

- [ ] **Step 5: Create new hooks**

Create `use-swap-status.query.ts`, `leave-household.mutation.ts`, `promote-owner.mutation.ts`, `demote-owner.mutation.ts`.

- [ ] **Step 6: Create trip mutation updates**

Update `create-trip.mutation.ts` to pass `householdId` in the request body.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/src/apis/agdevx-cart-api/household/ frontend/src/apis/agdevx-cart-api/trip/
git commit -m "refactor: update frontend household and trip API hooks"
```

---

### Task 26: Update useStoresQuery

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts`

- [ ] **Step 1: Simplify to accept optional single householdId**

Change from `householdIds: string[]` to `householdId: string | null`:

```typescript
export const useStoresQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['stores', householdId],
    queryFn: async (): Promise<Store[]> => {
      const requests = [apiFetch('/api/v1/store/personal')]

      if (householdId) {
        requests.push(apiFetch(`/api/v1/store/household/${householdId}`))
      }

      const responses = await Promise.all(requests)

      const allStores: Store[] = []
      for (const response of responses) {
        const stores: Store[] = await response.json()
        allStores.push(...stores)
      }
      return allStores
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}
```

- [ ] **Step 2: Update all consumers**

All files that call `useStoresQuery(householdIds)` need to change to `useStoresQuery(household?.id ?? null)`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/store/use-stores.query.ts
git commit -m "refactor: simplify useStoresQuery for single household"
```

---

### Task 27: Delete household-atoms.ts and sort-households.ts

**Files:**
- Delete: `frontend/src/state/household-atoms.ts`
- Delete: `frontend/src/state/tests/household-atoms.test.ts`
- Delete: `frontend/src/utils/sort-households.ts`

- [ ] **Step 1: Delete files**

- [ ] **Step 2: Remove all imports of these files across the codebase**

Search for imports of `household-atoms`, `sort-households` and remove them. Update consuming components.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete household-atoms and sort-households utils"
```

---

## Phase 6: Frontend Components & Pages

### Task 28: Simplify ScopeFilter

**Files:**
- Modify: `frontend/src/shared/scope-filter.tsx`

- [ ] **Step 1: Rewrite for single-household**

The component now receives a single optional household (not an array). Three tabs when in a household (All | Personal | {Name} Household), hidden when solo:

```typescript
interface ScopeFilterProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly household: { readonly id: string; readonly name: string | null } | null | undefined
  readonly 'aria-label'?: string
}
```

If `household` is null/undefined, render nothing (return null).

- [ ] **Step 2: Update all consumers**

Change from `households={households}` to `household={household}`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/scope-filter.tsx
git commit -m "refactor: simplify ScopeFilter for single household"
```

---

### Task 29: Replace ScopeSelect with radio buttons

**Files:**
- Delete: `frontend/src/shared/scope-select.tsx`
- Delete: `frontend/src/shared/tests/scope-select.test.tsx`
- Create: `frontend/src/shared/scope-radio.tsx`

- [ ] **Step 1: Create ScopeRadio component**

A radio group with "Personal" and "{Name} Household" options. Hidden when solo (no household).

```typescript
interface ScopeRadioProps {
  value: string
  onChange: (value: string) => void
  household: { id: string; name: string | null } | null | undefined
  disabled?: boolean
}
```

If `household` is null/undefined, render nothing.

- [ ] **Step 2: Update pantry-item-form.tsx and pantry-store-form.tsx**

Replace `ScopeSelect` imports with `ScopeRadio`. Update props from `households` to `household`.

- [ ] **Step 3: Delete ScopeSelect**

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/shared/
git commit -m "refactor: replace ScopeSelect with ScopeRadio for single household"
```

---

### Task 30: Update pantry views

**Files:**
- Modify: `frontend/src/pages/pantry/pantry-items-view.tsx`
- Modify: `frontend/src/pages/pantry/pantry-stores-view.tsx`
- Modify: `frontend/src/pages/pantry/pantry-page.tsx`
- Modify: `frontend/src/pages/pantry/pantry-item-form.tsx`
- Modify: `frontend/src/pages/pantry/pantry-store-form.tsx`

- [ ] **Step 1: Update pantry-items-view.tsx**

Change from `useHouseholdsQuery()` to `useHouseholdQuery()` (singular). Pass single `household` to `ScopeFilter`. Update `useStoresQuery(householdIds)` to `useStoresQuery(household?.id ?? null)`. Remove `sortHouseholds` import. In "all" grouped view, simplify to just "Personal Items" and "{household.name}" sections.

- [ ] **Step 2: Update pantry-stores-view.tsx**

Same pattern — singular household, simplified grouping.

- [ ] **Step 3: Update pantry-item-form.tsx and pantry-store-form.tsx**

Replace `ScopeSelect` with `ScopeRadio`. Change `households` prop to `household`.

- [ ] **Step 4: Update pantry-page.tsx**

If no household, don't render the ScopeFilter tab bar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/pantry/
git commit -m "refactor: update pantry pages for single household"
```

---

### Task 31: Update shopping/trip pages

**Files:**
- Modify: `frontend/src/pages/shopping/trip-create-form.tsx`
- Modify: `frontend/src/pages/shopping/add-trip-items-page.tsx`
- Modify: `frontend/src/pages/shopping/shopping-page.tsx`

- [ ] **Step 1: Add scope radio to trip-create-form.tsx**

Add `ScopeRadio` for Personal / {Name} Household selection. Hidden when solo.

```typescript
export interface TripCreateFormData {
  name: string
  tripDate: string | null
  householdId: string | null
}
```

- [ ] **Step 2: Update add-trip-items-page.tsx**

Change from `useHouseholdsQuery()` to `useHouseholdQuery()`. Update `ScopeFilter` and `useStoresQuery` calls. Remove `sortHouseholds` import.

- [ ] **Step 3: Update shopping-page.tsx if needed**

The trip list already works by fetching user trips. The API now returns both personal and household trips. No major UI changes needed unless the page shows trip scope indicators.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/shopping/
git commit -m "refactor: update shopping pages for scoped trips"
```

---

### Task 32: Redesign household page

**Files:**
- Rewrite: `frontend/src/pages/household/household-page.tsx`
- Delete: `frontend/src/pages/household/create-household-page.tsx`
- Delete: `frontend/src/pages/household/join-household-page.tsx`
- Modify or delete: `frontend/src/pages/household/household-detail-page.tsx`

- [ ] **Step 1: Rewrite household-page.tsx as the singular household view**

Two states:
- **No household:** Create/Join prompt
- **In a household:** Name at top, member grid (circles with initials), invite code section, management actions

Consolidate create and join functionality into this page (inline forms or modals instead of separate routes).

- [ ] **Step 2: Create member circle grid component**

CSS grid with auto-fill for aligned columns that wrap naturally. Each circle shows user initials, name below.

- [ ] **Step 3: Add auto-swap confirmation modal**

Implement the 5-scenario modal with long-press "Yes" (5 seconds). Use `useSwapStatusQuery` to determine which state to show.

- [ ] **Step 4: Delete separate create/join pages**

- [ ] **Step 5: Update routes.ts**

Remove `HOUSEHOLD_CREATE`, `HOUSEHOLD_JOIN`, `HOUSEHOLD_DETAIL` routes (or consolidate). Keep `HOUSEHOLD` as the single route.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/pages/household/ frontend/src/routes.ts
git commit -m "refactor: redesign household page for single-household"
```

---

### Task 33: Update bottom nav and settings

**Files:**
- Modify: `frontend/src/shared/bottom-nav/bottom-nav.tsx`
- Modify: `frontend/src/pages/settings/preferences-section.tsx`

- [ ] **Step 1: Make household tab conditional on ShowHouseholdPage**

The bottom nav reads `useUserPreferencesQuery()` and conditionally includes the Household tab:

```typescript
const { data: preferences } = useUserPreferencesQuery()

const tabs = [
  { path: ROUTES.HOME, label: 'Home', icon: House },
  { path: ROUTES.SHOPPING, label: 'Shopping', icon: ShoppingCart },
  { path: ROUTES.PANTRY, label: 'Pantry', icon: Package },
  ...(preferences?.showHouseholdPage !== false
    ? [{ path: ROUTES.HOUSEHOLD, label: 'Household', icon: Users }]
    : []),
  { path: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]
```

The remaining tabs space evenly via flex (no changes needed to the flex layout).

- [ ] **Step 2: Add ShowHouseholdPage toggle to preferences-section.tsx**

Add a toggle switch in the Preferences section, styled like the existing weather toggles:

```typescript
const [showHouseholdPage, setShowHouseholdPage] = useState(preferences?.showHouseholdPage ?? true)
```

Include it in the `handleSave` mutation payload.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/bottom-nav/bottom-nav.tsx frontend/src/pages/settings/preferences-section.tsx
git commit -m "feat: add ShowHouseholdPage toggle to settings and bottom nav"
```

---

### Task 34: Simplify getStoreDisplayNames

**Files:**
- Modify: `frontend/src/utils/get-store-display-names.ts`

- [ ] **Step 1: Simplify for single household**

With only one household, store display names don't need multi-household disambiguation. Simplify the function — household stores just show their name, personal stores show their name. The `(Household)` / `(Personal)` suffix may still be useful for clarity.

- [ ] **Step 2: Update all consumers**

Change from passing `households` array to passing a single `household`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/get-store-display-names.ts
git commit -m "refactor: simplify getStoreDisplayNames for single household"
```

---

## Phase 7: Frontend Tests

### Task 35: Update frontend tests

**Files:**
- Update all test files under `frontend/src/` that reference deleted components, changed interfaces, or modified behavior

- [ ] **Step 1: Delete obsolete test files**

- `frontend/src/state/tests/household-atoms.test.ts`
- `frontend/src/shared/tests/scope-select.test.tsx`
- `frontend/src/apis/agdevx-cart-api/household/tests/use-households.query.test.tsx` (plural)
- `frontend/src/apis/agdevx-cart-api/household/tests/transfer-household-ownership.mutation.test.tsx`

- [ ] **Step 2: Update shared component tests**

- `scope-filter.test.tsx` — update for new single-household prop interface
- `bottom-nav.test.tsx` — add tests for conditional household tab

- [ ] **Step 3: Update page tests**

- Pantry tests: update mocks from `useHouseholdsQuery` to `useHouseholdQuery`
- Shopping tests: update trip creation mocks to include `householdId`
- Household tests: rewrite for the new singular household page
- Settings tests: add ShowHouseholdPage toggle test

- [ ] **Step 4: Update API hook tests**

- Update mocks for changed response shapes
- Add tests for new hooks (swap-status, leave, promote, demote)

- [ ] **Step 5: Run full frontend test suite**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/
git commit -m "test: update frontend tests for single-household architecture"
```

---

## Phase 8: Final Verification

### Task 36: Full verification pass

- [ ] **Step 1: TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No type errors.

- [ ] **Step 2: ESLint**

```bash
cd frontend && npx eslint src/
```

Expected: No lint errors (may need `--fix` for import sorting).

- [ ] **Step 3: Frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Backend build**

```bash
cd backend && dotnet build
```

Expected: Clean build.

- [ ] **Step 5: Backend tests**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 6: Manual smoke test**

Start the API and frontend dev server. Register a user, create a household, create items/stores in both scopes, create trips in both scopes, verify visibility rules. Invite a second user and verify household trip sharing.

- [ ] **Step 7: Update STATUS.md**

Update test counts, move "Trip Collaborator UI" from Planned to removed/superseded. Add this enhancement to "In Progress" or "Completed" depending on state.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass for single-household architecture"
```
