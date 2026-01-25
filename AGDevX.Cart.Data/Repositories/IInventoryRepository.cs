// ABOUTME: Repository interface for InventoryItem data access with privacy filtering
// ABOUTME: Defines methods for household and personal inventory queries with authorization enforcement

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IInventoryRepository
{
    Task<InventoryItem?> GetByIdAsync(Guid id);
    Task<IEnumerable<InventoryItem>> GetHouseholdItemsAsync(Guid householdId);
    Task<IEnumerable<InventoryItem>> GetPersonalItemsAsync(Guid userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(Guid householdId, Guid userId);
    Task<InventoryItem> CreateAsync(InventoryItem inventoryItem);
    Task<InventoryItem> UpdateAsync(InventoryItem inventoryItem);
    Task DeleteAsync(Guid id);
}
