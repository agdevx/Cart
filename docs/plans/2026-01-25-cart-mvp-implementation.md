# Grocery Shopping Cart MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete self-hosted grocery shopping list application with real-time collaboration capabilities.

**Architecture:** ASP.NET Core Web API backend with SQLite database, React TypeScript PWA frontend with SSE for real-time updates, containerized with Docker and served via Caddy reverse proxy. Authentication uses JWT tokens (Phase 1), designed for easy Auth0 migration (Phase 2). Solution follows AGDevX standard project structure with separate .Api, .Services, .Auth, .Data, and .Shared projects.

**Tech Stack:** .NET 10, ASP.NET Core, Entity Framework Core, SQLite, React 19, TypeScript, TailwindCSS, TanStack Query, Jotai, Vite, Docker, Caddy

---

## Phase 1: Project Structure & Foundation

### Task 1: Initialize Git Repository

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Initialize git repository**

Run:
```bash
git init
```

Expected: Repository initialized

**Step 2: Create .gitignore**

Create `.gitignore`:
```
# .NET
bin/
obj/
*.user
*.suo
*.cache
*.log
.vs/
.vscode/

# Frontend
node_modules/
dist/
.env
.env.local

# Database
*.db
*.db-shm
*.db-wal

# Docker
.docker-data/

# IDE
.idea/
*.swp
*.swo
*~
```

**Step 3: Create README**

Create `README.md`:
```markdown
# AGDevX Cart

Self-hosted grocery shopping list application with real-time collaboration.

## Features
- Household inventory management
- Real-time collaborative shopping trips
- Multi-store support
- Personal and shared items
- PWA with offline support

## Tech Stack
- Backend: .NET 10 + ASP.NET Core Web API
- Frontend: React 19 + TypeScript + Vite
- Database: SQLite
- Real-time: Server-Sent Events (SSE)
- Deployment: Docker + Caddy

## Project Structure

```
AGDevX.Cart/
├── AGDevX.Cart.slnx
├── AGDevX.Cart.Api/          # Controllers, Program.cs, API layer
├── AGDevX.Cart.Services/     # Business logic
├── AGDevX.Cart.Auth/         # Authentication & authorization
├── AGDevX.Cart.Data/         # EF Core, DbContext, repositories
├── AGDevX.Cart.Shared/       # Models, DTOs, interfaces, extensions
└── Tests/
    ├── AGDevX.Cart.Api.Tests/
    ├── AGDevX.Cart.Services.Tests/
    ├── AGDevX.Cart.Auth.Tests/
    └── AGDevX.Cart.Data.Tests/
```

## Getting Started

See docs/plans/ for implementation details.
```

**Step 4: Initial commit**

Run:
```bash
git add .gitignore README.md
git commit -m "chore: initialize repository with gitignore and readme"
```

Expected: Commit created successfully

---

### Task 2: Backend Project Structure

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.slnx`
- Create: `AGDevX.Cart/AGDevX.Cart.Api/`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/`
- Create: `AGDevX.Cart/AGDevX.Cart.Auth/`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/`
- Create: `AGDevX.Cart/AGDevX.Cart.Api.Tests/`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/`
- Create: `AGDevX.Cart/AGDevX.Cart.Auth.Tests/`
- Create: `AGDevX.Cart/AGDevX.Cart.Data.Tests/`

**Step 1: Create solution directory**

Run:
```bash
mkdir AGDevX.Cart
cd AGDevX.Cart
```

Expected: Directory created and changed into it

**Step 2: Create .NET solution**

Run:
```bash
dotnet new sln -n AGDevX.Cart
```

Expected: Solution file created (AGDevX.Cart.sln)

**Step 3: Convert to .slnx format**

Run:
```bash
mv AGDevX.Cart.sln AGDevX.Cart.slnx
```

Expected: Solution file renamed to .slnx

**Step 4: Create all project directories**

Run:
```bash
mkdir AGDevX.Cart.Api AGDevX.Cart.Services AGDevX.Cart.Auth AGDevX.Cart.Data AGDevX.Cart.Shared
mkdir AGDevX.Cart.Api.Tests AGDevX.Cart.Services.Tests AGDevX.Cart.Auth.Tests AGDevX.Cart.Data.Tests
```

Expected: All directories created

**Step 5: Create Api project**

Run:
```bash
cd AGDevX.Cart.Api
dotnet new webapi
cd ..
```

Expected: Web API project created

**Step 6: Create Services project**

Run:
```bash
cd AGDevX.Cart.Services
dotnet new classlib
cd ..
```

Expected: Class library created

**Step 7: Create Auth project**

Run:
```bash
cd AGDevX.Cart.Auth
dotnet new classlib
cd ..
```

Expected: Class library created

**Step 8: Create Data project**

Run:
```bash
cd AGDevX.Cart.Data
dotnet new classlib
cd ..
```

Expected: Class library created

**Step 9: Create Shared project**

Run:
```bash
cd AGDevX.Cart.Shared
dotnet new classlib
cd ..
```

Expected: Class library created

**Step 10: Create test projects**

Run:
```bash
cd AGDevX.Cart.Api.Tests
dotnet new xunit
cd ../AGDevX.Cart.Services.Tests
dotnet new xunit
cd ../AGDevX.Cart.Auth.Tests
dotnet new xunit
cd ../AGDevX.Cart.Data.Tests
dotnet new xunit
cd ..
```

Expected: All test projects created

**Step 11: Add all projects to solution**

Run:
```bash
dotnet sln add AGDevX.Cart.Api/AGDevX.Cart.Api.csproj
dotnet sln add AGDevX.Cart.Services/AGDevX.Cart.Services.csproj
dotnet sln add AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj
dotnet sln add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj
dotnet sln add AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
dotnet sln add AGDevX.Cart.Api.Tests/AGDevX.Cart.Api.Tests.csproj
dotnet sln add AGDevX.Cart.Services.Tests/AGDevX.Cart.Services.Tests.csproj
dotnet sln add AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj
dotnet sln add AGDevX.Cart.Data.Tests/AGDevX.Cart.Data.Tests.csproj
```

Expected: All projects added to solution

**Step 12: Setup project references**

Run:
```bash
dotnet add AGDevX.Cart.Api/AGDevX.Cart.Api.csproj reference AGDevX.Cart.Services/AGDevX.Cart.Services.csproj AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
dotnet add AGDevX.Cart.Services/AGDevX.Cart.Services.csproj reference AGDevX.Cart.Data/AGDevX.Cart.Data.csproj AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
dotnet add AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj reference AGDevX.Cart.Data/AGDevX.Cart.Data.csproj AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
dotnet add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj reference AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
dotnet add AGDevX.Cart.Api.Tests/AGDevX.Cart.Api.Tests.csproj reference AGDevX.Cart.Api/AGDevX.Cart.Api.csproj
dotnet add AGDevX.Cart.Services.Tests/AGDevX.Cart.Services.Tests.csproj reference AGDevX.Cart.Services/AGDevX.Cart.Services.csproj
dotnet add AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj reference AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj
dotnet add AGDevX.Cart.Data.Tests/AGDevX.Cart.Data.Tests.csproj reference AGDevX.Cart.Data/AGDevX.Cart.Data.csproj
```

Expected: All references configured

**Step 13: Enable nullable reference types in all projects**

Run:
```bash
sed -i 's/<\/PropertyGroup>/<Nullable>enable<\/Nullable>\n  <\/PropertyGroup>/' AGDevX.Cart.Api/AGDevX.Cart.Api.csproj
sed -i 's/<\/PropertyGroup>/<Nullable>enable<\/Nullable>\n  <\/PropertyGroup>/' AGDevX.Cart.Services/AGDevX.Cart.Services.csproj
sed -i 's/<\/PropertyGroup>/<Nullable>enable<\/Nullable>\n  <\/PropertyGroup>/' AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj
sed -i 's/<\/PropertyGroup>/<Nullable>enable<\/Nullable>\n  <\/PropertyGroup>/' AGDevX.Cart.Data/AGDevX.Cart.Data.csproj
sed -i 's/<\/PropertyGroup>/<Nullable>enable<\/Nullable>\n  <\/PropertyGroup>/' AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj
```

Expected: Nullable enabled in all projects

**Step 14: Verify build**

Run:
```bash
dotnet build
```

Expected: Build succeeds

**Step 15: Return to repo root and commit**

Run:
```bash
cd ..
git add .
git commit -m "chore: create backend project structure with AGDevX standard layout"
```

Expected: Commit created

---

### Task 3: Add Core Dependencies

**Files:**
- Modify: `AGDevX.Cart/AGDevX.Cart.Data/AGDevX.Cart.Data.csproj`
- Modify: `AGDevX.Cart/AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj`
- Modify: `AGDevX.Cart/AGDevX.Cart.Api/AGDevX.Cart.Api.csproj`
- Modify: `AGDevX.Cart/AGDevX.Cart.Data.Tests/AGDevX.Cart.Data.Tests.csproj`

**Step 1: Add EF Core packages to Data project**

Run:
```bash
cd AGDevX.Cart
dotnet add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj package Microsoft.EntityFrameworkCore.Sqlite
dotnet add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj package Microsoft.EntityFrameworkCore.Design
```

Expected: Packages installed

**Step 2: Add Auth packages to Auth project**

Run:
```bash
dotnet add AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj package System.IdentityModel.Tokens.Jwt
dotnet add AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj package BCrypt.Net-Next
```

Expected: Packages installed

**Step 3: Add OpenAPI packages to Api project**

Run:
```bash
dotnet add AGDevX.Cart.Api/AGDevX.Cart.Api.csproj package Microsoft.AspNetCore.OpenApi
dotnet add AGDevX.Cart.Api/AGDevX.Cart.Api.csproj package Scalar.AspNetCore
```

