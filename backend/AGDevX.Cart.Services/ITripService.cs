// ABOUTME: Service interface for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for trip access
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTrip(string name, DateOnly? tripDate, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default);
    Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<Trip> UpdateTrip(Guid tripId, string name, DateOnly? tripDate, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task AddCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId, CancellationToken cancellationToken = default);
    Task RemoveCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId, CancellationToken cancellationToken = default);
}
