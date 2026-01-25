// ABOUTME: Service implementation for household business logic.
// ABOUTME: Handles household operations with authorization and audit trail management.

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class HouseholdService(IHouseholdRepository repository) : IHouseholdService
{
    //== Create a new household and add the creator as an owner member
    public async Task<Household> CreateHouseholdAsync(Guid userId, string name)
    {
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedBy = userId.ToString(),
            CreatedDate = DateTime.UtcNow,
            ModifiedBy = userId.ToString(),
            ModifiedDate = DateTime.UtcNow
        };

        //== Add creator as owner member
        var ownerMember = new HouseholdMember
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.Id,
            UserId = userId,
            Role = "owner",
            JoinedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            CreatedDate = DateTime.UtcNow,
            ModifiedBy = userId.ToString(),
            ModifiedDate = DateTime.UtcNow
        };

        household.Members.Add(ownerMember);

        return await repository.CreateAsync(household);
    }

    //== Get all households where the user is a member
    public async Task<IEnumerable<Household>> GetUserHouseholdsAsync(Guid userId)
    {
        return await repository.GetUserHouseholdsAsync(userId);
    }

    //== Get household by ID with authorization check
    public async Task<Household?> GetByIdAsync(Guid userId, Guid householdId)
    {
        var household = await repository.GetByIdAsync(householdId);

        //== Verify user is a member
        if (household != null && !await repository.IsUserMemberAsync(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return household;
    }

    //== Update household with authorization check
    public async Task<Household> UpdateHouseholdAsync(Guid userId, Guid householdId, string name)
    {
        var household = await repository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new ArgumentException("Household not found");
        }

        //== Verify user is a member
        if (!await repository.IsUserMemberAsync(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        household.Name = name;
        household.ModifiedBy = userId.ToString();
        household.ModifiedDate = DateTime.UtcNow;

        return await repository.UpdateAsync(household);
    }

    //== Delete household with authorization check (owner only)
    public async Task DeleteHouseholdAsync(Guid userId, Guid householdId)
    {
        var household = await repository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new ArgumentException("Household not found");
        }

        //== Verify user is the owner
        var isOwner = household.Members.Any(m => m.UserId == userId && m.Role == "owner");
        if (!isOwner)
        {
            throw new UnauthorizedAccessException("Only household owners can delete the household");
        }

        await repository.DeleteAsync(householdId);
    }
}
