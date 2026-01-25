// ABOUTME: Repository implementation for InventoryItem data access with privacy enforcement
// ABOUTME: Handles household and personal inventory queries with proper authorization filtering and DefaultStore inclusion

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class InventoryRepository(CartDbContext context) : IInventoryRepository
{
    public async Task<InventoryItem?> GetByIdAsync(Guid id)
    {
        return await context.InventoryItems
            .Include(i => i.DefaultStore)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<IEnumerable<InventoryItem>> GetHouseholdItemsAsync(Guid householdId)
    {
        //== Filter for household items only
        return await context.InventoryItems
            .Include(i => i.DefaultStore)
            .Where(i => i.HouseholdId == householdId)
            .ToListAsync();
    }

    public async Task<IEnumerable<InventoryItem>> GetPersonalItemsAsync(Guid userId)
    {
        //== Filter for personal items owned by user only
        return await context.InventoryItems
            .Include(i => i.DefaultStore)
            .Where(i => i.OwnerUserId == userId)
            .ToListAsync();
    }

    public async Task<IEnumerable<InventoryItem>> GetMergedInventoryAsync(Guid householdId, Guid userId)
    {
        //== Privacy enforcement: return items from household OR owned by user
        return await context.InventoryItems
            .Include(i => i.DefaultStore)
            .Where(i => i.HouseholdId == householdId || i.OwnerUserId == userId)
            .ToListAsync();
    }

    public async Task<InventoryItem> CreateAsync(InventoryItem inventoryItem)
    {
        context.InventoryItems.Add(inventoryItem);
        await context.SaveChangesAsync();

        //== Reload to include navigation properties
        return (await GetByIdAsync(inventoryItem.Id))!;
    }

    public async Task<InventoryItem> UpdateAsync(InventoryItem inventoryItem)
    {
        context.InventoryItems.Update(inventoryItem);
        await context.SaveChangesAsync();

        //== Reload to include navigation properties
        return (await GetByIdAsync(inventoryItem.Id))!;
    }

    public async Task DeleteAsync(Guid id)
    {
        var inventoryItem = await context.InventoryItems.FindAsync(id);
        if (inventoryItem != null)
        {
            context.InventoryItems.Remove(inventoryItem);
            await context.SaveChangesAsync();
        }
    }
}
