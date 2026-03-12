// ABOUTME: Service implementation for Store business logic.
// ABOUTME: Validates household membership for household stores and user ownership for personal stores.

using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class StoreService(IStoreRepository storeRepository, IHouseholdRepository householdRepository, ITripItemRepository tripItemRepository) : IStoreService
{
    public async Task<Store> CreateStore(Store store, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Household-scoped store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetById(store.HouseholdId.Value, cancellationToken)
                                ?? throw new UnauthorizedAccessException("Household not found");

            if (!household.Members.Any(m => m.UserId == userId))
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }
        }
        //== Personal store: automatically set owner to current user
        else
        {
            store.UserId = userId;
        }

        //== Check for duplicate name in the destination scope
        var duplicateExists = await storeRepository.ExistsWithName(
            store.Name, store.UserId, store.HouseholdId, excludeStoreId: null, cancellationToken);

        if (duplicateExists)
        {
            throw new InvalidOperationException($"A store named \"{store.Name}\" already exists in this scope");
        }

        return await storeRepository.Create(store, cancellationToken);
    }

    public async Task<IEnumerable<Store>> GetHouseholdStores(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is a member of the household
        var household = await householdRepository.GetById(householdId, cancellationToken);
        if (household == null || !household.Members.Any(m => m.UserId == userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await storeRepository.GetHouseholdStores(householdId, cancellationToken);
    }

    public async Task<IEnumerable<Store>> GetPersonalStores(Guid userId, CancellationToken cancellationToken = default)
    {
        return await storeRepository.GetPersonalStores(userId, cancellationToken);
    }

    public async Task<Store?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var store = await storeRepository.GetById(id, cancellationToken);
        if (store == null)
        {
            return null;
        }

        //== Household store: verify user is a member
        if (store.HouseholdId.HasValue)
        {
            var household = await householdRepository.GetById(store.HouseholdId.Value, cancellationToken);
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

    public async Task<Store> UpdateStore(Guid storeId, string name, Guid? householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify access before updating
        var existingStore = await GetById(storeId, userId, cancellationToken)
                                ?? throw new UnauthorizedAccessException("Store not found or access denied");

        //== Update name
        existingStore.Name = name;

        //== Handle scope change
        if (householdId.HasValue)
        {
            //== Moving to household: verify membership
            var household = await householdRepository.GetById(householdId.Value, cancellationToken)
                                ?? throw new UnauthorizedAccessException("Household not found");

            if (!household.Members.Any(m => m.UserId == userId))
            {
                throw new UnauthorizedAccessException("User is not a member of this household");
            }

            existingStore.HouseholdId = householdId.Value;
            existingStore.UserId = null;
        }
        else
        {
            //== Moving to personal: set owner, clear household
            existingStore.UserId = userId;
            existingStore.HouseholdId = null;
        }

        //== Check for duplicate name in the destination scope
        var duplicateExists = await storeRepository.ExistsWithName(
            name, existingStore.UserId, existingStore.HouseholdId, excludeStoreId: storeId, cancellationToken);

        if (duplicateExists)
        {
            throw new InvalidOperationException($"A store named \"{name}\" already exists in this scope");
        }

        var result = await storeRepository.Update(existingStore, cancellationToken);

        //== Live mirror: update denormalized StoreName on all TripItems
        await tripItemRepository.UpdateStoreNameByStoreId(storeId, name, cancellationToken);

        return result;
    }

    public async Task DeleteStore(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify access before deleting
        var store = await GetById(id, userId, cancellationToken)
                        ?? throw new UnauthorizedAccessException("Store not found or access denied");

        await storeRepository.Delete(id, cancellationToken);
    }
}