Expected: Packages installed

**Step 4: Add test packages**

Run:
```bash
dotnet add AGDevX.Cart.Data.Tests/AGDevX.Cart.Data.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory
dotnet add AGDevX.Cart.Api.Tests/AGDevX.Cart.Api.Tests.csproj package Microsoft.AspNetCore.Mvc.Testing
dotnet add AGDevX.Cart.Api.Tests/AGDevX.Cart.Api.Tests.csproj package FluentAssertions
dotnet add AGDevX.Cart.Services.Tests/AGDevX.Cart.Services.Tests.csproj package FluentAssertions
dotnet add AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj package FluentAssertions
dotnet add AGDevX.Cart.Data.Tests/AGDevX.Cart.Data.Tests.csproj package FluentAssertions
dotnet add AGDevX.Cart.Api.Tests/AGDevX.Cart.Api.Tests.csproj package Moq
dotnet add AGDevX.Cart.Services.Tests/AGDevX.Cart.Services.Tests.csproj package Moq
dotnet add AGDevX.Cart.Auth.Tests/AGDevX.Cart.Auth.Tests.csproj package Moq
```

Expected: Test packages installed

**Step 5: Verify build**

Run:
```bash
dotnet build
```

Expected: Build succeeds

**Step 6: Commit**

Run:
```bash
cd ..
git add .
git commit -m "chore: add core backend dependencies"
```

Expected: Commit created

---

## Phase 2: Database Layer (Data Project)

### Task 4: Database Models - User and Household

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/BaseEntity.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/User.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/Household.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/HouseholdMember.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/UserTests.cs`

**Step 1: Write failing test for User model**

Create `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/UserTests.cs`:
```csharp
// ABOUTME: Tests for User entity model
// ABOUTME: Validates user properties and relationships

using AGDevX.Cart.Shared.Models;
using FluentAssertions;

namespace AGDevX.Cart.Data.Tests.Models;

public class UserTests
{
    [Fact]
    public void Should_InitializeWithDefaults_When_CreatingNewUser()
    {
        // Arrange & Act
        var user = new User();

        // Assert
        user.Id.Should().Be(0);
        user.Email.Should().BeEmpty();
        user.DisplayName.Should().BeEmpty();
    }

    [Fact]
    public void Should_SetPropertiesCorrectly_When_AssigningValues()
    {
        // Arrange
        var user = new User
        {
            Email = "test@example.com",
            DisplayName = "Test User",
            PasswordHash = "hashedpassword"
        };

        // Assert
        user.Email.Should().Be("test@example.com");
        user.DisplayName.Should().Be("Test User");
        user.PasswordHash.Should().Be("hashedpassword");
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - User class not found

**Step 3: Create BaseEntity**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/BaseEntity.cs`:
```csharp
// ABOUTME: Base entity with audit fields for all database models
// ABOUTME: Provides CreatedBy, CreatedDate, ModifiedBy, ModifiedDate tracking

namespace AGDevX.Cart.Shared.Models;

public abstract class BaseEntity
{
    public int Id { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public int ModifiedBy { get; set; }
    public DateTime ModifiedDate { get; set; }
}
```

**Step 4: Create User model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/User.cs`:
```csharp
// ABOUTME: User entity representing app users with authentication
// ABOUTME: Can belong to multiple households via HouseholdMember relationship

namespace AGDevX.Cart.Shared.Models;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    //== Navigation properties
    public ICollection<HouseholdMember> HouseholdMemberships { get; set; } = [];
}
```

**Step 5: Create Household model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/Household.cs`:
```csharp
// ABOUTME: Household entity for grouping users and shared inventory
// ABOUTME: Contains shared stores, inventory items, and trips

namespace AGDevX.Cart.Shared.Models;

public class Household : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    //== Navigation properties
    public ICollection<HouseholdMember> Members { get; set; } = [];
}
```

**Step 6: Create HouseholdMember model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/HouseholdMember.cs`:
```csharp
// ABOUTME: Join table for User-Household many-to-many relationship
// ABOUTME: Tracks role (owner/member) and join timestamp

namespace AGDevX.Cart.Shared.Models;

public class HouseholdMember
{
    public int HouseholdId { get; set; }
    public Household Household { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime JoinedAt { get; set; }
    public string Role { get; set; } = "member"; //== "owner" or "member"
}
```

**Step 7: Run test to verify it passes**

Run:
```bash
dotnet test
```

Expected: PASS - All User tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add User, Household, and HouseholdMember models"
```

Expected: Commit created

---

### Task 5: Database Models - Store and Inventory

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/Store.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/InventoryItem.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/InventoryItemTests.cs`

**Step 1: Write failing test for InventoryItem**

Create `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/InventoryItemTests.cs`:
```csharp
// ABOUTME: Tests for InventoryItem entity model
// ABOUTME: Validates inventory properties and ownership scoping

using AGDevX.Cart.Shared.Models;
using FluentAssertions;

namespace AGDevX.Cart.Data.Tests.Models;

public class InventoryItemTests
{
    [Fact]
    public void Should_HaveHouseholdIdAndNoOwner_When_HouseholdScoped()
    {
        // Arrange & Act
        var item = new InventoryItem
        {
            Name = "Milk",
            HouseholdId = 1,
            OwnerUserId = null
        };

        // Assert
        item.HouseholdId.Should().Be(1);
        item.OwnerUserId.Should().BeNull();
    }

    [Fact]
    public void Should_HaveOwnerAndNoHousehold_When_PersonalScoped()
    {
        // Arrange & Act
        var item = new InventoryItem
        {
            Name = "Personal Item",
            HouseholdId = null,
            OwnerUserId = 5
        };

        // Assert
        item.HouseholdId.Should().BeNull();
        item.OwnerUserId.Should().Be(5);
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - InventoryItem class not found

**Step 3: Create Store model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/Store.cs`:
```csharp
// ABOUTME: Store entity for tracking shopping locations
// ABOUTME: Can be household-scoped or user-scoped (personal stores)

namespace AGDevX.Cart.Shared.Models;

public class Store : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
}
```

**Step 4: Create InventoryItem model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/InventoryItem.cs`:
```csharp
// ABOUTME: InventoryItem entity for master catalog of regularly purchased products
// ABOUTME: Can be household-shared or user-private based on OwnerUserId/HouseholdId

namespace AGDevX.Cart.Shared.Models;

public class InventoryItem : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int? DefaultStoreId { get; set; }
    public Store? DefaultStore { get; set; }
    public string Notes { get; set; } = string.Empty;
    public int? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
```

**Step 5: Run test to verify it passes**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 6: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add Store and InventoryItem models"
```

Expected: Commit created

---

### Task 6: Database Models - Trip Entities

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/Trip.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripCollaborator.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripItem.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/TripTests.cs`

**Step 1: Write failing test for Trip**

Create `AGDevX.Cart/AGDevX.Cart.Data.Tests/Models/TripTests.cs`:
```csharp
// ABOUTME: Tests for Trip entity model
// ABOUTME: Validates trip lifecycle and completion status

using AGDevX.Cart.Shared.Models;
using FluentAssertions;

namespace AGDevX.Cart.Data.Tests.Models;

public class TripTests
{
    [Fact]
    public void Should_NotBeCompleted_When_CreatingNewTrip()
    {
        // Arrange & Act
        var trip = new Trip
        {
            Name = "Weekly Shopping",
            CreatedByUserId = 1
        };

        // Assert
        trip.IsCompleted.Should().BeFalse();
        trip.CompletedAt.Should().BeNull();
    }

    [Fact]
    public void Should_TrackCompletionTime_When_MarkedCompleted()
    {
        // Arrange
        var trip = new Trip
        {
            Name = "Weekly Shopping",
            CreatedByUserId = 1
        };
        var completionTime = DateTime.UtcNow;

        // Act
        trip.IsCompleted = true;
        trip.CompletedAt = completionTime;

        // Assert
        trip.IsCompleted.Should().BeTrue();
        trip.CompletedAt.Should().Be(completionTime);
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - Trip class not found

**Step 3: Create Trip model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/Trip.cs`:
```csharp
// ABOUTME: Trip entity representing discrete shopping sessions
// ABOUTME: Contains items from inventory with quantities and store assignments

namespace AGDevX.Cart.Shared.Models;

public class Trip : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }
    public int CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }

    //== Navigation properties
    public ICollection<TripCollaborator> Collaborators { get; set; } = [];
    public ICollection<TripItem> Items { get; set; } = [];
}
```

**Step 4: Create TripCollaborator model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripCollaborator.cs`:
```csharp
// ABOUTME: Join table for Trip-User many-to-many relationship
// ABOUTME: Tracks which users can view and edit a trip

namespace AGDevX.Cart.Shared.Models;

public class TripCollaborator
{
    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
```

**Step 5: Create TripItem model**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Models/TripItem.cs`:
```csharp
// ABOUTME: TripItem entity linking inventory items to trips with quantities
// ABOUTME: Tracks checked status and allows store override

namespace AGDevX.Cart.Shared.Models;

public class TripItem : BaseEntity
{
    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public int Quantity { get; set; }
    public int? StoreId { get; set; }
    public Store? Store { get; set; }
    public string Notes { get; set; } = string.Empty;
    public bool IsChecked { get; set; }
    public DateTime? CheckedAt { get; set; }
}
```

**Step 6: Run test to verify it passes**

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
git commit -m "feat: add Trip, TripCollaborator, and TripItem models"
```

Expected: Commit created

---

### Task 7: DbContext and Repository Pattern

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/CartDbContext.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data.Tests/CartDbContextTests.cs`

**Step 1: Write failing test for DbContext**

Create `AGDevX.Cart/AGDevX.Cart.Data.Tests/CartDbContextTests.cs`:
```csharp
// ABOUTME: Tests for CartDbContext configuration and relationships
// ABOUTME: Validates entity mappings and database setup

using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Tests;

public class CartDbContextTests
{
    [Fact]
    public void Should_ConfigureAllEntities_When_CreatingContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb")
            .Options;

