# Test Coverage Gaps Design

## Problem

The backend has ~140 tests with good controller coverage but significant gaps in repositories (0 tests), services (many CRUD paths untested), auth extensions (0 tests), and DbContext audit logic (untested).

## Approach

Layer-by-layer gap filling using existing conventions: xUnit + FluentAssertions + Moq for service tests, EF Core InMemory for repository/data tests. `Should_[Expected]_When_[Condition]` naming with AAA structure.

## New Test Files

### 1. Repository Tests (InMemory DB) — 5 files, ~50 tests

**HouseholdRepositoryTests** (~12 tests)
- CRUD: Create, GetById (found/not found), Update, Delete (found/not found)
- GetByInviteCode (found/not found)
- GetUserHouseholds returns only user's households
- IsUserMember (true/false)
- AddMember, RemoveMember (found/not found), UpdateMemberRole (found/not found)
- GetById includes Members navigation

**InventoryRepositoryTests** (~10 tests)
- CRUD: Create, GetById (found/not found), Update, Delete (found/not found)
- GetHouseholdItems filters by householdId
- GetPersonalItems filters by ownerUserId
- GetMergedInventory returns household OR personal items
- Create/GetById includes DefaultStore navigation

**StoreRepositoryTests** (~8 tests)
- CRUD: Create, GetById (found/not found), Update, Delete (found/not found)
- GetHouseholdStores filters and orders by name
- GetPersonalStores filters and orders by name
- GetById includes Household navigation

**TripRepositoryTests** (~12 tests)
- CRUD: Create, GetById (found/not found), Update, Delete (found/not found)
- GetUserTrips returns trips where user is creator OR collaborator
- GetHouseholdTrips filters by householdId
- IsUserCollaborator: creator returns true, collaborator returns true, neither returns false, nonexistent trip returns false
- AddCollaborator, RemoveCollaborator (found/not found)
- GetById includes Items, Collaborators, nested InventoryItem/Store

**TripItemRepositoryTests** (~8 tests)
- CRUD: Create, GetById (found/not found), Update, Delete (found/not found)
- GetTripItems filters by tripId
- GetById includes InventoryItem and Store navigations

### 2. Service Test Expansions — 4 expanded files + 1 new, ~47 tests

**InventoryServiceTests** (+12 tests)
- CreateInventoryItem: personal item auto-sets OwnerUserId, household non-member throws
- GetAllUserInventory: aggregates personal + all household items
- GetHouseholdInventory: authorized returns items, non-member throws, household not found throws
- GetMergedInventory: authorized returns items, non-member throws
- GetById: household item authorized, personal item authorized, household non-member throws, personal wrong owner throws, not found returns null
- UpdateInventoryItem: authorized updates, not found throws
- DeleteInventoryItem: authorized deletes, not found throws

**StoreServiceTests** (+10 tests)
- CreateStore: household non-member throws, personal userId mismatch throws
- GetHouseholdStores: authorized returns, non-member throws
- GetById: household member authorized, personal owner authorized, household non-member throws, personal wrong owner throws, not found returns null
- UpdateStore: authorized updates, not found throws
- DeleteStore: authorized deletes, not found throws

**TripServiceTests** (+12 tests)
- GetUserTrips: delegates to repository
- GetHouseholdTrips: delegates to repository
- GetById: delegates to repository
- UpdateTrip: delegates to repository
- DeleteTrip: creator deletes, non-creator throws, not found throws
- ReopenTrip: collaborator reopens (clears IsCompleted/CompletedAt), non-collaborator throws, not found throws
- AddCollaborator: authorized + household member succeeds, non-collaborator throws, not found throws, non-household-member throws
- RemoveCollaborator: authorized succeeds, non-collaborator throws

**TripItemServiceTests** (+8 tests)
- GetTripItems: authorized returns items, non-collaborator throws
- GetById: found returns item, not found returns null, non-collaborator throws
- DeleteTripItem: authorized deletes + publishes event, non-collaborator throws, not found throws
- UpdateTripItem: not found throws

**TripEventServiceTests** (+5 tests, new file)
- SubscribeToTrip creates observable
- PublishEvent with no subscribers does not error
- UnsubscribeFromTrip completes subject and cleans up
- Multiple subscribers receive same event
- SubscribeToTrip twice returns same observable

### 3. ClaimsPrincipalExtensionsTests — 1 new file, ~4 tests

- Valid GUID NameIdentifier claim returns correct Guid
- Missing NameIdentifier claim throws UnauthorizedAccessException
- Non-GUID NameIdentifier value throws UnauthorizedAccessException
- No claims at all throws UnauthorizedAccessException

### 4. CartDbContext Audit Tests — expand existing file, ~4 tests

- SaveChangesAsync sets CreatedBy and CreatedDate on EntityState.Added
- SaveChangesAsync sets ModifiedBy and ModifiedDate on EntityState.Modified
- SaveChangesAsync preserves original CreatedBy/CreatedDate on modify
- Uses "System" as CreatedBy when no HttpContext

## Out of Scope

- TripEventsController SSE streaming tests (infrastructure-heavy, logic covered by TripEventService tests)
- Integration tests / TestServer setup
- Input validation tests (code has no validation logic to test)
- Additional model property tests (models are POCOs with no logic)
- Additional controller tests (controllers are thin pass-throughs; logic tested at service layer)

## Estimated Total: ~105 new tests
