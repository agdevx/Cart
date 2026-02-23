// ABOUTME: Repository implementation for household data access operations.
// ABOUTME: Uses Entity Framework Core for database operations with member relationships.

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    //== Get household by ID with member relationships
    public async Task<Household?> GetById(Guid householdId)
    {
        return await context.Households.Include(h => h.Members)
                                       .FirstOrDefaultAsync(h => h.Id == householdId);
    }

    //== Find household by invite code
    public async Task<Household?> GetByInviteCode(string inviteCode)
    {
        return await context.Households.Include(h => h.Members)
                                       .FirstOrDefaultAsync(h => h.InviteCode == inviteCode);
    }

    //== Get all households where the user is a member
    public async Task<IEnumerable<Household>> GetUserHouseholds(Guid userId)
    {
        return await context.Households.Include(h => h.Members)
                                       .Where(h => h.Members.Any(m => m.UserId == userId))
                                       .ToListAsync();
    }

    //== Create a new household
    public async Task<Household> Create(Household household)
    {
        context.Households.Add(household);
        await context.SaveChangesAsync();
        return household;
    }

    //== Update an existing household
    public async Task<Household> Update(Household household)
    {
        context.Households.Update(household);
        await context.SaveChangesAsync();
        return household;
    }

    //== Delete a household
    public async Task Delete(Guid householdId)
    {
        var household = await context.Households.FindAsync(householdId);
        if (household != null)
        {
            context.Households.Remove(household);
            await context.SaveChangesAsync();
        }
    }

    //== Check if a user is a member of a household
    public async Task<bool> IsUserMember(Guid householdId, Guid userId)
    {
        return await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId);
    }

    //== Add a member to a household
    public async Task AddMember(HouseholdMember member)
    {
        context.HouseholdMembers.Add(member);
        await context.SaveChangesAsync();
    }

    //== Remove a member from a household
    public async Task RemoveMember(Guid householdId, Guid userId)
    {
        var member = await context.HouseholdMembers.FirstOrDefaultAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        if (member != null)
        {
            context.HouseholdMembers.Remove(member);
            await context.SaveChangesAsync();
        }
    }

    //== Update a member's role
    public async Task UpdateMemberRole(Guid householdId, Guid userId, string role)
    {
        var member = await context.HouseholdMembers.FirstOrDefaultAsync(m => m.HouseholdId == householdId && m.UserId == userId);
        if (member != null)
        {
            member.Role = role;
            await context.SaveChangesAsync();
        }
    }
}
