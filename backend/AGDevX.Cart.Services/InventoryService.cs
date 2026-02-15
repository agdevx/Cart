// ABOUTME: Service implementation for InventoryItem business logic with strict privacy enforcement
// ABOUTME: Validates household membership and user ownership before allowing operations on inventory items

using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class InventoryService(IInventoryRepository inventoryRepository, IHouseholdRepository householdRepository) : IInventoryService
{
    public async Task<InventoryItem> CreateInventoryItemAsync(InventoryItem inventoryItem, Guid userId)
    {
        //== Authorization: validate household membership OR user ownership
        if (inventoryItem.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetByIdAsync(inventoryItem.HouseholdId.Value);
            if (household == null)
            {
                throw new UnauthorizedAccessException("Household not found");
            }

            if (!household.Members.Any(m => m.UserId == userId))
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }
        }
        else
        {
            //== Personal item: automatically set owner to current user
            inventoryItem.OwnerUserId = userId;
        }

        return await inventoryRepository.CreateAsync(inventoryItem);
    }

    public async Task<IEnumerable<InventoryItem>> GetAllUserInventoryAsync(Guid userId)
    {
        //== Get all households the user is a member of
        var userHouseholds = await householdRepository.GetUserHouseholdsAsync(userId);

        //== Get personal items
        var personalItems = await inventoryRepository.GetPersonalItemsAsync(userId);

        //== Get items from all user's households
        var householdItems = new List<InventoryItem>();
        foreach (var household in userHouseholds)
        {
            var items = await inventoryRepository.GetHouseholdItemsAsync(household.Id);
            householdItems.AddRange(items);
        }

        //== Combine and return all items
        return personalItems.Concat(householdItems);
    }

    public async Task<IEnumerable<InventoryItem>> GetHouseholdInventoryAsync(Guid householdId, Guid userId)
    {
        //== Authorization: verify user is household member
        var household = await householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new UnauthorizedAccessException("Household not found");
        }

        if (!household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }

        return await inventoryRepository.GetHouseholdItemsAsync(householdId);
    }

    public async Task<IEnumerable<InventoryItem>> GetPersonalInventoryAsync(Guid userId)
    {
        //== No authorization needed: user always has access to their own items
        return await inventoryRepository.GetPersonalItemsAsync(userId);
    }

    public async Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(Guid householdId, Guid userId)
    {
        //== Authorization: verify user is household member
        var household = await householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new UnauthorizedAccessException("Household not found");
        }

        if (!household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of the household");
        }

        return await inventoryRepository.GetMergedInventoryAsync(householdId, userId);
    }

    public async Task<InventoryItem?> GetByIdAsync(Guid id, Guid userId)
    {
        var inventoryItem = await inventoryRepository.GetByIdAsync(id);
        if (inventoryItem == null)
        {
            return null;
        }

        //== Authorization: check household membership OR personal ownership
        if (inventoryItem.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetByIdAsync(inventoryItem.HouseholdId.Value);
            if (household == null || !household.Members.Any(m => m.UserId == userId))
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

    public async Task<InventoryItem> UpdateInventoryItemAsync(InventoryItem inventoryItem, Guid userId)
    {
        //== Authorization: verify access before update
        var existing = await GetByIdAsync(inventoryItem.Id, userId);
        if (existing == null)
        {
            throw new UnauthorizedAccessException("Inventory item not found or user not authorized");
        }

        return await inventoryRepository.UpdateAsync(inventoryItem);
    }

    public async Task DeleteInventoryItemAsync(Guid id, Guid userId)
    {
        //== Authorization: verify access before delete
        var existing = await GetByIdAsync(id, userId);
        if (existing == null)
        {
            throw new UnauthorizedAccessException("Inventory item not found or user not authorized");
        }

        await inventoryRepository.DeleteAsync(id);
    }
}
