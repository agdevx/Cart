// ABOUTME: Service implementation for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership and trip access
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository, IHouseholdRepository householdRepository) : ITripService
{
    public async Task<Trip> CreateTrip(string name, Guid userId, Guid? householdId = null, CancellationToken cancellationToken = default)
    {
        //== Verify household membership if household trip
        if (householdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMember(householdId.Value, userId, cancellationToken);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }
        }

        var trip = new Trip
        {
            Name = name,
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
        return await tripRepository.GetUserTrips(userId, cancellationToken);
    }

    public async Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await tripRepository.GetHouseholdTrips(householdId, cancellationToken);
    }

    public async Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await tripRepository.GetById(id, cancellationToken);
    }

    public async Task<Trip> UpdateTrip(Guid tripId, string name, Guid? householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before updating trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        //== Verify household membership if changing to household scope
        if (householdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMember(householdId.Value, userId, cancellationToken);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        trip.Name = name;
        trip.HouseholdId = householdId;
        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task DeleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Only creator can delete trip
        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        if (trip.CreatedBy != userId.ToString())
        {
            throw new UnauthorizedAccessException("Only the creator can delete the trip");
        }

        await tripRepository.Delete(tripId, cancellationToken);
    }

    public async Task<Trip> StartTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before starting trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Set IsStarted and StartedAt timestamp
        trip.IsStarted = true;
        trip.StartedAt = DateTime.UtcNow;

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task<Trip> CompleteTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before completing trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Set IsCompleted and CompletedAt timestamp
        trip.IsCompleted = true;
        trip.CompletedAt = DateTime.UtcNow;

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task<Trip> ReopenTrip(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before reopening trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Reset completion and started state when reopening
        trip.IsCompleted = false;
        trip.CompletedAt = null;
        trip.IsStarted = false;
        trip.StartedAt = null;

        return await tripRepository.Update(trip, cancellationToken);
    }

    public async Task AddCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId, CancellationToken cancellationToken = default)
    {
        //== Verify user is trip collaborator before adding new collaborators
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Verify household membership for household trips
        if (trip.HouseholdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMember(trip.HouseholdId.Value, collaboratorUserId, cancellationToken);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("Collaborator is not a member of the household");
            }
        }

        await tripRepository.AddCollaborator(tripId, collaboratorUserId, cancellationToken);
    }

    public async Task RemoveCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId, CancellationToken cancellationToken = default)
    {
        //== Verify user is trip collaborator before removing collaborators
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        await tripRepository.RemoveCollaborator(tripId, collaboratorUserId, cancellationToken);
    }
}
