// ABOUTME: Service interface for trip item operations including add, update, delete
// ABOUTME: and check/uncheck functionality for tracking item completion during shopping
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripItemService
{
    Task<TripItem> AddTripItemAsync(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null);
    Task<IEnumerable<TripItem>> GetTripItemsAsync(Guid tripId, Guid userId);
    Task<TripItem?> GetByIdAsync(Guid id, Guid userId);
    Task<TripItem> UpdateTripItemAsync(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null);
    Task DeleteTripItemAsync(Guid id, Guid userId);
    Task<TripItem> CheckItemAsync(Guid id, bool isChecked, Guid userId);
}
