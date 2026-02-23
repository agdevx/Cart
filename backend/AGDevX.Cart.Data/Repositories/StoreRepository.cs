// ABOUTME: Repository implementation for Store entity operations.
// ABOUTME: Handles CRUD operations for both household-scoped and personal stores.

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class StoreRepository(CartDbContext context) : IStoreRepository
{
    public async Task<Store?> GetById(Guid id)
    {
        return await context.Stores
            .Include(s => s.Household)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId)
    {
        return await context.Stores
            .Where(s => s.HouseholdId == householdId)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<Store>> GetPersonalStores(Guid userId)
    {
        return await context.Stores
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<Store> Create(Store store)
    {
        context.Stores.Add(store);
        await context.SaveChangesAsync();
        return store;
    }

    public async Task<Store> Update(Store store)
    {
        context.Stores.Update(store);
        await context.SaveChangesAsync();
        return store;
    }

    public async Task Delete(Guid id)
    {
        var store = await context.Stores.FindAsync(id);
        if (store != null)
        {
            context.Stores.Remove(store);
            await context.SaveChangesAsync();
        }
    }
}
