// ABOUTME: Service implementation for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for household membership and trip access
using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository, IHouseholdRepository householdRepository) : ITripService
{
    public async Task<Trip> CreateTripAsync(string name, Guid userId, Guid? householdId = null)
    {
        //== Verify household membership if household trip
        if (householdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMemberAsync(householdId.Value, userId);
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
            CompletedAt = null
        };

        return await tripRepository.CreateAsync(trip);
    }

    public async Task<IEnumerable<Trip>> GetUserTripsAsync(Guid userId)
    {
        return await tripRepository.GetUserTripsAsync(userId);
    }

    public async Task<IEnumerable<Trip>> GetHouseholdTripsAsync(Guid householdId)
    {
        return await tripRepository.GetHouseholdTripsAsync(householdId);
    }

    public async Task<Trip?> GetByIdAsync(Guid id)
    {
        return await tripRepository.GetByIdAsync(id);
    }

    public async Task<Trip> UpdateTripAsync(Trip trip)
    {
        return await tripRepository.UpdateAsync(trip);
    }

    public async Task DeleteTripAsync(Guid tripId, Guid userId)
    {
        //== Only creator can delete trip
        var trip = await tripRepository.GetByIdAsync(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        if (trip.CreatedByUserId != userId)
        {
            throw new UnauthorizedAccessException("Only the creator can delete the trip");
        }

        await tripRepository.DeleteAsync(tripId);
    }

    public async Task<Trip> CompleteTripAsync(Guid tripId, Guid userId)
    {
        //== Verify user is collaborator before completing trip
        var isCollaborator = await tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetByIdAsync(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Set IsCompleted and CompletedAt timestamp
        trip.IsCompleted = true;
        trip.CompletedAt = DateTime.UtcNow;

        return await tripRepository.UpdateAsync(trip);
    }

    public async Task<Trip> ReopenTripAsync(Guid tripId, Guid userId)
    {
        //== Verify user is collaborator before reopening trip
        var isCollaborator = await tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetByIdAsync(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Set IsCompleted to false and clear CompletedAt timestamp
        trip.IsCompleted = false;
        trip.CompletedAt = null;

        return await tripRepository.UpdateAsync(trip);
    }

    public async Task AddCollaboratorAsync(Guid tripId, Guid userId, Guid collaboratorUserId)
    {
        //== Verify user is trip collaborator before adding new collaborators
        var isCollaborator = await tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetByIdAsync(tripId);
        if (trip == null)
        {
            throw new KeyNotFoundException("Trip not found");
        }

        //== Verify household membership for household trips
        if (trip.HouseholdId.HasValue)
        {
            var isMember = await householdRepository.IsUserMemberAsync(trip.HouseholdId.Value, collaboratorUserId);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("Collaborator is not a member of the household");
            }
        }

        await tripRepository.AddCollaboratorAsync(tripId, collaboratorUserId);
    }

    public async Task RemoveCollaboratorAsync(Guid tripId, Guid userId, Guid collaboratorUserId)
    {
        //== Verify user is trip collaborator before removing collaborators
        var isCollaborator = await tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        await tripRepository.RemoveCollaboratorAsync(tripId, collaboratorUserId);
    }
}
