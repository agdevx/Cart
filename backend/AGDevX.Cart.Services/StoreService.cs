// ABOUTME: Service implementation for Store business logic.
// ABOUTME: Validates household membership for household stores and user ownership for personal stores.

using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class StoreService(IStoreRepository storeRepository, IHouseholdRepository householdRepository) : IStoreService
{
    public async Task<Store> CreateStore(Store store, Guid userId)
    {
        //== Household-scoped store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetById(store.HouseholdId.Value);
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

        return await storeRepository.Create(store);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, Guid userId)
    {
        //== Verify user is a member of the household
        var household = await householdRepository.GetById(householdId);
        if (household == null || !household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await storeRepository.GetHouseholdStores(householdId);
    }

    public async Task<IEnumerable<Store>> GetPersonalStores(Guid userId)
    {
        return await storeRepository.GetPersonalStores(userId);
    }

    public async Task<Store?> GetById(Guid id, Guid userId)
    {
        var store = await storeRepository.GetById(id);
        if (store == null)
        {
            return null;
        }

        //== Household store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetById(store.HouseholdId.Value);
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

    public async Task<Store> UpdateStore(Store store, Guid userId)
    {
        //== Verify access before updating
        var existingStore = await GetById(store.Id, userId);
        if (existingStore == null)
        {
            throw new UnauthorizedAccessException("Store not found or access denied");
        }

        return await storeRepository.Update(store);
    }

    public async Task DeleteStore(Guid id, Guid userId)
    {
        //== Verify access before deleting
        var store = await GetById(id, userId);
        if (store == null)
        {
            throw new UnauthorizedAccessException("Store not found or access denied");
        }

        await storeRepository.Delete(id);
    }
}
