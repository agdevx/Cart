// ABOUTME: Repository implementation for TripItem entities with EF Core
// ABOUTME: Loads related InventoryItem and Store navigation properties for complete item details
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripItemRepository(CartDbContext context) : ITripItemRepository
{
    public async Task<TripItem?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.TripItems.Include(ti => ti.InventoryItem)
                                      .Include(ti => ti.Store)
                                      .FirstOrDefaultAsync(ti => ti.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<TripItem>> GetTripItems(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await context.TripItems.Include(ti => ti.InventoryItem)
                                      .Include(ti => ti.Store)
                                      .Where(ti => ti.TripId == tripId)
                                      .ToListAsync(cancellationToken);
    }

    public async Task<TripItem> Create(TripItem tripItem, CancellationToken cancellationToken = default)
    {
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync(cancellationToken);
        return tripItem;
    }

    public async Task<TripItem> Update(TripItem tripItem, CancellationToken cancellationToken = default)
    {
        context.Entry(tripItem).State = EntityState.Modified;
        await context.SaveChangesAsync(cancellationToken);
        return tripItem;
    }

    public async Task Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var tripItem = await context.TripItems.FindAsync(new object[] { id }, cancellationToken);
        if (tripItem != null)
        {
            context.TripItems.Remove(tripItem);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    //== Bulk update denormalized ItemName when inventory item is renamed
    public async Task UpdateItemNameByInventoryItemId(Guid inventoryItemId, string itemName, CancellationToken cancellationToken = default)
    {
        await context.TripItems
            .Where(ti => ti.InventoryItemId == inventoryItemId)
            .Where(ti => ti.Trip != null && !ti.Trip.IsCompleted)
            .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.ItemName, itemName), cancellationToken);
    }

    //== Bulk update denormalized StoreName when store is renamed
    public async Task UpdateStoreNameByStoreId(Guid storeId, string storeName, CancellationToken cancellationToken = default)
    {
        await context.TripItems
            .Where(ti => ti.StoreId == storeId)
            .Where(ti => ti.Trip != null && !ti.Trip.IsCompleted)
            .ExecuteUpdateAsync(s => s.SetProperty(ti => ti.StoreName, storeName), cancellationToken);
    }
}
