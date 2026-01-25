// ABOUTME: Service interface for InventoryItem business logic with strict privacy and authorization
// ABOUTME: Defines operations for creating, retrieving, updating, and deleting inventory items with household membership validation

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IInventoryService
{
    Task<InventoryItem> CreateInventoryItemAsync(InventoryItem inventoryItem, Guid userId);
    Task<IEnumerable<InventoryItem>> GetHouseholdInventoryAsync(Guid householdId, Guid userId);
    Task<IEnumerable<InventoryItem>> GetPersonalInventoryAsync(Guid userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(Guid householdId, Guid userId);
    Task<InventoryItem?> GetByIdAsync(Guid id, Guid userId);
    Task<InventoryItem> UpdateInventoryItemAsync(InventoryItem inventoryItem, Guid userId);
    Task DeleteInventoryItemAsync(Guid id, Guid userId);
}
