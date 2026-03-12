// ABOUTME: Service interface for Store business logic.
// ABOUTME: All methods accept userId for authorization of household membership or user ownership.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IStoreService
{
    Task<Store> CreateStore(Store store, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Store>> GetPersonalStores(Guid userId, CancellationToken cancellationToken = default);
    Task<Store?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Store> UpdateStore(Guid storeId, string name, Guid? householdId, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteStore(Guid id, Guid userId, CancellationToken cancellationToken = default);
}
