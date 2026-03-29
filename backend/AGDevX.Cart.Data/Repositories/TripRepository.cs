// ABOUTME: Repository implementation for Trip entities with EF Core including navigation property loading
// ABOUTME: and collaborator management with authorization checks for creator and collaborator access
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class TripRepository(CartDbContext context) : ITripRepository
{
    public async Task<Trip?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Trips.Include(t => t.Items)
                                  .ThenInclude(ti => ti.InventoryItem)
                                  .Include(t => t.Items)
                                  .ThenInclude(ti => ti.Store)
                                  .Include(t => t.Collaborators)
                                  .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId, CancellationToken cancellationToken = default)
    {
        var userIdString = userId.ToString();
        return await context.Trips.Include(t => t.Items)
                                  .Include(t => t.Collaborators)
                                  .Where(t => t.CreatedBy == userIdString || t.Collaborators.Any(c => c.UserId == userId))
                                  .ToListAsync(cancellationToken);
    }

    public async Task<Trip> Create(Trip trip, CancellationToken cancellationToken = default)
    {
        context.Trips.Add(trip);
        await context.SaveChangesAsync(cancellationToken);
        return trip;
    }

    public async Task<Trip> Update(Trip trip, CancellationToken cancellationToken = default)
    {
        context.Trips.Update(trip);
        await context.SaveChangesAsync(cancellationToken);
        return trip;
    }

    public async Task Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var trip = await context.Trips.FindAsync(new object[] { id }, cancellationToken);
        if (trip != null)
        {
            context.Trips.Remove(trip);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> IsUserCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Check if user is creator OR in collaborators collection
        var trip = await context.Trips.Include(t => t.Collaborators)
                                      .FirstOrDefaultAsync(t => t.Id == tripId, cancellationToken);

        if (trip == null)
        {
            return false;
        }

        var userIdString = userId.ToString();
        return trip.CreatedBy == userIdString ||
               trip.Collaborators.Any(c => c.UserId == userId);
    }

    public async Task AddCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var collaborator = new TripCollaborator
        {
            TripId = tripId,
            UserId = userId,
            Trip = null!,
            User = null!
        };

        context.TripCollaborators.Add(collaborator);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveCollaborator(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var collaborator = await context.TripCollaborators.FirstOrDefaultAsync(c => c.TripId == tripId && c.UserId == userId, cancellationToken);

        if (collaborator != null)
        {
            context.TripCollaborators.Remove(collaborator);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
