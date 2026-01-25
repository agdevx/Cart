// ABOUTME: Service implementation for Store business logic.
// ABOUTME: Validates household membership for household stores and user ownership for personal stores.

using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class StoreService(IStoreRepository storeRepository, IHouseholdRepository householdRepository) : IStoreService
{
    public async Task<Store> CreateStoreAsync(Store store, Guid userId)
    {
        //== Household-scoped store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetByIdAsync(store.HouseholdId.Value);
            if (household == null)
            {
                throw new UnauthorizedAccessException("Household not found");
            }

            if (!household.Members.Any(m => m.UserId == userId))
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        //== Personal store: verify userId matches
        else if (store.UserId != userId)
        {
            throw new UnauthorizedAccessException("Cannot create store for another user");
        }

        return await storeRepository.CreateAsync(store);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStoresAsync(Guid householdId, Guid userId)
    {
        //== Verify user is a member of the household
        var household = await householdRepository.GetByIdAsync(householdId);
        if (household == null || !household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await storeRepository.GetHouseholdStoresAsync(householdId);
    }

    public async Task<IEnumerable<Store>> GetPersonalStoresAsync(Guid userId)
    {
        return await storeRepository.GetPersonalStoresAsync(userId);
    }

    public async Task<Store?> GetByIdAsync(Guid id, Guid userId)
    {
        var store = await storeRepository.GetByIdAsync(id);
        if (store == null)
        {
            return null;
        }

        //== Household store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetByIdAsync(store.HouseholdId.Value);
            if (household == null || !household.Members.Any(m => m.UserId == userId))
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        //== Personal store: verify user ownership
        else if (store.UserId != userId)
        {
            throw new UnauthorizedAccessException("User does not have access to this store");
        }

        return store;
    }

    public async Task<Store> UpdateStoreAsync(Store store, Guid userId)
    {
        //== Verify access before updating
        var existingStore = await GetByIdAsync(store.Id, userId);
        if (existingStore == null)
        {
            throw new UnauthorizedAccessException("Store not found or access denied");
        }

        return await storeRepository.UpdateAsync(store);
    }

    public async Task DeleteStoreAsync(Guid id, Guid userId)
    {
        //== Verify access before deleting
        var store = await GetByIdAsync(id, userId);
        if (store == null)
        {
            throw new UnauthorizedAccessException("Store not found or access denied");
        }

        await storeRepository.DeleteAsync(id);
    }
}
