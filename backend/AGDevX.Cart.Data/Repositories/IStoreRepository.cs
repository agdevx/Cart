// ABOUTME: Repository interface for Store entity operations.
// ABOUTME: Supports household-scoped and personal (user-scoped) store queries.

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IStoreRepository
{
    Task<Store?> GetById(Guid id);
    Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId);
    Task<IEnumerable<Store>> GetPersonalStores(Guid userId);
    Task<Store> Create(Store store);
    Task<Store> Update(Store store);
    Task Delete(Guid id);
}
