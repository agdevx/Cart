// ABOUTME: Service interface for InventoryItem business logic with strict privacy and authorization
// ABOUTME: Defines operations for creating, retrieving, updating, and deleting inventory items with household membership validation

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IInventoryService
{
    Task<InventoryItem> CreateInventoryItem(InventoryItem inventoryItem, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetAllUserInventory(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetHouseholdInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetPersonalInventory(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<InventoryItem?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<InventoryItem> UpdateInventoryItem(InventoryItem inventoryItem, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteInventoryItem(Guid id, Guid userId, CancellationToken cancellationToken = default);
}
