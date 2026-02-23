// ABOUTME: Service interface for Store business logic.
// ABOUTME: All methods accept userId for authorization of household membership or user ownership.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IStoreService
{
    Task<Store> CreateStore(Store store, Guid userId);
    Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, Guid userId);
    Task<IEnumerable<Store>> GetPersonalStores(Guid userId);
    Task<Store?> GetById(Guid id, Guid userId);
    Task<Store> UpdateStore(Store store, Guid userId);
    Task DeleteStore(Guid id, Guid userId);
}
