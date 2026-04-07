// ABOUTME: Service interface for Trip business logic including lifecycle and scope-based authorization
// ABOUTME: Personal trips: creator only. Household trips: any household member.
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface ITripService
{
    Task<Trip> CreateTrip(string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default);
    Task<Trip?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> UpdateTrip(Guid tripId, string name, DateOnly? tripDate, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<Trip> DuplicateTrip(Guid sourceTripId, string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default);
}