        // Act
        using var context = new CartDbContext(options);

        // Assert
        context.Users.Should().NotBeNull();
        context.Households.Should().NotBeNull();
        context.Stores.Should().NotBeNull();
        context.InventoryItems.Should().NotBeNull();
        context.Trips.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_CreateUser_When_AddingToContext()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        // Act
        await using (var context = new CartDbContext(options))
        {
            var user = new User
            {
                Email = "test@example.com",
                DisplayName = "Test",
                PasswordHash = "hash"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
        }

        // Assert
        await using (var context = new CartDbContext(options))
        {
            var users = await context.Users.ToListAsync();
            users.Should().HaveCount(1);
            users[0].Email.Should().Be("test@example.com");
        }
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - CartDbContext not found

**Step 3: Create DbContext**

Create `AGDevX.Cart/AGDevX.Cart.Data/CartDbContext.cs`:
```csharp
// ABOUTME: Entity Framework DbContext for the Cart application
// ABOUTME: Configures entity relationships and database schema

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data;

public class CartDbContext(DbContextOptions<CartDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Household> Households { get; set; }
    public DbSet<HouseholdMember> HouseholdMembers { get; set; }
    public DbSet<Store> Stores { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<Trip> Trips { get; set; }
    public DbSet<TripCollaborator> TripCollaborators { get; set; }
    public DbSet<TripItem> TripItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //== HouseholdMember - composite key
        modelBuilder.Entity<HouseholdMember>()
            .HasKey(hm => new { hm.HouseholdId, hm.UserId });

        modelBuilder.Entity<HouseholdMember>()
            .HasOne(hm => hm.Household)
            .WithMany(h => h.Members)
            .HasForeignKey(hm => hm.HouseholdId);

        modelBuilder.Entity<HouseholdMember>()
            .HasOne(hm => hm.User)
            .WithMany(u => u.HouseholdMemberships)
            .HasForeignKey(hm => hm.UserId);

        //== TripCollaborator - composite key
        modelBuilder.Entity<TripCollaborator>()
            .HasKey(tc => new { tc.TripId, tc.UserId });

        modelBuilder.Entity<TripCollaborator>()
            .HasOne(tc => tc.Trip)
            .WithMany(t => t.Collaborators)
            .HasForeignKey(tc => tc.TripId);

        //== User email unique index
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
    }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 5: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add CartDbContext with entity configuration"
```

Expected: Commit created

---

### Task 8: Initial Database Migration

**Files:**
- Modify: `AGDevX.Cart/AGDevX.Cart.Api/Program.cs`
- Modify: `AGDevX.Cart/AGDevX.Cart.Api/appSettings.json`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Migrations/` (auto-generated)

**Step 1: Rename appsettings.json to appSettings.json**

Run:
```bash
cd AGDevX.Cart/AGDevX.Cart.Api
mv appsettings.json appSettings.json
mv appsettings.Development.json appSettings.Development.json
```

Expected: Files renamed

**Step 2: Update Program.cs to use DbContext**

Modify `AGDevX.Cart/AGDevX.Cart.Api/Program.cs`:
```csharp
// ABOUTME: Application entry point and service configuration
// ABOUTME: Configures dependency injection, middleware pipeline, and database

using AGDevX.Cart.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

//== Add services to the container
builder.Services.AddControllers();
builder.Services.AddOpenApi();

//== Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<CartDbContext>(options =>
    options.UseSqlite(connectionString));

var app = builder.Build();

//== Run migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CartDbContext>();
    db.Database.Migrate();
}

//== Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

**Step 3: Add connection string to appSettings.json**

Modify `AGDevX.Cart/AGDevX.Cart.Api/appSettings.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=cart.db"
  }
}
```

**Step 4: Add EF Design package to Data project**

Run:
```bash
cd ..
dotnet add AGDevX.Cart.Data/AGDevX.Cart.Data.csproj package Microsoft.EntityFrameworkCore.Design
```

Expected: Package installed

**Step 5: Create initial migration**

Run:
```bash
dotnet ef migrations add InitialCreate --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

Expected: Migration created successfully

**Step 6: Verify build**

Run:
```bash
dotnet build
```

Expected: Build succeeds

**Step 7: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add database migration and connection configuration"
```

Expected: Commit created

---

## Phase 3: Authentication Layer (Auth Project)

### Task 9: JWT Configuration

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Configuration/IJwtSettings.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/Configuration/JwtSettings.cs`
- Modify: `AGDevX.Cart/AGDevX.Cart.Api/appSettings.json`

**Step 1: Create IJwtSettings interface**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Configuration/IJwtSettings.cs`:
```csharp
// ABOUTME: Interface for JWT authentication settings
// ABOUTME: Defines token expiration and signing key configuration

namespace AGDevX.Cart.Shared.Configuration;

public interface IJwtSettings
{
    string Secret { get; }
    int AccessTokenExpirationMinutes { get; }
    int RefreshTokenExpirationDays { get; }
    string Issuer { get; }
    string Audience { get; }
}
```

**Step 2: Create JwtSettings implementation**

Create `AGDevX.Cart/AGDevX.Cart.Shared/Configuration/JwtSettings.cs`:
```csharp
// ABOUTME: Implementation of JWT authentication settings
// ABOUTME: Bound from configuration and registered in DI container

namespace AGDevX.Cart.Shared.Configuration;

public class JwtSettings : IJwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
}
```

**Step 3: Add JWT settings to appSettings.json**

Modify `AGDevX.Cart/AGDevX.Cart.Api/appSettings.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=cart.db"
  },
  "JwtSettings": {
    "Secret": "CHANGE-THIS-IN-PRODUCTION-TO-A-SECURE-KEY-AT-LEAST-32-CHARACTERS-LONG",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 7,
    "Issuer": "AGDevX.Cart",
    "Audience": "AGDevX.Cart.Client"
  }
}
```

**Step 4: Add development-specific settings**

Modify `AGDevX.Cart/AGDevX.Cart.Api/appSettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  },
  "JwtSettings": {
    "Secret": "development-secret-key-for-local-testing-only-must-be-at-least-32-characters"
  }
}
```

**Step 5: Commit**

Run:
```bash
cd AGDevX.Cart/..
git add .
git commit -m "feat: add JWT configuration with interface-based settings"
```

Expected: Commit created

---

### Task 10: Auth DTOs and Service Interface

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/LoginRequest.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/RegisterRequest.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/AuthResponse.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Auth/IAuthService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`

**Step 1: Create DTOs**

Create `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/LoginRequest.cs`:
```csharp
// ABOUTME: Data transfer object for user login requests
// ABOUTME: Contains email and password credentials

namespace AGDevX.Cart.Shared.DTOs;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
```

Create `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/RegisterRequest.cs`:
```csharp
// ABOUTME: Data transfer object for user registration requests
// ABOUTME: Contains user account creation details

namespace AGDevX.Cart.Shared.DTOs;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
```

Create `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/AuthResponse.cs`:
```csharp
// ABOUTME: Data transfer object for authentication responses
// ABOUTME: Contains JWT access token and refresh token

namespace AGDevX.Cart.Shared.DTOs;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
```

**Step 2: Create IAuthService interface**

Create `AGDevX.Cart/AGDevX.Cart.Auth/IAuthService.cs`:
```csharp
// ABOUTME: Interface for authentication service abstraction
// ABOUTME: Allows easy migration from JWT to Auth0 in Phase 2

using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
}
```

**Step 3: Write failing test for AuthService**

Create `AGDevX.Cart/AGDevX.Cart.Auth.Tests/AuthServiceTests.cs`:
```csharp
// ABOUTME: Tests for authentication service implementation
// ABOUTME: Validates user registration, login, and token generation

using AGDevX.Cart.Auth;
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.Configuration;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Auth.Tests;

public class AuthServiceTests
{
    private readonly CartDbContext _context;
    private readonly IJwtSettings _jwtSettings;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<CartDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new CartDbContext(options);

        _jwtSettings = new JwtSettings
        {
            Secret = "test-secret-key-for-unit-tests-must-be-at-least-32-chars",
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = 7,
            Issuer = "test",
            Audience = "test"
        };
    }

    [Fact]
    public async Task Should_CreateNewUser_When_RegisteringWithValidData()
    {
        // Arrange
        var service = new AuthService(_context, _jwtSettings);
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123",
            DisplayName = "Test User"
        };

        // Act
        var response = await service.RegisterAsync(request);

        // Assert
        response.Should().NotBeNull();
        response.Email.Should().Be("test@example.com");
        response.AccessToken.Should().NotBeNullOrEmpty();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        user.Should().NotBeNull();
    }

    [Fact]
    public async Task Should_ReturnToken_When_LoginWithValidCredentials()
    {
        // Arrange
        var service = new AuthService(_context, _jwtSettings);
        var registerRequest = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123",
            DisplayName = "Test User"
        };
        await service.RegisterAsync(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };

        // Act
        var response = await service.LoginAsync(loginRequest);

        // Assert
        response.Should().NotBeNull();
        response.AccessToken.Should().NotBeNullOrEmpty();
    }
}
```

**Step 4: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - AuthService not found

**Step 5: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add auth DTOs, interface, and tests"
```

Expected: Commit created

---

