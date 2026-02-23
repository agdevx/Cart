// ABOUTME: Service implementation for household business logic.
// ABOUTME: Handles household operations with authorization and audit trail management.

using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class HouseholdService(IHouseholdRepository repository) : IHouseholdService
{
    private static readonly char[] InviteCodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".ToCharArray();

    private static string GenerateInviteCode()
    {
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => InviteCodeChars[random.Next(InviteCodeChars.Length)]).ToArray());
    }

    //== Create a new household and add the creator as an owner member
    public async Task<Household> CreateHousehold(Guid userId, string name)
    {
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = name,
            InviteCode = GenerateInviteCode(),
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

        return await repository.Create(household);
    }

    //== Get all households where the user is a member
    public async Task<IEnumerable<Household>> GetUserHouseholds(Guid userId)
    {
        return await repository.GetUserHouseholds(userId);
    }

    //== Get household by ID with authorization check
    public async Task<Household?> GetById(Guid userId, Guid householdId)
    {
        var household = await repository.GetById(householdId);

        //== Verify user is a member
        if (household != null && !await repository.IsUserMember(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return household;
    }

    //== Update household with authorization check
    public async Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name)
    {
        var household = await repository.GetById(householdId);
        if (household == null)
        {
            throw new ArgumentException("Household not found");
        }

        //== Verify user is a member
        if (!await repository.IsUserMember(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        household.Name = name;
        household.ModifiedBy = userId.ToString();
        household.ModifiedDate = DateTime.UtcNow;

        return await repository.Update(household);
    }

    //== Delete household with authorization check (owner only)
    public async Task DeleteHousehold(Guid userId, Guid householdId)
    {
        var household = await repository.GetById(householdId);
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

        await repository.Delete(householdId);
    }

    //== Join a household via invite code
    public async Task<Household> JoinHousehold(Guid userId, string inviteCode)
    {
        var household = await repository.GetByInviteCode(inviteCode)
            ?? throw new ArgumentException("Invalid invite code");

        if (household.Members.Any(m => m.UserId == userId))
        {
            throw new InvalidOperationException("User is already a member of this household");
        }

        var member = new HouseholdMember
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.Id,
            UserId = userId,
            Role = "member",
            JoinedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            CreatedDate = DateTime.UtcNow,
            ModifiedBy = userId.ToString(),
            ModifiedDate = DateTime.UtcNow
        };

        await repository.AddMember(member);
        return household;
    }

    //== Remove a member (owner removes other, or member removes self)
    public async Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId)
    {
        var household = await repository.GetById(householdId)
            ?? throw new ArgumentException("Household not found");

        var requestingMember = household.Members.FirstOrDefault(m => m.UserId == requestingUserId)
            ?? throw new UnauthorizedAccessException("User is not a member of this household");

        var isOwner = requestingMember.Role == "owner";
        var isSelf = requestingUserId == targetUserId;

        //== Owner can't remove self (must transfer ownership first or delete household)
        if (isOwner && isSelf)
        {
            throw new InvalidOperationException("Owner cannot remove themselves. Transfer ownership first or delete the household.");
        }

        //== Non-owners can only remove themselves
        if (!isOwner && !isSelf)
        {
            throw new UnauthorizedAccessException("Only the owner can remove other members");
        }

        await repository.RemoveMember(householdId, targetUserId);
    }

    //== Transfer ownership to another member
    public async Task TransferOwnership(Guid requestingUserId, Guid householdId, Guid newOwnerUserId)
    {
        var household = await repository.GetById(householdId)
            ?? throw new ArgumentException("Household not found");

        var isOwner = household.Members.Any(m => m.UserId == requestingUserId && m.Role == "owner");
        if (!isOwner)
        {
            throw new UnauthorizedAccessException("Only the owner can transfer ownership");
        }

        var newOwnerIsMember = household.Members.Any(m => m.UserId == newOwnerUserId);
        if (!newOwnerIsMember)
        {
            throw new ArgumentException("Target user is not a member of this household");
        }

        await repository.UpdateMemberRole(householdId, requestingUserId, "member");
        await repository.UpdateMemberRole(householdId, newOwnerUserId, "owner");
    }

    //== Regenerate invite code (owner only)
    public async Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId)
    {
        var household = await repository.GetById(householdId)
            ?? throw new ArgumentException("Household not found");

        var isOwner = household.Members.Any(m => m.UserId == requestingUserId && m.Role == "owner");
        if (!isOwner)
        {
            throw new UnauthorizedAccessException("Only the owner can regenerate the invite code");
        }

        household.InviteCode = GenerateInviteCode();
        household.ModifiedBy = requestingUserId.ToString();
        household.ModifiedDate = DateTime.UtcNow;
        await repository.Update(household);

        return household.InviteCode;
    }

    //== Get household members (member access)
    public async Task<IEnumerable<HouseholdMember>> GetMembers(Guid userId, Guid householdId)
    {
        var household = await repository.GetById(householdId)
            ?? throw new ArgumentException("Household not found");

        if (!await repository.IsUserMember(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return household.Members;
    }

    //== Get invite code (member access)
    public async Task<string> GetInviteCode(Guid userId, Guid householdId)
    {
        var household = await repository.GetById(householdId)
            ?? throw new ArgumentException("Household not found");

        if (!await repository.IsUserMember(householdId, userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return household.InviteCode;
    }
}
