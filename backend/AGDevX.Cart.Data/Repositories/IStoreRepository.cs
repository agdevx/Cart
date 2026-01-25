// ABOUTME: Repository interface for Store entity operations.
// ABOUTME: Supports household-scoped and personal (user-scoped) store queries.

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IStoreRepository
{
    Task<Store?> GetByIdAsync(Guid id);
    Task<IEnumerable<Store>> GetHouseholdStoresAsync(Guid householdId);
    Task<IEnumerable<Store>> GetPersonalStoresAsync(Guid userId);
    Task<Store> CreateAsync(Store store);
    Task<Store> UpdateAsync(Store store);
    Task DeleteAsync(Guid id);
}
