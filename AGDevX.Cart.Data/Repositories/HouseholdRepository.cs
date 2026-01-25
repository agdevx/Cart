// ABOUTME: Repository implementation for household data access operations.
// ABOUTME: Uses Entity Framework Core for database operations with member relationships.

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    //== Get household by ID with member relationships
    public async Task<Household?> GetByIdAsync(Guid householdId)
    {
        return await context.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == householdId);
    }

    //== Get all households where the user is a member
    public async Task<IEnumerable<Household>> GetUserHouseholdsAsync(Guid userId)
    {
        return await context.Households
            .Include(h => h.Members)
            .Where(h => h.Members.Any(m => m.UserId == userId))
            .ToListAsync();
    }

    //== Create a new household
    public async Task<Household> CreateAsync(Household household)
    {
        context.Households.Add(household);
        await context.SaveChangesAsync();
        return household;
    }

    //== Update an existing household
    public async Task<Household> UpdateAsync(Household household)
    {
        context.Households.Update(household);
        await context.SaveChangesAsync();
        return household;
    }

    //== Delete a household
    public async Task DeleteAsync(Guid householdId)
    {
        var household = await context.Households.FindAsync(householdId);
        if (household != null)
        {
            context.Households.Remove(household);
            await context.SaveChangesAsync();
        }
    }

    //== Check if a user is a member of a household
    public async Task<bool> IsUserMemberAsync(Guid householdId, Guid userId)
    {
        return await context.HouseholdMembers
            .AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
    }
}
