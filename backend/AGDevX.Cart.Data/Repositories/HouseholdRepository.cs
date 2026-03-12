// ABOUTME: Repository implementation for household data access operations.
// ABOUTME: Uses Entity Framework Core for database operations with member relationships.

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    //== Get household by ID with member relationships
    public async Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Households.Include(h => h.Members)
                                       .ThenInclude(m => m.User)
                                       .FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
    }

    //== Find household by invite code
    public async Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default)
    {
        return await context.Households.Include(h => h.Members)
                                       .ThenInclude(m => m.User)
                                       .FirstOrDefaultAsync(h => h.InviteCode == inviteCode, cancellationToken);
    }

    //== Get all households where the user is a member
    public async Task<IEnumerable<Household>> GetUserHouseholds(Guid userId, CancellationToken cancellationToken = default)
    {
        return await context.Households.Include(h => h.Members)
                                       .ThenInclude(m => m.User)
                                       .Where(h => h.Members.Any(m => m.UserId == userId))
                                       .ToListAsync(cancellationToken);
    }

    //== Create a new household
    public async Task<Household> Create(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Add(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    //== Update an existing household
    public async Task<Household> Update(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Update(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    //== Delete a household
    public async Task Delete(Guid householdId, CancellationToken cancellationToken = default)
    {
        var household = await context.Households.FindAsync(new object[] { householdId }, cancellationToken);
        if (household != null)
        {
            context.Households.Remove(household);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    //== Check if a user is a member of a household
    public async Task<bool> IsUserMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        return await context.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId, cancellationToken);
    }

    //== Add a member to a household
    public async Task AddMember(HouseholdMember member, CancellationToken cancellationToken = default)
    {
        context.HouseholdMembers.Add(member);
        await context.SaveChangesAsync(cancellationToken);
    }

    //== Remove a member from a household
    public async Task RemoveMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        var member = await context.HouseholdMembers.FirstOrDefaultAsync(m => m.HouseholdId == householdId && m.UserId == userId, cancellationToken);
        if (member != null)
        {
            context.HouseholdMembers.Remove(member);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    //== Update a member's role
    public async Task UpdateMemberRole(Guid householdId, Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var member = await context.HouseholdMembers.FirstOrDefaultAsync(m => m.HouseholdId == householdId && m.UserId == userId, cancellationToken);
        if (member != null)
        {
            member.Role = role;
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
