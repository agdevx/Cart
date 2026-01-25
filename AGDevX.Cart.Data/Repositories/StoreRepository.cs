// ABOUTME: Repository implementation for Store entity operations.
// ABOUTME: Handles CRUD operations for both household-scoped and personal stores.

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class StoreRepository(CartDbContext context) : IStoreRepository
{
    public async Task<Store?> GetByIdAsync(Guid id)
    {
        return await context.Stores
            .Include(s => s.Household)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStoresAsync(Guid householdId)
    {
        return await context.Stores
            .Where(s => s.HouseholdId == householdId)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<Store>> GetPersonalStoresAsync(Guid userId)
    {
        return await context.Stores
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<Store> CreateAsync(Store store)
    {
        context.Stores.Add(store);
        await context.SaveChangesAsync();
        return store;
    }

    public async Task<Store> UpdateAsync(Store store)
    {
        context.Stores.Update(store);
        await context.SaveChangesAsync();
        return store;
    }

    public async Task DeleteAsync(Guid id)
    {
        var store = await context.Stores.FindAsync(id);
        if (store != null)
        {
            context.Stores.Remove(store);
            await context.SaveChangesAsync();
        }
    }
}
