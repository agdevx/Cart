// ABOUTME: Service implementation for InventoryItem business logic with strict privacy enforcement
// ABOUTME: Validates household membership via User.HouseholdId and user ownership before allowing operations

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class InventoryService(IInventoryRepository inventoryRepository, CartDbContext dbContext, ITripItemRepository tripItemRepository) : IInventoryService
{
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
