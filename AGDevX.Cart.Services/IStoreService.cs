// ABOUTME: Service interface for Store business logic.
// ABOUTME: All methods accept userId for authorization of household membership or user ownership.

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IStoreService
{
    Task<Store> CreateStoreAsync(Store store, Guid userId);
    Task<IEnumerable<Store>> GetHouseholdStoresAsync(Guid householdId, Guid userId);
    Task<IEnumerable<Store>> GetPersonalStoresAsync(Guid userId);
    Task<Store?> GetByIdAsync(Guid id, Guid userId);
    Task<Store> UpdateStoreAsync(Store store, Guid userId);
    Task DeleteStoreAsync(Guid id, Guid userId);
}
