// ABOUTME: Service interface for trip item operations including add, update, delete
// ABOUTME: and check/uncheck functionality for tracking item completion during shopping
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripItemService
{
    Task<TripItem> AddTripItem(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null);
    Task<IEnumerable<TripItem>> GetTripItems(Guid tripId, Guid userId);
    Task<TripItem?> GetById(Guid id, Guid userId);
    Task<TripItem> UpdateTripItem(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null);
    Task DeleteTripItem(Guid id, Guid userId);
    Task<TripItem> CheckItem(Guid id, bool isChecked, Guid userId);
}
