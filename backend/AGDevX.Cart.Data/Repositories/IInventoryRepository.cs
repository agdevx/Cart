// ABOUTME: Repository interface for InventoryItem data access with privacy filtering
// ABOUTME: Defines methods for household and personal inventory queries with authorization enforcement

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IInventoryRepository
{
    Task<InventoryItem?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetHouseholdItems(Guid householdId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetPersonalItems(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<InventoryItem> Create(InventoryItem inventoryItem, CancellationToken cancellationToken = default);
    Task<InventoryItem> Update(InventoryItem inventoryItem, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
}
