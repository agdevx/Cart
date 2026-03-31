// ABOUTME: Repository implementation for household data access operations
// ABOUTME: Single-household model — queries User.HouseholdId instead of join table

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class HouseholdRepository(CartDbContext context) : IHouseholdRepository
{
    public async Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Households.FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
    }

    public async Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default)
    {
        return await context.Households.FirstOrDefaultAsync(h => h.InviteCode == inviteCode, cancellationToken);
    }

    public async Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.Include(u => u.Household).FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user?.Household;
    }

    public async Task<IEnumerable<User>> GetMembers(Guid householdId, CancellationToken cancellationToken = default)
    {
        return await context.Users.Where(u => u.HouseholdId == householdId).ToListAsync(cancellationToken);
    }

    public async Task<Household> Create(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Add(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    public async Task<Household> Update(Household household, CancellationToken cancellationToken = default)
    {
        context.Households.Update(household);
        await context.SaveChangesAsync(cancellationToken);
        return household;
    }

    public async Task Delete(Guid householdId, CancellationToken cancellationToken = default)
    {
        var household = await context.Households.FindAsync(new object[] { householdId }, cancellationToken);

        if (household != null)
        {
            context.Households.Remove(household);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> IsUserOwner(Guid householdId, Guid userId, CancellationToken cancellationToken = default)
    {
        var household = await context.Households.FindAsync(new object[] { householdId }, cancellationToken);

        if (household == null)
        {
            return false;
        }

        return household.Owner1UserId == userId || household.Owner2UserId == userId;
    }
}
