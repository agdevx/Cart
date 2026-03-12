// ABOUTME: Repository implementation for Store entity operations.
// ABOUTME: Handles CRUD operations for both household-scoped and personal stores.

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class StoreRepository(CartDbContext context) : IStoreRepository
{
    public async Task<Store?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Stores.Include(s => s.Household)
                                   .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Stores.Where(s => s.HouseholdId == householdId)
                                   .OrderBy(s => s.Name)
                                   .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Store>> GetPersonalStores(Guid userId, CancellationToken cancellationToken = default)
    {
        return await context.Stores.Where(s => s.UserId == userId)
                                   .OrderBy(s => s.Name)
                                   .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsWithName(string name, Guid? userId, Guid? householdId, Guid? excludeStoreId, CancellationToken cancellationToken = default)
    {
        var query = context.Stores.AsQueryable();

        if (householdId.HasValue)
        {
            query = query.Where(s => s.HouseholdId == householdId.Value);
        }
        else if (userId.HasValue)
        {
            query = query.Where(s => s.UserId == userId.Value);
        }

        if (excludeStoreId.HasValue)
        {
            query = query.Where(s => s.Id != excludeStoreId.Value);
        }

        var lowerName = name.ToLower();
        return await query.AnyAsync(s => s.Name.ToLower() == lowerName, cancellationToken);
    }

    public async Task<Store> Create(Store store, CancellationToken cancellationToken = default)
    {
        context.Stores.Add(store);
        await context.SaveChangesAsync(cancellationToken);
        return store;
    }

    public async Task<Store> Update(Store store, CancellationToken cancellationToken = default)
    {
        context.Stores.Update(store);
        await context.SaveChangesAsync(cancellationToken);
        return store;
    }

    public async Task Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var store = await context.Stores.FindAsync(new object[] { id }, cancellationToken);
        if (store != null)
        {
            context.Stores.Remove(store);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
