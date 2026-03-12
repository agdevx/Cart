// ABOUTME: Repository interface for Store entity operations.
// ABOUTME: Supports household-scoped and personal (user-scoped) store queries.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IStoreRepository
{
    Task<Store?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Store>> GetPersonalStores(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithName(string name, Guid? userId, Guid? householdId, Guid? excludeStoreId, CancellationToken cancellationToken = default);
    Task<Store> Create(Store store, CancellationToken cancellationToken = default);
    Task<Store> Update(Store store, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
}
