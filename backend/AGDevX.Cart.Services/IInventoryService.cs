// ABOUTME: Service interface for InventoryItem business logic with strict privacy and authorization
// ABOUTME: Defines operations for creating, retrieving, updating, and deleting inventory items with household membership validation

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IInventoryService
{
    Task<InventoryItem> CreateInventoryItem(InventoryItem inventoryItem, Guid userId);
    Task<IEnumerable<InventoryItem>> GetAllUserInventory(Guid userId);
    Task<IEnumerable<InventoryItem>> GetHouseholdInventory(Guid householdId, Guid userId);
    Task<IEnumerable<InventoryItem>> GetPersonalInventory(Guid userId);
    Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId);
    Task<InventoryItem?> GetById(Guid id, Guid userId);
    Task<InventoryItem> UpdateInventoryItem(InventoryItem inventoryItem, Guid userId);
    Task DeleteInventoryItem(Guid id, Guid userId);
}
