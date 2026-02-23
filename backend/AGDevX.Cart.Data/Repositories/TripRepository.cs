// ABOUTME: Repository implementation for Trip entities with EF Core including navigation property loading
// ABOUTME: and collaborator management with authorization checks for creator and collaborator access
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripRepository(CartDbContext context) : ITripRepository
{
    public async Task<Trip?> GetById(Guid id)
    {
        return await context.Trips
            .Include(t => t.Items)
                .ThenInclude(ti => ti.InventoryItem)
            .Include(t => t.Items)
                .ThenInclude(ti => ti.Store)
            .Include(t => t.Collaborators)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId)
    {
        return await context.Trips
            .Include(t => t.Items)
            .Include(t => t.Collaborators)
            .Where(t => t.CreatedByUserId == userId || t.Collaborators.Any(c => c.UserId == userId))
            .ToListAsync();
    }

    public async Task<IEnumerable<Trip>> GetHouseholdTrips(Guid householdId)
    {
        return await context.Trips
            .Include(t => t.Items)
            .Include(t => t.Collaborators)
            .Where(t => t.HouseholdId == householdId)
            .ToListAsync();
    }

    public async Task<Trip> Create(Trip trip)
    {
        context.Trips.Add(trip);
        await context.SaveChangesAsync();
        return trip;
    }

    public async Task<Trip> Update(Trip trip)
    {
        context.Trips.Update(trip);
        await context.SaveChangesAsync();
        return trip;
    }

    public async Task Delete(Guid id)
    {
        var trip = await context.Trips.FindAsync(id);
        if (trip != null)
        {
            context.Trips.Remove(trip);
            await context.SaveChangesAsync();
        }
    }

    public async Task<bool> IsUserCollaborator(Guid tripId, Guid userId)
    {
        //== Check if user is creator OR in collaborators collection
        var trip = await context.Trips
            .Include(t => t.Collaborators)
            .FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            return false;
        }

        return trip.CreatedByUserId == userId ||
               trip.Collaborators.Any(c => c.UserId == userId);
    }

    public async Task AddCollaborator(Guid tripId, Guid userId)
    {
        var collaborator = new TripCollaborator
        {
            TripId = tripId,
            UserId = userId,
            Trip = null!,
            User = null!
        };

        context.TripCollaborators.Add(collaborator);
        await context.SaveChangesAsync();
    }

    public async Task RemoveCollaborator(Guid tripId, Guid userId)
    {
        var collaborator = await context.TripCollaborators
            .FirstOrDefaultAsync(c => c.TripId == tripId && c.UserId == userId);

        if (collaborator != null)
        {
            context.TripCollaborators.Remove(collaborator);
            await context.SaveChangesAsync();
        }
    }
}