### Task 11: Implement AuthService

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Auth/AuthService.cs`

**Step 1: Implement AuthService**

Create `AGDevX.Cart/AGDevX.Cart.Auth/AuthService.cs`:
```csharp
// ABOUTME: JWT-based authentication service implementation
// ABOUTME: Handles user registration, login, and token generation/refresh

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.Configuration;
using AGDevX.Cart.Shared.DTOs;
using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AGDevX.Cart.Auth;

public class AuthService(CartDbContext context, IJwtSettings jwtSettings) : IAuthService
{
    private readonly CartDbContext _context = context;
    private readonly IJwtSettings _jwtSettings = jwtSettings;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser != null)
        {
            throw new InvalidOperationException("Email already registered");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            CreatedBy = 0, //== System user for registration
            CreatedDate = DateTime.UtcNow,
            ModifiedBy = 0,
            ModifiedDate = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return GenerateAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        return GenerateAuthResponse(user);
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        var principal = ValidateToken(refreshToken);
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid token");
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found");
        }

        return GenerateAuthResponse(user);
    }

    private AuthResponse GenerateAuthResponse(User user)
    {
        var accessToken = GenerateToken(user, _jwtSettings.AccessTokenExpirationMinutes);
        var refreshToken = GenerateToken(user, _jwtSettings.RefreshTokenExpirationDays * 24 * 60);

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            UserId = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName
        };
    }

    private string GenerateToken(User user, int expirationMinutes)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName)
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private ClaimsPrincipal ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSettings.Secret);

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwtSettings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        return tokenHandler.ValidateToken(token, validationParameters, out _);
    }
}
```

**Step 2: Run tests to verify they pass**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: PASS - All AuthService tests pass

**Step 3: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: implement JWT-based AuthService with primary constructor"
```

Expected: Commit created

---

### Task 12: Auth Controller and Middleware

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Api/Controllers/AuthController.cs`
- Modify: `AGDevX.Cart/AGDevX.Cart.Api/Program.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/AuthControllerTests.cs`

**Step 1: Write failing test for AuthController**

Create `AGDevX.Cart/AGDevX.Cart.Api.Tests/Controllers/AuthControllerTests.cs`:
```csharp
// ABOUTME: Tests for authentication controller endpoints
// ABOUTME: Validates registration and login API behavior

using AGDevX.Cart.Api.Controllers;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AGDevX.Cart.Api.Tests.Controllers;

public class AuthControllerTests
{
    [Fact]
    public async Task Should_ReturnOk_When_RegisteringWithValidRequest()
    {
        // Arrange
        var mockAuthService = new Mock<IAuthService>();
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123",
            DisplayName = "Test User"
        };
        var expectedResponse = new AuthResponse
        {
            AccessToken = "token",
            UserId = 1,
            Email = "test@example.com"
        };
        mockAuthService.Setup(s => s.RegisterAsync(request))
            .ReturnsAsync(expectedResponse);

        var controller = new AuthController(mockAuthService.Object);

        // Act
        var result = await controller.Register(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(expectedResponse);
    }

    [Fact]
    public async Task Should_ReturnOk_When_LoginWithValidCredentials()
    {
        // Arrange
        var mockAuthService = new Mock<IAuthService>();
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };
        var expectedResponse = new AuthResponse
        {
            AccessToken = "token",
            UserId = 1,
            Email = "test@example.com"
        };
        mockAuthService.Setup(s => s.LoginAsync(request))
            .ReturnsAsync(expectedResponse);

        var controller = new AuthController(mockAuthService.Object);

