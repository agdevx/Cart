// ABOUTME: Repository interface for Trip entities providing CRUD operations for shopping trips
// ABOUTME: and collaborator management including authorization checks for trip access
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId, CancellationToken cancellationToken = default);
    Task<Trip> Create(Trip trip, CancellationToken cancellationToken = default);
    Task<Trip> Update(Trip trip, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
    Task<bool> IsUserCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task AddCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task RemoveCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
}
