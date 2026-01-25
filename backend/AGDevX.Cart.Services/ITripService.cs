// ABOUTME: Service interface for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership and trip access
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTripAsync(string name, Guid userId, Guid? householdId = null);
    Task<IEnumerable<Trip>> GetUserTripsAsync(Guid userId);
    Task<IEnumerable<Trip>> GetHouseholdTripsAsync(Guid householdId);
    Task<Trip?> GetByIdAsync(Guid id);
    Task<Trip> UpdateTripAsync(Trip trip);
    Task DeleteTripAsync(Guid tripId, Guid userId);
    Task<Trip> CompleteTripAsync(Guid tripId, Guid userId);
    Task<Trip> ReopenTripAsync(Guid tripId, Guid userId);
    Task AddCollaboratorAsync(Guid tripId, Guid userId, Guid collaboratorUserId);
    Task RemoveCollaboratorAsync(Guid tripId, Guid userId, Guid collaboratorUserId);
}