        // Act
        var result = await controller.Login(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(expectedResponse);
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - AuthController not found

**Step 3: Create AuthController**

Create `AGDevX.Cart/AGDevX.Cart.Api/Controllers/AuthController.cs`:
```csharp
// ABOUTME: Authentication API controller for user registration and login
// ABOUTME: Provides endpoints for JWT token generation and refresh

using AGDevX.Cart.Auth;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private readonly IAuthService _authService = authService;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { errorCode = "DUPLICATE_EMAIL", message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(request.RefreshToken);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { errorCode = "UNAUTHORIZED", message = ex.Message });
        }
    }
}
```

**Step 4: Create RefreshTokenRequest DTO**

Create `AGDevX.Cart/AGDevX.Cart.Shared/DTOs/RefreshTokenRequest.cs`:
```csharp
// ABOUTME: Data transfer object for token refresh requests
// ABOUTME: Contains the refresh token to be validated

namespace AGDevX.Cart.Shared.DTOs;

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}
```

**Step 5: Configure JWT in Program.cs**

Modify `AGDevX.Cart/AGDevX.Cart.Api/Program.cs`:
```csharp
// ABOUTME: Application entry point and service configuration
// ABOUTME: Configures dependency injection, middleware pipeline, and database

using System.Text;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Data;
using AGDevX.Cart.Shared.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

//== Add services to the container
builder.Services.AddControllers();
builder.Services.AddOpenApi();

//== Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<CartDbContext>(options =>
    options.UseSqlite(connectionString));

//== JWT Settings - Interface-based configuration
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();
if (jwtSettings == null)
{
    throw new InvalidOperationException("JwtSettings configuration is missing");
}
builder.Services.AddSingleton<IJwtSettings>(jwtSettings);

//== Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

//== Services
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

//== Run migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CartDbContext>();
    db.Database.Migrate();
}

//== Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
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
git commit -m "feat: add AuthController and JWT middleware with interface-based config"
```

Expected: Commit created

---

## Phase 4: Business Logic (Services Project)

### Task 13: Household Service and Repository

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IHouseholdRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/IHouseholdService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/HouseholdService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/HouseholdServiceTests.cs`

**Step 1: Create repository interface**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IHouseholdRepository.cs`:
```csharp
// ABOUTME: Repository interface for household data access
// ABOUTME: Abstracts database operations for household entities

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetByIdAsync(int id);
    Task<IEnumerable<Household>> GetUserHouseholdsAsync(int userId);
    Task<Household> CreateAsync(Household household);
    Task UpdateAsync(Household household);
    Task DeleteAsync(int id);
    Task<bool> IsUserMemberAsync(int householdId, int userId);
}
```

**Step 2: Write failing test for HouseholdService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/HouseholdServiceTests.cs`:
```csharp
// ABOUTME: Tests for household business logic service
// ABOUTME: Validates household creation, membership, and access control

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class HouseholdServiceTests
{
    [Fact]
    public async Task Should_CreateHousehold_When_UserCreatesNew()
    {
        // Arrange
        var mockRepo = new Mock<IHouseholdRepository>();
        var service = new HouseholdService(mockRepo.Object);
        var household = new Household { Name = "Test Household" };
        var userId = 1;

        mockRepo.Setup(r => r.CreateAsync(It.IsAny<Household>()))
            .ReturnsAsync(household);

        // Act
        var result = await service.CreateHouseholdAsync(household, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Household");
        mockRepo.Verify(r => r.CreateAsync(It.IsAny<Household>()), Times.Once);
    }
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - HouseholdService not found

**Step 4: Create service interface**

Create `AGDevX.Cart/AGDevX.Cart.Services/IHouseholdService.cs`:
```csharp
// ABOUTME: Service interface for household business logic
// ABOUTME: Handles household creation, membership management, and authorization

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHouseholdAsync(Household household, int userId);
    Task<IEnumerable<Household>> GetUserHouseholdsAsync(int userId);
    Task<Household?> GetByIdAsync(int id, int userId);
    Task UpdateHouseholdAsync(Household household, int userId);
    Task DeleteHouseholdAsync(int id, int userId);
}
```

**Step 5: Implement HouseholdRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/HouseholdRepository.cs`:
```csharp
// ABOUTME: Repository implementation for household data access
// ABOUTME: Provides EF Core-based CRUD operations for households

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    private readonly CartDbContext _context = context;

    public async Task<Household?> GetByIdAsync(int id) =>
        await _context.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == id);

    public async Task<IEnumerable<Household>> GetUserHouseholdsAsync(int userId) =>
        await _context.Households
            .Where(h => h.Members.Any(m => m.UserId == userId))
            .ToListAsync();

    public async Task<Household> CreateAsync(Household household)
    {
        _context.Households.Add(household);
        await _context.SaveChangesAsync();
        return household;
    }

    public async Task UpdateAsync(Household household)
    {
        _context.Households.Update(household);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var household = await _context.Households.FindAsync(id);
        if (household != null)
        {
            _context.Households.Remove(household);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> IsUserMemberAsync(int householdId, int userId) =>
        await _context.HouseholdMembers
            .AnyAsync(hm => hm.HouseholdId == householdId && hm.UserId == userId);
}
```

**Step 6: Implement HouseholdService**

Create `AGDevX.Cart/AGDevX.Cart.Services/HouseholdService.cs`:
```csharp
// ABOUTME: Service implementation for household business logic
// ABOUTME: Orchestrates household operations with authorization checks

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class HouseholdService(IHouseholdRepository repository) : IHouseholdService
{
    private readonly IHouseholdRepository _repository = repository;

    public async Task<Household> CreateHouseholdAsync(Household household, int userId)
    {
        household.CreatedBy = userId;
        household.CreatedDate = DateTime.UtcNow;
        household.ModifiedBy = userId;
        household.ModifiedDate = DateTime.UtcNow;

        var created = await _repository.CreateAsync(household);

        //== Add creator as owner member
        var member = new HouseholdMember
        {
            HouseholdId = created.Id,
            UserId = userId,
            Role = "owner",
            JoinedAt = DateTime.UtcNow
        };
        created.Members.Add(member);

        return created;
    }

    public async Task<IEnumerable<Household>> GetUserHouseholdsAsync(int userId) =>
        await _repository.GetUserHouseholdsAsync(userId);

    public async Task<Household?> GetByIdAsync(int id, int userId)
    {
        var household = await _repository.GetByIdAsync(id);
        if (household == null)
        {
            return null;
        }

        var isMember = await _repository.IsUserMemberAsync(id, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return household;
    }

    public async Task UpdateHouseholdAsync(Household household, int userId)
    {
        var isMember = await _repository.IsUserMemberAsync(household.Id, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        household.ModifiedBy = userId;
        household.ModifiedDate = DateTime.UtcNow;

        await _repository.UpdateAsync(household);
    }

    public async Task DeleteHouseholdAsync(int id, int userId)
    {
        var isMember = await _repository.IsUserMemberAsync(id, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        await _repository.DeleteAsync(id);
    }
}
```

**Step 7: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add household repository and service with authorization"
```

Expected: Commit created

---

## Phase 4 (Continued): Remaining Services and Repositories

### Task 14: Store Service and Repository

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IStoreRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/StoreRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/IStoreService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/StoreService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`

**Step 1: Write failing test for StoreService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/StoreServiceTests.cs`:
```csharp
// ABOUTME: Tests for store business logic service
// ABOUTME: Validates store creation and household/personal scoping

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class StoreServiceTests
{
    [Fact]
    public async Task Should_CreateHouseholdStore_When_UserIsMember()
    {
        // Arrange
        var mockStoreRepo = new Mock<IStoreRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new StoreService(mockStoreRepo.Object, mockHouseholdRepo.Object);

        var store = new Store { Name = "Walmart", HouseholdId = 1 };
        var userId = 1;

        mockHouseholdRepo.Setup(r => r.IsUserMemberAsync(1, userId))
            .ReturnsAsync(true);
        mockStoreRepo.Setup(r => r.CreateAsync(It.IsAny<Store>()))
            .ReturnsAsync(store);

        // Act
        var result = await service.CreateStoreAsync(store, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Walmart");
    }

    [Fact]
    public async Task Should_CreatePersonalStore_When_UserIdMatches()
    {
        // Arrange
        var mockStoreRepo = new Mock<IStoreRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new StoreService(mockStoreRepo.Object, mockHouseholdRepo.Object);

        var store = new Store { Name = "Personal Store", UserId = 1 };
        var userId = 1;

        mockStoreRepo.Setup(r => r.CreateAsync(It.IsAny<Store>()))
            .ReturnsAsync(store);

        // Act
        var result = await service.CreateStoreAsync(store, userId);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - StoreService not found

**Step 3: Create IStoreRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IStoreRepository.cs`:
```csharp
// ABOUTME: Repository interface for store data access
// ABOUTME: Abstracts database operations for store entities

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IStoreRepository
{
    Task<Store?> GetByIdAsync(int id);
    Task<IEnumerable<Store>> GetHouseholdStoresAsync(int householdId);
    Task<IEnumerable<Store>> GetPersonalStoresAsync(int userId);
    Task<Store> CreateAsync(Store store);
    Task UpdateAsync(Store store);
    Task DeleteAsync(int id);
}
```

**Step 4: Implement StoreRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/StoreRepository.cs`:
```csharp
// ABOUTME: Repository implementation for store data access
// ABOUTME: Provides EF Core-based CRUD operations for stores

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class StoreRepository(CartDbContext context) : IStoreRepository
{
    private readonly CartDbContext _context = context;

    public async Task<Store?> GetByIdAsync(int id) =>
        await _context.Stores.FindAsync(id);

    public async Task<IEnumerable<Store>> GetHouseholdStoresAsync(int householdId) =>
        await _context.Stores
            .Where(s => s.HouseholdId == householdId)
            .ToListAsync();

    public async Task<IEnumerable<Store>> GetPersonalStoresAsync(int userId) =>
        await _context.Stores
            .Where(s => s.UserId == userId)
            .ToListAsync();

    public async Task<Store> CreateAsync(Store store)
    {
        _context.Stores.Add(store);
        await _context.SaveChangesAsync();
        return store;
    }

    public async Task UpdateAsync(Store store)
    {
        _context.Stores.Update(store);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var store = await _context.Stores.FindAsync(id);
        if (store != null)
        {
            _context.Stores.Remove(store);
            await _context.SaveChangesAsync();
        }
    }
}
```

**Step 5: Create IStoreService**

Create `AGDevX.Cart/AGDevX.Cart.Services/IStoreService.cs`:
```csharp
// ABOUTME: Service interface for store business logic
// ABOUTME: Handles store creation and authorization for household/personal stores

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IStoreService
{
    Task<Store> CreateStoreAsync(Store store, int userId);
    Task<IEnumerable<Store>> GetHouseholdStoresAsync(int householdId, int userId);
    Task<IEnumerable<Store>> GetPersonalStoresAsync(int userId);
    Task<Store?> GetByIdAsync(int id, int userId);
    Task UpdateStoreAsync(Store store, int userId);
    Task DeleteStoreAsync(int id, int userId);
}
```

**Step 6: Implement StoreService**

Create `AGDevX.Cart/AGDevX.Cart.Services/StoreService.cs`:
```csharp
// ABOUTME: Service implementation for store business logic
// ABOUTME: Orchestrates store operations with authorization checks

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class StoreService(IStoreRepository storeRepository, IHouseholdRepository householdRepository) : IStoreService
{
    private readonly IStoreRepository _storeRepository = storeRepository;
    private readonly IHouseholdRepository _householdRepository = householdRepository;

    public async Task<Store> CreateStoreAsync(Store store, int userId)
    {
        //== Household store requires membership
        if (store.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(store.HouseholdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        //== Personal store must match user
        else if (store.UserId.HasValue && store.UserId != userId)
        {
            throw new UnauthorizedAccessException("Cannot create store for another user");
        }

        store.CreatedBy = userId;
        store.CreatedDate = DateTime.UtcNow;
        store.ModifiedBy = userId;
        store.ModifiedDate = DateTime.UtcNow;

        return await _storeRepository.CreateAsync(store);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStoresAsync(int householdId, int userId)
    {
        var isMember = await _householdRepository.IsUserMemberAsync(householdId, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await _storeRepository.GetHouseholdStoresAsync(householdId);
    }

    public async Task<IEnumerable<Store>> GetPersonalStoresAsync(int userId) =>
        await _storeRepository.GetPersonalStoresAsync(userId);

    public async Task<Store?> GetByIdAsync(int id, int userId)
    {
        var store = await _storeRepository.GetByIdAsync(id);
        if (store == null)
        {
            return null;
        }

        //== Check authorization
        if (store.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(store.HouseholdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        else if (store.UserId.HasValue && store.UserId != userId)
        {
            throw new UnauthorizedAccessException("Cannot access another user's store");
        }

        return store;
    }

    public async Task UpdateStoreAsync(Store store, int userId)
    {
        var existing = await GetByIdAsync(store.Id, userId);
        if (existing == null)
        {
            throw new InvalidOperationException("Store not found");
        }

        store.ModifiedBy = userId;
        store.ModifiedDate = DateTime.UtcNow;

        await _storeRepository.UpdateAsync(store);
    }

    public async Task DeleteStoreAsync(int id, int userId)
    {
        var store = await GetByIdAsync(id, userId);
        if (store == null)
        {
            throw new InvalidOperationException("Store not found");
        }

        await _storeRepository.DeleteAsync(id);
    }
}
```

**Step 7: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add store repository and service with household/personal scoping"
```

Expected: Commit created

---

### Task 15: Inventory Service and Repository

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IInventoryRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/InventoryRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/IInventoryService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/InventoryService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs`

**Step 1: Write failing test for InventoryService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/InventoryServiceTests.cs`:
```csharp
// ABOUTME: Tests for inventory business logic service
// ABOUTME: Validates inventory item privacy and household/personal scoping

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class InventoryServiceTests
{
    [Fact]
    public async Task Should_CreateHouseholdItem_When_UserIsMember()
    {
        // Arrange
        var mockInventoryRepo = new Mock<IInventoryRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new InventoryService(mockInventoryRepo.Object, mockHouseholdRepo.Object);

        var item = new InventoryItem { Name = "Milk", HouseholdId = 1 };
        var userId = 1;

        mockHouseholdRepo.Setup(r => r.IsUserMemberAsync(1, userId))
            .ReturnsAsync(true);
        mockInventoryRepo.Setup(r => r.CreateAsync(It.IsAny<InventoryItem>()))
            .ReturnsAsync(item);

        // Act
        var result = await service.CreateInventoryItemAsync(item, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Milk");
    }

    [Fact]
    public async Task Should_OnlyReturnUserItems_When_GettingPersonalInventory()
    {
        // Arrange
        var mockInventoryRepo = new Mock<IInventoryRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new InventoryService(mockInventoryRepo.Object, mockHouseholdRepo.Object);

        var userId = 1;
        var personalItems = new List<InventoryItem>
        {
            new InventoryItem { Name = "Personal Item", OwnerUserId = userId }
        };

        mockInventoryRepo.Setup(r => r.GetPersonalItemsAsync(userId))
            .ReturnsAsync(personalItems);

        // Act
        var result = await service.GetPersonalInventoryAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.First().OwnerUserId.Should().Be(userId);
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - InventoryService not found

**Step 3: Create IInventoryRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/IInventoryRepository.cs`:
```csharp
// ABOUTME: Repository interface for inventory data access
// ABOUTME: Abstracts database operations with privacy filtering

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IInventoryRepository
{
    Task<InventoryItem?> GetByIdAsync(int id);
    Task<IEnumerable<InventoryItem>> GetHouseholdItemsAsync(int householdId);
    Task<IEnumerable<InventoryItem>> GetPersonalItemsAsync(int userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(int householdId, int userId);
    Task<InventoryItem> CreateAsync(InventoryItem item);
    Task UpdateAsync(InventoryItem item);
    Task DeleteAsync(int id);
}
```

**Step 4: Implement InventoryRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/InventoryRepository.cs`:
```csharp
// ABOUTME: Repository implementation for inventory data access
// ABOUTME: Enforces privacy by filtering items based on ownership

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class InventoryRepository(CartDbContext context) : IInventoryRepository
{
    private readonly CartDbContext _context = context;

    public async Task<InventoryItem?> GetByIdAsync(int id) =>
        await _context.InventoryItems
            .Include(i => i.DefaultStore)
            .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<IEnumerable<InventoryItem>> GetHouseholdItemsAsync(int householdId) =>
        await _context.InventoryItems
            .Where(i => i.HouseholdId == householdId)
            .Include(i => i.DefaultStore)
            .ToListAsync();

    public async Task<IEnumerable<InventoryItem>> GetPersonalItemsAsync(int userId) =>
        await _context.InventoryItems
            .Where(i => i.OwnerUserId == userId)
            .Include(i => i.DefaultStore)
            .ToListAsync();

    public async Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(int householdId, int userId) =>
        await _context.InventoryItems
            .Where(i => i.HouseholdId == householdId || i.OwnerUserId == userId)
            .Include(i => i.DefaultStore)
            .ToListAsync();

    public async Task<InventoryItem> CreateAsync(InventoryItem item)
    {
        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }

    public async Task UpdateAsync(InventoryItem item)
    {
        _context.InventoryItems.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item != null)
        {
            _context.InventoryItems.Remove(item);
            await _context.SaveChangesAsync();
        }
    }
}
```

**Step 5: Create IInventoryService**

Create `AGDevX.Cart/AGDevX.Cart.Services/IInventoryService.cs`:
```csharp
// ABOUTME: Service interface for inventory business logic
// ABOUTME: Handles inventory with strict privacy and authorization

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IInventoryService
{
    Task<InventoryItem> CreateInventoryItemAsync(InventoryItem item, int userId);
    Task<IEnumerable<InventoryItem>> GetHouseholdInventoryAsync(int householdId, int userId);
    Task<IEnumerable<InventoryItem>> GetPersonalInventoryAsync(int userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(int householdId, int userId);
    Task<InventoryItem?> GetByIdAsync(int id, int userId);
    Task UpdateInventoryItemAsync(InventoryItem item, int userId);
    Task DeleteInventoryItemAsync(int id, int userId);
}
```

**Step 6: Implement InventoryService**

Create `AGDevX.Cart/AGDevX.Cart.Services/InventoryService.cs`:
```csharp
// ABOUTME: Service implementation for inventory business logic
// ABOUTME: Enforces privacy rules for personal items and household authorization

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class InventoryService(IInventoryRepository inventoryRepository, IHouseholdRepository householdRepository) : IInventoryService
{
    private readonly IInventoryRepository _inventoryRepository = inventoryRepository;
    private readonly IHouseholdRepository _householdRepository = householdRepository;

    public async Task<InventoryItem> CreateInventoryItemAsync(InventoryItem item, int userId)
    {
        //== Household item requires membership
        if (item.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(item.HouseholdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        //== Personal item must match user
        else if (item.OwnerUserId.HasValue && item.OwnerUserId != userId)
        {
            throw new UnauthorizedAccessException("Cannot create item for another user");
        }

        item.CreatedBy = userId;
        item.CreatedDate = DateTime.UtcNow;
        item.ModifiedBy = userId;
        item.ModifiedDate = DateTime.UtcNow;

        return await _inventoryRepository.CreateAsync(item);
    }

    public async Task<IEnumerable<InventoryItem>> GetHouseholdInventoryAsync(int householdId, int userId)
    {
        var isMember = await _householdRepository.IsUserMemberAsync(householdId, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await _inventoryRepository.GetHouseholdItemsAsync(householdId);
    }

    public async Task<IEnumerable<InventoryItem>> GetPersonalInventoryAsync(int userId) =>
        await _inventoryRepository.GetPersonalItemsAsync(userId);

    public async Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(int householdId, int userId)
    {
        var isMember = await _householdRepository.IsUserMemberAsync(householdId, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await _inventoryRepository.GetMergedInventoryAsync(householdId, userId);
    }

    public async Task<InventoryItem?> GetByIdAsync(int id, int userId)
    {
        var item = await _inventoryRepository.GetByIdAsync(id);
        if (item == null)
        {
            return null;
        }

        //== Check authorization
        if (item.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(item.HouseholdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        else if (item.OwnerUserId.HasValue && item.OwnerUserId != userId)
        {
            throw new UnauthorizedAccessException("Cannot access another user's item");
        }

        return item;
    }

    public async Task UpdateInventoryItemAsync(InventoryItem item, int userId)
    {
        var existing = await GetByIdAsync(item.Id, userId);
        if (existing == null)
        {
            throw new InvalidOperationException("Inventory item not found");
        }

        item.ModifiedBy = userId;
        item.ModifiedDate = DateTime.UtcNow;

        await _inventoryRepository.UpdateAsync(item);
    }

    public async Task DeleteInventoryItemAsync(int id, int userId)
    {
        var item = await GetByIdAsync(id, userId);
        if (item == null)
        {
            throw new InvalidOperationException("Inventory item not found");
        }

        await _inventoryRepository.DeleteAsync(id);
    }
}
```

**Step 7: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add inventory repository and service with privacy enforcement"
```

Expected: Commit created

---

### Task 16: Trip Service and Repository

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/ITripRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/TripRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/ITripService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/TripService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripServiceTests.cs`

**Step 1: Write failing test for TripService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripServiceTests.cs`:
```csharp
// ABOUTME: Tests for trip business logic service
// ABOUTME: Validates trip lifecycle, collaboration, and authorization

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class TripServiceTests
{
    [Fact]
    public async Task Should_CreateTrip_When_UserIsMember()
    {
        // Arrange
        var mockTripRepo = new Mock<ITripRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new TripService(mockTripRepo.Object, mockHouseholdRepo.Object);

        var trip = new Trip { Name = "Weekly Shopping", HouseholdId = 1 };
        var userId = 1;

        mockHouseholdRepo.Setup(r => r.IsUserMemberAsync(1, userId))
            .ReturnsAsync(true);
        mockTripRepo.Setup(r => r.CreateAsync(It.IsAny<Trip>()))
            .ReturnsAsync(trip);

        // Act
        var result = await service.CreateTripAsync(trip, userId);

        // Assert
        result.Should().NotBeNull();
        result.CreatedByUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Should_CompleteTrip_When_UserIsCollaborator()
    {
        // Arrange
        var mockTripRepo = new Mock<ITripRepository>();
        var mockHouseholdRepo = new Mock<IHouseholdRepository>();
        var service = new TripService(mockTripRepo.Object, mockHouseholdRepo.Object);

        var tripId = 1;
        var userId = 1;
        var trip = new Trip { Id = tripId, Name = "Test", IsCompleted = false };

        mockTripRepo.Setup(r => r.GetByIdAsync(tripId))
            .ReturnsAsync(trip);
        mockTripRepo.Setup(r => r.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);

        // Act
        await service.CompleteTripAsync(tripId, userId);

        // Assert
        trip.IsCompleted.Should().BeTrue();
        trip.CompletedAt.Should().NotBeNull();
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - TripService not found

**Step 3: Create ITripRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/ITripRepository.cs`:
```csharp
// ABOUTME: Repository interface for trip data access
// ABOUTME: Abstracts database operations for trip entities and collaborators

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetByIdAsync(int id);
    Task<IEnumerable<Trip>> GetUserTripsAsync(int userId);
    Task<IEnumerable<Trip>> GetHouseholdTripsAsync(int householdId);
    Task<Trip> CreateAsync(Trip trip);
    Task UpdateAsync(Trip trip);
    Task DeleteAsync(int id);
    Task<bool> IsUserCollaboratorAsync(int tripId, int userId);
    Task AddCollaboratorAsync(int tripId, int userId);
    Task RemoveCollaboratorAsync(int tripId, int userId);
}
```

**Step 4: Implement TripRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/TripRepository.cs`:
```csharp
// ABOUTME: Repository implementation for trip data access
// ABOUTME: Provides EF Core-based CRUD and collaborator management

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripRepository(CartDbContext context) : ITripRepository
{
    private readonly CartDbContext _context = context;

    public async Task<Trip?> GetByIdAsync(int id) =>
        await _context.Trips
            .Include(t => t.Items)
                .ThenInclude(i => i.InventoryItem)
            .Include(t => t.Items)
                .ThenInclude(i => i.Store)
            .Include(t => t.Collaborators)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<IEnumerable<Trip>> GetUserTripsAsync(int userId) =>
        await _context.Trips
            .Where(t => t.CreatedByUserId == userId || t.Collaborators.Any(c => c.UserId == userId))
            .Include(t => t.Items)
            .ToListAsync();

    public async Task<IEnumerable<Trip>> GetHouseholdTripsAsync(int householdId) =>
        await _context.Trips
            .Where(t => t.HouseholdId == householdId)
            .Include(t => t.Items)
            .ToListAsync();

    public async Task<Trip> CreateAsync(Trip trip)
    {
        _context.Trips.Add(trip);
        await _context.SaveChangesAsync();
        return trip;
    }

    public async Task UpdateAsync(Trip trip)
    {
        _context.Trips.Update(trip);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var trip = await _context.Trips.FindAsync(id);
        if (trip != null)
        {
            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> IsUserCollaboratorAsync(int tripId, int userId)
    {
        var trip = await _context.Trips
            .Include(t => t.Collaborators)
            .FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            return false;
        }

        return trip.CreatedByUserId == userId ||
               trip.Collaborators.Any(c => c.UserId == userId);
    }

    public async Task AddCollaboratorAsync(int tripId, int userId)
    {
        var collaborator = new TripCollaborator
        {
            TripId = tripId,
            UserId = userId
        };

        _context.TripCollaborators.Add(collaborator);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveCollaboratorAsync(int tripId, int userId)
    {
        var collaborator = await _context.TripCollaborators
            .FirstOrDefaultAsync(tc => tc.TripId == tripId && tc.UserId == userId);

        if (collaborator != null)
        {
            _context.TripCollaborators.Remove(collaborator);
            await _context.SaveChangesAsync();
        }
    }
}
```

**Step 5: Create ITripService**

Create `AGDevX.Cart/AGDevX.Cart.Services/ITripService.cs`:
```csharp
// ABOUTME: Service interface for trip business logic
// ABOUTME: Handles trip lifecycle and collaboration management

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTripAsync(Trip trip, int userId);
    Task<IEnumerable<Trip>> GetUserTripsAsync(int userId);
    Task<IEnumerable<Trip>> GetHouseholdTripsAsync(int householdId, int userId);
    Task<Trip?> GetByIdAsync(int id, int userId);
    Task UpdateTripAsync(Trip trip, int userId);
    Task DeleteTripAsync(int id, int userId);
    Task CompleteTripAsync(int id, int userId);
    Task ReopenTripAsync(int id, int userId);
    Task AddCollaboratorAsync(int tripId, int collaboratorUserId, int requestingUserId);
    Task RemoveCollaboratorAsync(int tripId, int collaboratorUserId, int requestingUserId);
}
```

**Step 6: Implement TripService**

Create `AGDevX.Cart/AGDevX.Cart.Services/TripService.cs`:
```csharp
// ABOUTME: Service implementation for trip business logic
// ABOUTME: Orchestrates trip operations with authorization and lifecycle management

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository, IHouseholdRepository householdRepository) : ITripService
{
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly IHouseholdRepository _householdRepository = householdRepository;

    public async Task<Trip> CreateTripAsync(Trip trip, int userId)
    {
        //== Household trip requires membership
        if (trip.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(trip.HouseholdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }

        trip.CreatedByUserId = userId;
        trip.CreatedBy = userId;
        trip.CreatedDate = DateTime.UtcNow;
        trip.ModifiedBy = userId;
        trip.ModifiedDate = DateTime.UtcNow;

        return await _tripRepository.CreateAsync(trip);
    }

    public async Task<IEnumerable<Trip>> GetUserTripsAsync(int userId) =>
        await _tripRepository.GetUserTripsAsync(userId);

    public async Task<IEnumerable<Trip>> GetHouseholdTripsAsync(int householdId, int userId)
    {
        var isMember = await _householdRepository.IsUserMemberAsync(householdId, userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await _tripRepository.GetHouseholdTripsAsync(householdId);
    }

    public async Task<Trip?> GetByIdAsync(int id, int userId)
    {
        var trip = await _tripRepository.GetByIdAsync(id);
        if (trip == null)
        {
            return null;
        }

        //== Check if user is creator or collaborator
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(id, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return trip;
    }

    public async Task UpdateTripAsync(Trip trip, int userId)
    {
        var existing = await GetByIdAsync(trip.Id, userId);
        if (existing == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        if (existing.IsCompleted)
        {
            throw new InvalidOperationException("Cannot update completed trip");
        }

        trip.ModifiedBy = userId;
        trip.ModifiedDate = DateTime.UtcNow;

        await _tripRepository.UpdateAsync(trip);
    }

    public async Task DeleteTripAsync(int id, int userId)
    {
        var trip = await GetByIdAsync(id, userId);
        if (trip == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        //== Only creator can delete
        if (trip.CreatedByUserId != userId)
        {
            throw new UnauthorizedAccessException("Only trip creator can delete");
        }

        await _tripRepository.DeleteAsync(id);
    }

    public async Task CompleteTripAsync(int id, int userId)
    {
        var trip = await GetByIdAsync(id, userId);
        if (trip == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        trip.IsCompleted = true;
        trip.CompletedAt = DateTime.UtcNow;
        trip.ModifiedBy = userId;
        trip.ModifiedDate = DateTime.UtcNow;

        await _tripRepository.UpdateAsync(trip);
    }

    public async Task ReopenTripAsync(int id, int userId)
    {
        var trip = await GetByIdAsync(id, userId);
        if (trip == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        trip.IsCompleted = false;
        trip.CompletedAt = null;
        trip.ModifiedBy = userId;
        trip.ModifiedDate = DateTime.UtcNow;

        await _tripRepository.UpdateAsync(trip);
    }

    public async Task AddCollaboratorAsync(int tripId, int collaboratorUserId, int requestingUserId)
    {
        var trip = await GetByIdAsync(tripId, requestingUserId);
        if (trip == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        //== Verify collaborator is in same household (if household trip)
        if (trip.HouseholdId.HasValue)
        {
            var isMember = await _householdRepository.IsUserMemberAsync(trip.HouseholdId.Value, collaboratorUserId);
            if (!isMember)
            {
                throw new InvalidOperationException("Collaborator must be household member");
            }
        }

        await _tripRepository.AddCollaboratorAsync(tripId, collaboratorUserId);
    }

    public async Task RemoveCollaboratorAsync(int tripId, int collaboratorUserId, int requestingUserId)
    {
        var trip = await GetByIdAsync(tripId, requestingUserId);
        if (trip == null)
        {
            throw new InvalidOperationException("Trip not found");
        }

        await _tripRepository.RemoveCollaboratorAsync(tripId, collaboratorUserId);
    }
}
```

**Step 7: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add trip repository and service with lifecycle and collaboration"
```

Expected: Commit created

---

### Task 17: Trip Item Service and Repository

**Files:**
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/ITripItemRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/ITripItemService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services/TripItemService.cs`
- Create: `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs`

**Step 1: Write failing test for TripItemService**

Create `AGDevX.Cart/AGDevX.Cart.Services.Tests/TripItemServiceTests.cs`:
```csharp
// ABOUTME: Tests for trip item business logic service
// ABOUTME: Validates item management and check/uncheck operations

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Models;
using FluentAssertions;
using Moq;

namespace AGDevX.Cart.Services.Tests;

public class TripItemServiceTests
{
    [Fact]
    public async Task Should_AddItemToTrip_When_UserIsCollaborator()
    {
        // Arrange
        var mockTripItemRepo = new Mock<ITripItemRepository>();
        var mockTripRepo = new Mock<ITripRepository>();
        var service = new TripItemService(mockTripItemRepo.Object, mockTripRepo.Object);

        var tripId = 1;
        var userId = 1;
        var tripItem = new TripItem { TripId = tripId, InventoryItemId = 1, Quantity = 2 };

        mockTripRepo.Setup(r => r.IsUserCollaboratorAsync(tripId, userId))
            .ReturnsAsync(true);
        mockTripItemRepo.Setup(r => r.CreateAsync(It.IsAny<TripItem>()))
            .ReturnsAsync(tripItem);

        // Act
        var result = await service.AddTripItemAsync(tripItem, userId);

        // Assert
        result.Should().NotBeNull();
        result.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task Should_CheckItem_When_UserIsCollaborator()
    {
        // Arrange
        var mockTripItemRepo = new Mock<ITripItemRepository>();
        var mockTripRepo = new Mock<ITripRepository>();
        var service = new TripItemService(mockTripItemRepo.Object, mockTripRepo.Object);

        var itemId = 1;
        var userId = 1;
        var tripItem = new TripItem { Id = itemId, TripId = 1, IsChecked = false };

        mockTripItemRepo.Setup(r => r.GetByIdAsync(itemId))
            .ReturnsAsync(tripItem);
        mockTripRepo.Setup(r => r.IsUserCollaboratorAsync(tripItem.TripId, userId))
            .ReturnsAsync(true);

        // Act
        await service.CheckItemAsync(itemId, true, userId);

        // Assert
        tripItem.IsChecked.Should().BeTrue();
        tripItem.CheckedAt.Should().NotBeNull();
    }
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd AGDevX.Cart
dotnet test
```

Expected: FAIL - TripItemService not found

**Step 3: Create ITripItemRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/ITripItemRepository.cs`:
```csharp
// ABOUTME: Repository interface for trip item data access
// ABOUTME: Abstracts database operations for items within trips

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripItemRepository
{
    Task<TripItem?> GetByIdAsync(int id);
    Task<IEnumerable<TripItem>> GetTripItemsAsync(int tripId);
    Task<TripItem> CreateAsync(TripItem tripItem);
    Task UpdateAsync(TripItem tripItem);
    Task DeleteAsync(int id);
}
```

**Step 4: Implement TripItemRepository**

Create `AGDevX.Cart/AGDevX.Cart.Data/Repositories/TripItemRepository.cs`:
```csharp
// ABOUTME: Repository implementation for trip item data access
// ABOUTME: Provides EF Core-based CRUD operations for trip items

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripItemRepository(CartDbContext context) : ITripItemRepository
{
    private readonly CartDbContext _context = context;

    public async Task<TripItem?> GetByIdAsync(int id) =>
        await _context.TripItems
            .Include(ti => ti.InventoryItem)
            .Include(ti => ti.Store)
            .FirstOrDefaultAsync(ti => ti.Id == id);

    public async Task<IEnumerable<TripItem>> GetTripItemsAsync(int tripId) =>
        await _context.TripItems
            .Where(ti => ti.TripId == tripId)
            .Include(ti => ti.InventoryItem)
            .Include(ti => ti.Store)
            .ToListAsync();

    public async Task<TripItem> CreateAsync(TripItem tripItem)
    {
        _context.TripItems.Add(tripItem);
        await _context.SaveChangesAsync();
        return tripItem;
    }

    public async Task UpdateAsync(TripItem tripItem)
    {
        _context.TripItems.Update(tripItem);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var tripItem = await _context.TripItems.FindAsync(id);
        if (tripItem != null)
        {
            _context.TripItems.Remove(tripItem);
            await _context.SaveChangesAsync();
        }
    }
}
```

**Step 5: Create ITripItemService**

Create `AGDevX.Cart/AGDevX.Cart.Services/ITripItemService.cs`:
```csharp
// ABOUTME: Service interface for trip item business logic
// ABOUTME: Handles adding, updating, checking items on trips

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripItemService
{
    Task<TripItem> AddTripItemAsync(TripItem tripItem, int userId);
    Task<IEnumerable<TripItem>> GetTripItemsAsync(int tripId, int userId);
    Task<TripItem?> GetByIdAsync(int id, int userId);
    Task UpdateTripItemAsync(TripItem tripItem, int userId);
    Task DeleteTripItemAsync(int id, int userId);
    Task CheckItemAsync(int id, bool isChecked, int userId);
}
```

**Step 6: Implement TripItemService**

Create `AGDevX.Cart/AGDevX.Cart.Services/TripItemService.cs`:
```csharp
// ABOUTME: Service implementation for trip item business logic
// ABOUTME: Manages items on trips with authorization and state tracking

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripItemService(ITripItemRepository tripItemRepository, ITripRepository tripRepository) : ITripItemService
{
    private readonly ITripItemRepository _tripItemRepository = tripItemRepository;
    private readonly ITripRepository _tripRepository = tripRepository;

    public async Task<TripItem> AddTripItemAsync(TripItem tripItem, int userId)
    {
        //== Verify user is collaborator on trip
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        tripItem.CreatedBy = userId;
        tripItem.CreatedDate = DateTime.UtcNow;
        tripItem.ModifiedBy = userId;
        tripItem.ModifiedDate = DateTime.UtcNow;

        return await _tripItemRepository.CreateAsync(tripItem);
    }

    public async Task<IEnumerable<TripItem>> GetTripItemsAsync(int tripId, int userId)
    {
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return await _tripItemRepository.GetTripItemsAsync(tripId);
    }

    public async Task<TripItem?> GetByIdAsync(int id, int userId)
    {
        var tripItem = await _tripItemRepository.GetByIdAsync(id);
        if (tripItem == null)
        {
            return null;
        }

        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return tripItem;
    }

    public async Task UpdateTripItemAsync(TripItem tripItem, int userId)
    {
        var existing = await GetByIdAsync(tripItem.Id, userId);
        if (existing == null)
        {
            throw new InvalidOperationException("Trip item not found");
        }

        tripItem.ModifiedBy = userId;
        tripItem.ModifiedDate = DateTime.UtcNow;

        await _tripItemRepository.UpdateAsync(tripItem);
    }

    public async Task DeleteTripItemAsync(int id, int userId)
    {
        var tripItem = await GetByIdAsync(id, userId);
        if (tripItem == null)
        {
            throw new InvalidOperationException("Trip item not found");
        }

        await _tripItemRepository.DeleteAsync(id);
    }

    public async Task CheckItemAsync(int id, bool isChecked, int userId)
    {
        var tripItem = await GetByIdAsync(id, userId);
        if (tripItem == null)
        {
            throw new InvalidOperationException("Trip item not found");
        }

        tripItem.IsChecked = isChecked;
        tripItem.CheckedAt = isChecked ? DateTime.UtcNow : null;
        tripItem.ModifiedBy = userId;
        tripItem.ModifiedDate = DateTime.UtcNow;

        await _tripItemRepository.UpdateAsync(tripItem);
    }
}
```

**Step 7: Run tests to verify they pass**

Run:
```bash
dotnet test
```

Expected: PASS - All tests pass

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: add trip item repository and service with check/uncheck functionality"
```

Expected: Commit created

---

## Phase 5: API Controllers

### Task 18: Household Controller
- Create HouseholdController with [Authorize] attribute
- Endpoints: GET, POST, PUT, DELETE households
- Get current user ID from claims
- Error handling with proper status codes
- Controller tests with mocked services

### Task 19: Store Controller
- Create StoreController with [Authorize]
- Endpoints for household and personal stores
- Filter stores by household context
- Controller tests

### Task 20: Inventory Controller
- Create InventoryController with [Authorize]
- Endpoints for household and personal inventory
- Merged view endpoint (household + personal for trip building)
- Controller tests

### Task 21: Trip Controller
- Create TripController with [Authorize]
- Full trip CRUD endpoints
- Complete/reopen trip endpoints
- Collaborator management endpoints
- Controller tests

### Task 22: Trip Item Controller
- Create TripItemController with [Authorize]
- Add/remove/update trip items
- Check/uncheck items
- Bulk operations if needed
- Controller tests

---

## Phase 6: Real-Time Updates (SSE)

### Task 23: SSE Service Infrastructure
- Create ITripEventService interface
- Implement TripEventService with in-memory event broadcasting
- Client connection management (track active connections per trip)
- Event queue per connection

### Task 24: Trip Events Integration
- Modify TripItemService to broadcast events on changes
- Event types: ItemAdded, ItemUpdated, ItemChecked, ItemRemoved
- Include event data (tripId, itemId, change details)
- Tests for event broadcasting

### Task 25: SSE API Endpoint
- Add GET /api/trips/{id}/events endpoint
- Return Server-Sent Events stream
- Authentication on SSE endpoint
- Auto-reconnection handling
- Tests for SSE connection and events

---

## Phase 7: Frontend Foundation (React 19 + Vite)

### Task 26: React Project Setup
- Create frontend directory
- Initialize Vite project with React 19 and TypeScript
- Configure vite.config.ts for dev proxy to API
- Setup folder structure (components, hooks, services, types)
- Add to .gitignore

### Task 27: TailwindCSS Configuration
- Install and configure Tailwind CSS
- Setup tailwind.config.js
- Create base styles
- Add PostCSS configuration

### Task 28: Routing Setup
- Install React Router v7
- Setup route structure
- Protected route wrapper component
- Route guards for authentication

### Task 29: TanStack Query Setup
- Install @tanstack/react-query
- Create QueryClient configuration
- Setup query provider
- API client utilities (fetch wrapper with auth headers)

### Task 30: Jotai State Management
- Install jotai
- Create atoms for global state
- Auth state atom (user, tokens)
- Household context atom (selected household)

### Task 31: Authentication Context
- Login/Register forms
- JWT token storage (localStorage)
- Axios/fetch interceptors for auth headers
- Token refresh logic
- Logout functionality

---

## Phase 8: Frontend Features

### Task 32: Household Management UI
- Household selector component
- Create household form
- List user's households
- Switch household context

### Task 33: Inventory Management UI
- Inventory list view (household + personal)
- Add/edit/delete inventory items
- Store assignment
- Personal vs household toggle

### Task 34: Store Management UI
- Store list for selected household
- Add/edit/delete stores
- Personal stores view

### Task 35: Trip Builder UI
- Create new trip form
- Select items from inventory
- Set quantities
- Assign stores
- Save trip

### Task 36: Active Trip View
- Display trip items grouped by store
- Check/uncheck items
- Real-time updates via SSE
- Edit quantities/stores on the fly
- Complete trip button

### Task 37: Trip History UI
- List completed trips
- View trip details
- Reopen trip functionality

### Task 38: Collaboration UI
- Invite collaborators to trip
- Show active collaborators indicator
- Real-time update notifications

---

## Phase 9: Docker & Deployment

### Task 39: Backend Dockerfile
- Multi-stage Dockerfile for .NET API
- Build and runtime stages
- Copy SQLite database setup
- EXPOSE ports

### Task 40: Frontend Production Build
- Build optimized React production bundle
- Output to /dist
- Environment variable configuration

### Task 41: Caddy Configuration
- Create Caddyfile
- Reverse proxy to API (/api/*)
- Serve frontend static files
- HTTPS configuration
- SPA fallback routing

### Task 42: Docker Compose
- Define services: api, frontend (via Caddy)
- Volume mounts for SQLite database
- Network configuration
- Environment variables
- Health checks

---

## Phase 10: Testing & Documentation

### Task 43: Integration Tests
- Integration tests for full API flows
- Test authentication → household → trip workflow
- Use TestServer and WebApplicationFactory
- In-memory database for test isolation

### Task 44: End-to-End Tests
- Setup Playwright or Cypress
- Critical user flows:
  - Register → Create household → Add inventory → Create trip → Shop
  - Real-time collaboration test (two users)
- Run against Docker Compose environment

### Task 45: Deployment Documentation
- Update README with deployment instructions
- Environment variable documentation
- Docker setup guide
- Development environment setup
- TailScale configuration notes

### Task 46: API Documentation
- OpenAPI/Scalar documentation review
- Ensure all endpoints documented
- Example requests/responses
- Error code reference

---

## Summary

**Total Tasks: 46**

**Detailed (Ready to Execute): Tasks 1-13**
- Project structure, database models, auth layer, first service

**High-Level (Detail During Execution): Tasks 14-46**
- Remaining services, controllers, SSE, frontend, Docker, testing

**Execution Strategy:**
- Use superpowers:executing-plans or superpowers:subagent-driven-development
- Detail each high-level task as we approach it
- Maintain TDD discipline throughout
- Commit frequently after each task

---

**Ready to begin execution when you are, August!**
