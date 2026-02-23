// ABOUTME: Repository interface for InventoryItem data access with privacy filtering
// ABOUTME: Defines methods for household and personal inventory queries with authorization enforcement

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IInventoryRepository
{
    Task<InventoryItem?> GetById(Guid id);
    Task<IEnumerable<InventoryItem>> GetHouseholdItems(Guid householdId);
    Task<IEnumerable<InventoryItem>> GetPersonalItems(Guid userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId);
    Task<InventoryItem> Create(InventoryItem inventoryItem);
    Task<InventoryItem> Update(InventoryItem inventoryItem);
    Task Delete(Guid id);
}
