// ABOUTME: Repository interface for managing trip items within specific trips
// ABOUTME: Provides CRUD operations for items that users plan to purchase on shopping trips
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripItemRepository
{
    Task<TripItem?> GetByIdAsync(Guid id);
    Task<IEnumerable<TripItem>> GetTripItemsAsync(Guid tripId);
    Task<TripItem> CreateAsync(TripItem tripItem);
    Task<TripItem> UpdateAsync(TripItem tripItem);
    Task DeleteAsync(Guid id);
}
