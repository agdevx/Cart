// ABOUTME: Repository interface for Trip entities providing CRUD operations for shopping trips
// ABOUTME: and collaborator management including authorization checks for trip access
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetByIdAsync(Guid id);
    Task<IEnumerable<Trip>> GetUserTripsAsync(Guid userId);
    Task<IEnumerable<Trip>> GetHouseholdTripsAsync(Guid householdId);
    Task<Trip> CreateAsync(Trip trip);
    Task<Trip> UpdateAsync(Trip trip);
    Task DeleteAsync(Guid id);
    Task<bool> IsUserCollaboratorAsync(Guid tripId, Guid userId);
    Task AddCollaboratorAsync(Guid tripId, Guid userId);
    Task RemoveCollaboratorAsync(Guid tripId, Guid userId);
}
