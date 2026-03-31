// ABOUTME: Service implementation for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: Uses scope-based authorization: personal trips are creator-only, household trips allow any member
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository, CartDbContext dbContext) : ITripService
{
    public async Task<Trip> CreateTrip(string name, DateOnly? tripDate, Guid? householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== If household trip, verify user belongs to that household
        if (householdId.HasValue)
        {
            var user = await GetUserOrThrow(userId, cancellationToken);

            if (user.HouseholdId != householdId.Value)
            {
                throw new UnauthorizedAccessException("User is not a member of the specified household");
            }
        }

        var trip = new Trip
        {
            Name = name,
            TripDate = tripDate,
            HouseholdId = householdId,
            IsCompleted = false,
            CompletedAt = null,
            IsStarted = false,
            StartedAt = null
        };

        return await tripRepository.Create(trip, cancellationToken);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserOrThrow(userId, cancellationToken);
        return await tripRepository.GetUserTrips(userId, user.HouseholdId, cancellationToken);
    }

    public async Task<Trip?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(id, userId, user.HouseholdId, cancellationToken);

        return await tripRepository.GetById(id, cancellationToken);
    }

    public async Task<Trip> UpdateTrip(Guid tripId, string name, DateOnly? tripDate, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before updating trip
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        trip.Name = name;

        if (tripDate.HasValue)
        {
            trip.TripDate = tripDate;
        }

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task DeleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access (personal = creator only, household = any member)
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        await tripRepository.Delete(tripId, cancellationToken);
    }

    public async Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before starting trip
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        trip.IsStarted = true;

        //== Only set StartedAt on first start — historical timestamp
        if (!trip.StartedAt.HasValue)
        {
            trip.StartedAt = DateTime.UtcNow;
        }

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before completing trip
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        trip.IsCompleted = true;

        //== Only set CompletedAt on first completion — historical timestamp
        if (!trip.CompletedAt.HasValue)
        {
            trip.CompletedAt = DateTime.UtcNow;
        }

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before reopening trip
        var user = await GetUserOrThrow(userId, cancellationToken);
        await VerifyTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Reset status flags but preserve StartedAt and CompletedAt — historical records
        trip.IsCompleted = false;
        trip.IsStarted = false;

        return await tripRepository.Update(trip, cancellationToken);
    }

    private async Task<User> GetUserOrThrow(Guid userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found");
        return user;
    }

    private async Task VerifyTripAccess(Guid tripId, Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken)
    {
        var hasAccess = await tripRepository.HasTripAccess(tripId, userId, userHouseholdId, cancellationToken);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this trip");
        }
    }
}
