// ABOUTME: Service interface for trip item operations including add, update, delete
// ABOUTME: and check/uncheck functionality for tracking item completion during shopping
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface ITripItemService
{
    Task<TripItem> AddTripItem(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<TripItem>> GetTripItems(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<TripItem?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<TripItem> UpdateTripItem(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default);
    Task DeleteTripItem(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<TripItem> CheckItem(Guid id, bool isChecked, Guid userId, CancellationToken cancellationToken = default);
}
