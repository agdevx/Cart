// ABOUTME: Service implementation for Trip business logic including lifecycle management (create, complete, reopen)
// ABOUTME: and collaborator functionality with authorization checks for trip access
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripService(ITripRepository tripRepository) : ITripService
{
    public async Task<Trip> CreateTrip(string name, Guid userId, CancellationToken cancellationToken = default)
    {
        var trip = new Trip
        {
            Name = name,
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

    public async Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await tripRepository.GetById(id, cancellationToken);
    }

    public async Task<Trip> UpdateTrip(Guid tripId, string name, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before updating trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        trip.Name = name;
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
        //== Verify user is collaborator before completing trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

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
        //== Verify user is collaborator before reopening trip
        var isCollaborator = await tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        var trip = await tripRepository.GetById(tripId, cancellationToken)
                        ?? throw new KeyNotFoundException("Trip not found");

        //== Reset status flags but preserve StartedAt and CompletedAt — historical records
        trip.IsCompleted = false;
        trip.IsStarted = false;

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
