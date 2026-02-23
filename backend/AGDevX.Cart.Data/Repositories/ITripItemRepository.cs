// ABOUTME: Repository interface for managing trip items within specific trips
// ABOUTME: Provides CRUD operations for items that users plan to purchase on shopping trips
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripItemRepository
{
    Task<TripItem?> GetById(Guid id);
    Task<IEnumerable<TripItem>> GetTripItems(Guid tripId);
    Task<TripItem> Create(TripItem tripItem);
    Task<TripItem> Update(TripItem tripItem);
    Task Delete(Guid id);
}
