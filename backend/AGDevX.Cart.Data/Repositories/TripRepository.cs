// ABOUTME: Repository implementation for Trip entities with scope-based authorization
// ABOUTME: Personal trips check CreatedBy, household trips check HouseholdId membership
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
                                  .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Trip>> GetUserTrips(Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default)
    {
        return await context.Trips.Include(t => t.Items)
                                  .Where(t =>
                                      (t.CreatedBy == userId && t.HouseholdId == null) ||
                                      (userHouseholdId != null && t.HouseholdId == userHouseholdId))
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

    public async Task<bool> HasTripAccess(Guid tripId, Guid userId, Guid? userHouseholdId, CancellationToken cancellationToken = default)
    {
        var trip = await context.Trips.FindAsync(new object[] { tripId }, cancellationToken);

        if (trip == null)
        {
            return false;
        }

        //== Personal trip: only the creator has access
        if (trip.HouseholdId == null)
        {
            return trip.CreatedBy == userId;
        }

        //== Household trip: any member of the household has access
        return userHouseholdId != null && trip.HouseholdId == userHouseholdId;
    }

    //== Delete personal TripItems for a user leaving a household.
    //== Prevents ghost data that no one can see after the user leaves.
    public async Task DeletePersonalTripItemsForUser(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        var personalItems = await context.TripItems
            .Include(ti => ti.Trip)
            .Where(ti =>
                ti.Trip != null &&
                ti.Trip.HouseholdId == householdId &&
                !ti.IsHouseholdItem &&
                ti.CreatedBy == userId)
            .ToListAsync(cancellationToken);

        context.TripItems.RemoveRange(personalItems);
        await context.SaveChangesAsync(cancellationToken);
    }
}
