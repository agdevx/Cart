// ABOUTME: Service implementation for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership and trip access
using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository, IHouseholdRepository householdRepository) : ITripService
{
    public async Task<Trip> CreateTrip(string name, Guid userId, Guid? householdId = null)
    {
        //== Verify household membership if household trip
        if (householdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMember(householdId.Value, userId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("User is not a member of the household");
            }
        }

        //== Set CreatedByUserId and initialize trip properties
        var trip = new Trip
        {
            Name = name,
            CreatedByUserId = userId,
            HouseholdId = householdId,
            IsCompleted = false,
            CompletedAt = null,
            CreatedDate = DateTime.UtcNow
        };

        return await tripRepository.Create(trip);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId)
    {
        return await tripRepository.GetUserTrips(userId);
    }

    public async Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId)
    {
        return await tripRepository.GetHouseholdTrips(householdId);
    }

    public async Task<Trip?> GetById(Guid id)
    {
        return await tripRepository.GetById(id);
    }

    public async Task<Trip> UpdateTrip(Trip trip)
    {
        return await tripRepository.Update(trip);
    }

    public async Task DeleteTrip(Guid tripId, Guid userId)
    {
        //== Only creator can delete trip
        var trip = await tripRepository.GetById(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        if (trip.CreatedByUserId != userId)
        {
            throw new UnauthorizedAccessException("Only the creator can delete the trip");
        }

        await tripRepository.Delete(tripId);
    }

    public async Task<Trip> CompleteTrip(Guid tripId, Guid userId)
    {
        //== Verify user is collaborator before completing trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Set IsCompleted and CompletedAt timestamp
        trip.IsCompleted = true;
        trip.CompletedAt = DateTime.UtcNow;

        return await tripRepository.Update(trip);
    }

    public async Task<Trip> ReopenTrip(Guid tripId, Guid userId)
    {
        //== Verify user is collaborator before reopening trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Set IsCompleted to false and clear CompletedAt timestamp
        trip.IsCompleted = false;
        trip.CompletedAt = null;

        return await tripRepository.Update(trip);
    }

    public async Task AddCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId)
    {
        //== Verify user is trip collaborator before adding new collaborators
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Verify household membership for household trips
        if (trip.HouseholdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMember(trip.HouseholdId.Value, collaboratorUserId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("Collaborator is not a member of the household");
            }
        }

        await tripRepository.AddCollaborator(tripId, collaboratorUserId);
    }

    public async Task RemoveCollaborator(Guid tripId, Guid userId, Guid collaboratorUserId)
    {
        //== Verify user is trip collaborator before removing collaborators
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        await tripRepository.RemoveCollaborator(tripId, collaboratorUserId);
    }
}
