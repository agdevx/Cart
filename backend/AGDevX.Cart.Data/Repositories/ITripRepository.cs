// ABOUTME: Repository interface for Trip entities providing CRUD and scope-based authorization
// ABOUTME: Authorization checks use CreatedBy (personal) or HouseholdId (household membership)
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface ITripRepository
{
    Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default);
    Task<Trip> Create(Trip trip, CancellationToken cancellationToken = default);
    Task<Trip> Update(Trip trip, CancellationToken cancellationToken = default);
    Task Delete(Guid id, CancellationToken cancellationToken = default);
    Task<bool> HasTripAccess(Guid tripId, Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default);
    Task DeletePersonalTripItemsForUser(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
}
