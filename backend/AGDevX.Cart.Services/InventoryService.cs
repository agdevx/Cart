// ABOUTME: Service implementation for InventoryItem business logic with strict privacy enforcement
// ABOUTME: Validates household membership via User.HouseholdId and user ownership before allowing operations

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public class InventoryService(IInventoryRepository inventoryRepository, CartDbContext dbContext, ITripItemRepository tripItemRepository, IStoreRepository storeRepository) : IInventoryService
{
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

        ProcessImportRows(validPersonalRows, personalNamesSeen, personalStoreMap, userId, null, itemsToCreate, result, isHousehold: false);

        if (user.HouseholdId.HasValue)
        {
            ProcessImportRows(validHouseholdRows, householdNamesSeen, householdStoreMap, userId, user.HouseholdId.Value, itemsToCreate, result, isHousehold: true);
        }

        //== Step 4: Bulk create
        if (itemsToCreate.Count > 0)
        {
            dbContext.InventoryItems.AddRange(itemsToCreate);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    private void ProcessImportRows(
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

    public async Task<InventoryItem> CreateInventoryItem(InventoryItem inventoryItem, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Authorization: validate household membership OR user ownership
        if (inventoryItem.HouseholdId.HasValue)
        {
            var user = await GetUserOrThrow(userId, cancellationToken);

            if (user.HouseholdId != inventoryItem.HouseholdId.Value)
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }
        }
        else
        {
            //== Personal item: automatically set owner to current user
            inventoryItem.OwnerUserId = userId;
        }

        return await inventoryRepository.Create(inventoryItem, cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetAllUserInventory(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserOrThrow(userId, cancellationToken);

        //== Get personal items
        var personalItems = await inventoryRepository.GetPersonalItems(userId, cancellationToken);

        //== Get household items if user belongs to a household
        if (user.HouseholdId != null)
        {
            var householdItems = await inventoryRepository.GetHouseholdItems(user.HouseholdId.Value, cancellationToken);
            return personalItems.Concat(householdItems);
        }

        return personalItems;
    }

    public async Task<IEnumerable<InventoryItem>> GetHouseholdInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Authorization: verify user is household member
        var user = await GetUserOrThrow(userId, cancellationToken);

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }

        return await inventoryRepository.GetHouseholdItems(householdId, cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetPersonalInventory(Guid userId, CancellationToken cancellationToken = default)
    {
        //== No authorization needed: user always has access to their own items
        return await inventoryRepository.GetPersonalItems(userId, cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Authorization: verify user is household member
        var user = await GetUserOrThrow(userId, cancellationToken);

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }

        return await inventoryRepository.GetMergedInventory(householdId, userId, cancellationToken);
    }

    public async Task<InventoryItem?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var inventoryItem = await inventoryRepository.GetById(id, cancellationToken);
        if (inventoryItem == null)
        {
            return null;
        }

        //== Authorization: check household membership OR personal ownership
        if (inventoryItem.HouseholdId.HasValue)
        {
            var user = await GetUserOrThrow(userId, cancellationToken);

            if (user.HouseholdId != inventoryItem.HouseholdId.Value)
            {
                throw new UnauthorizedAccessException("User is not authorized to access this inventory item");
            }
        }
        else if (inventoryItem.OwnerUserId.HasValue && inventoryItem.OwnerUserId.Value != userId)
        {
            throw new UnauthorizedAccessException("User is not authorized to access this inventory item");
        }

        return inventoryItem;
    }

    public async Task<InventoryItem> UpdateInventoryItem(InventoryItem inventoryItem, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Authorization: verify access before update
        var existing = await GetById(inventoryItem.Id, userId, cancellationToken)
                            ?? throw new UnauthorizedAccessException("Inventory item not found or user not authorized");

        //== Handle scope change
        if (inventoryItem.HouseholdId.HasValue)
        {
            //== Moving to household: verify membership
            var user = await GetUserOrThrow(userId, cancellationToken);

            if (user.HouseholdId != inventoryItem.HouseholdId.Value)
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }

            //== Clear personal owner when moving to household
            existing.OwnerUserId = null;
            existing.HouseholdId = inventoryItem.HouseholdId;
        }
        else
        {
            //== Moving to personal: set owner, clear household
            existing.OwnerUserId = userId;
            existing.HouseholdId = null;
        }

        //== Update properties on the tracked entity
        existing.Name = inventoryItem.Name;
        existing.Notes = inventoryItem.Notes;
        existing.DefaultStoreId = inventoryItem.DefaultStoreId;

        var result = await inventoryRepository.Update(existing, cancellationToken);

        //== Live mirror: update denormalized ItemName on all TripItems
        await tripItemRepository.UpdateItemNameByInventoryItemId(inventoryItem.Id, inventoryItem.Name, cancellationToken);

        return result;
    }

    public async Task DeleteInventoryItem(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Authorization: verify access before delete
        var existing = await GetById(id, userId, cancellationToken)
                            ?? throw new UnauthorizedAccessException("Inventory item not found or user not authorized");

        await inventoryRepository.Delete(id, cancellationToken);
    }

    private async Task<User> GetUserOrThrow(Guid userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found");
        return user;
    }
}
