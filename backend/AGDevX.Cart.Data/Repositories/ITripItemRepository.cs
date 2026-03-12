// ABOUTME: Repository interface for managing trip items within specific trips
// ABOUTME: Provides CRUD operations for items that users plan to purchase on shopping trips
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripItemRepository
{
    Task<TripItem?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<TripItem>> GetTripItems(Guid tripId, CancellationToken cancellationToken = default);
    Task<TripItem> Create(TripItem tripItem, CancellationToken cancellationToken = default);
    Task<TripItem> Update(TripItem tripItem, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
    Task UpdateItemNameByInventoryItemId(Guid inventoryItemId, string itemName, CancellationToken cancellationToken = default);
    Task UpdateStoreNameByStoreId(Guid storeId, string storeName, CancellationToken cancellationToken = default);
}
