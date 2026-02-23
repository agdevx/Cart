// ABOUTME: Service interface for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership and trip access
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTrip(string name, Guid userId, Guid? householdId = null);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId);
    Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId);
    Task<Trip?> GetById(Guid id);
    Task<Trip> UpdateTrip(Trip trip);
    Task DeleteTrip(Guid tripId, Guid userId);
    Task<Trip> CompleteTrip(Guid tripId, Guid userId);
    Task<Trip> ReopenTrip(Guid tripId, Guid userId);
    Task AddCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId);
    Task RemoveCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId);
}
