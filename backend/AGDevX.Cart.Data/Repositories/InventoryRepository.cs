// ABOUTME: Repository implementation for InventoryItem data access with privacy enforcement
// ABOUTME: Handles household and personal inventory queries with proper authorization filtering and DefaultStore inclusion

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class InventoryRepository(CartDbContext context) : IInventoryRepository
{
    public async Task<InventoryItem?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.InventoryItems.Include(i => i.DefaultStore)
                                           .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetHouseholdItems(Guid householdId, CancellationToken cancellationToken = default)
    {
        //== Filter for household items only
        return await context.InventoryItems.Include(i => i.DefaultStore)
                                           .Where(i => i.HouseholdId == householdId)
                                           .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetPersonalItems(Guid userId, CancellationToken cancellationToken = default)
    {
        //== Filter for personal items owned by user only
        return await context.InventoryItems.Include(i => i.DefaultStore)
                                           .Where(i => i.OwnerUserId == userId)
                                           .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<InventoryItem>> GetMergedInventory(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Privacy enforcement: return items from household OR owned by user
        return await context.InventoryItems.Include(i => i.DefaultStore)
                                           .Where(i => i.HouseholdId == householdId || i.OwnerUserId == userId)
                                           .ToListAsync(cancellationToken);
    }

    public async Task<InventoryItem> Create(InventoryItem inventoryItem, CancellationToken cancellationToken = default)
    {
        context.InventoryItems.Add(inventoryItem);
        await context.SaveChangesAsync(cancellationToken);

        //== Reload to include navigation properties
        return (await GetById(inventoryItem.Id, cancellationToken))!;
    }

    public async Task<InventoryItem> Update(InventoryItem inventoryItem, CancellationToken cancellationToken = default)
    {
        context.InventoryItems.Update(inventoryItem);
        await context.SaveChangesAsync(cancellationToken);

        //== Reload to include navigation properties
        return (await GetById(inventoryItem.Id, cancellationToken))!;
    }

    public async Task Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var inventoryItem = await context.InventoryItems.FindAsync(new object[] { id }, cancellationToken);
        if (inventoryItem != null)
        {
            context.InventoryItems.Remove(inventoryItem);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
