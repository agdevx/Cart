// ABOUTME: Repository implementation for TripItem entities with EF Core
// ABOUTME: Loads related InventoryItem and Store navigation properties for complete item details
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripItemRepository(CartDbContext context) : ITripItemRepository
{
    public async Task<TripItem?> GetById(Guid id)
    {
        return await context.TripItems
            .Include(ti => ti.InventoryItem)
            .Include(ti => ti.Store)
            .FirstOrDefaultAsync(ti => ti.Id == id);
    }

    public async Task<IEnumerable<TripItem>> GetTripItems(Guid tripId)
    {
        return await context.TripItems
            .Include(ti => ti.InventoryItem)
            .Include(ti => ti.Store)
            .Where(ti => ti.TripId == tripId)
            .ToListAsync();
    }

    public async Task<TripItem> Create(TripItem tripItem)
    {
        context.TripItems.Add(tripItem);
        await context.SaveChangesAsync();
        return tripItem;
    }

    public async Task<TripItem> Update(TripItem tripItem)
    {
        context.TripItems.Update(tripItem);
        await context.SaveChangesAsync();
        return tripItem;
    }

    public async Task Delete(Guid id)
    {
        var tripItem = await context.TripItems.FindAsync(id);
        if (tripItem != null)
        {
            context.TripItems.Remove(tripItem);
            await context.SaveChangesAsync();
        }
    }
}
