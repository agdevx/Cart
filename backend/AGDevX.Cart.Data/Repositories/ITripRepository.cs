// ABOUTME: Repository interface for Trip entities providing CRUD operations for shopping trips
// ABOUTME: and collaborator management including authorization checks for trip access
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetById(Guid id);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId);
    Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId);
    Task<Trip> Create(Trip trip);
    Task<Trip> Update(Trip trip);
    Task Delete(Guid id);
    Task<bool> IsUserCollaborator(Guid tripId, Guid userId);
    Task AddCollaborator(Guid tripId, Guid userId);
    Task RemoveCollaborator(Guid tripId, Guid userId);
}
