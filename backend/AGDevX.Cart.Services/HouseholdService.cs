// ABOUTME: Service implementation for household business logic
// ABOUTME: Single-household model with equal co-ownership, auto-swap on join/create, and 5 swap scenarios

using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Services;

public class HouseholdService(
    IHouseholdRepository householdRepository,
    ITripRepository tripRepository,
    IUserPreferencesRepository userPreferencesRepository,
    CartDbContext dbContext
) : IHouseholdService
{
    private static readonly char[] InviteCodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".ToCharArray();

    private static string GenerateInviteCode()
    {
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => InviteCodeChars[random.Next(InviteCodeChars.Length)]).ToArray());
    }

    //== Create a new household and auto-swap out of any existing household
    public async Task<Household> CreateHousehold(Guid userId, string name, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        //== If user already belongs to a household, execute swap (leave the old one)
        if (user.HouseholdId != null)
        {
            await ExecuteSwap(user, cancellationToken);
        }

        //== Create household with the user as primary owner
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = name,
            InviteCode = GenerateInviteCode(),
            Owner1UserId = userId
        };

        await householdRepository.Create(household, cancellationToken);

        //== Point user at the new household
        user.HouseholdId = household.Id;
        await dbContext.SaveChangesAsync(cancellationToken);

        //== Reset ShowHouseholdPage so the household tab appears
        await ResetShowHouseholdPage(userId, cancellationToken);

        return household;
    }

    //== Get the single household the user belongs to
    public async Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default)
    {
        return await householdRepository.GetUserHousehold(userId, cancellationToken);
    }

    //== Get household by ID with membership check
    public async Task<Household?> GetById(Guid userId, Guid householdId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        return await householdRepository.GetById(householdId, cancellationToken);
    }

    //== Update household name — any member can rename
    public async Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        household.Name = name;

        return await householdRepository.Update(household, cancellationToken);
    }

    //== Delete household — owners only, cascade handles cleanup
    public async Task DeleteHousehold(Guid userId, Guid householdId, CancellationToken cancellationToken = default)
    {
        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        if (household.Owner1UserId != userId && household.Owner2UserId != userId)
        {
            throw new UnauthorizedAccessException("Only household owners can delete the household");
        }

        await householdRepository.Delete(householdId, cancellationToken);
    }

    //== Join a household via invite code, auto-swapping out of any existing household
    public async Task<Household> JoinHousehold(Guid userId, string inviteCode, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        var household = await householdRepository.GetByInviteCode(inviteCode, cancellationToken)
                            ?? throw new ArgumentException("Invalid invite code");

        //== Already in this household — no-op error
        if (user.HouseholdId == household.Id)
        {
            throw new InvalidOperationException("You are already a member of this household");
        }

        //== If user belongs to a different household, execute swap (leave the old one)
        if (user.HouseholdId != null)
        {
            await ExecuteSwap(user, cancellationToken);
        }

        //== Point user at the target household
        user.HouseholdId = household.Id;
        await dbContext.SaveChangesAsync(cancellationToken);

        //== Reset ShowHouseholdPage so the household tab appears
        await ResetShowHouseholdPage(userId, cancellationToken);

        return household;
    }

    //== Leave the user's current household with scenario-based logic
    public async Task LeaveHousehold(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        if (user.HouseholdId == null)
        {
            throw new InvalidOperationException("You are not a member of any household");
        }

        var household = await householdRepository.GetById(user.HouseholdId.Value, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        var members = (await householdRepository.GetMembers(household.Id, cancellationToken)).ToList();
        var isOwner = household.Owner1UserId == userId || household.Owner2UserId == userId;

        if (!isOwner)
        {
            //== Scenario 1: Non-owner member — just leave and clean up trip items
            await RemoveUserFromHousehold(user, household.Id, cancellationToken);
            return;
        }

        var hasCoOwner = (household.Owner1UserId == userId && household.Owner2UserId != null) ||
                         (household.Owner2UserId == userId);
        var otherCoOwnerId = household.Owner1UserId == userId ? household.Owner2UserId : household.Owner1UserId;

        if (hasCoOwner && otherCoOwnerId != null)
        {
            //== Scenario 2: Owner with co-owner — promote co-owner if needed, then leave
            if (household.Owner1UserId == userId)
            {
                //== Move Owner2 into Owner1 slot
                household.Owner1UserId = otherCoOwnerId.Value;
                household.Owner2UserId = null;
            }
            else
            {
                //== User is Owner2 — just clear the slot
                household.Owner2UserId = null;
            }

            await householdRepository.Update(household, cancellationToken);
            await RemoveUserFromHousehold(user, household.Id, cancellationToken);
            return;
        }

        //== Owner with no co-owner
        if (members.Count > 1)
        {
            //== Scenario 3: Sole owner with other members — block the leave
            throw new InvalidOperationException("You cannot leave this household until you transfer ownership to one of the other members");
        }

        //== Scenario 4: Sole member — leave and delete the household (cascade handles everything)
        user.HouseholdId = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        await householdRepository.Delete(household.Id, cancellationToken);
    }

    //== Advisory endpoint — tells the frontend which confirmation modal to show before join/create
    public async Task<SwapStatusResponse> GetSwapStatus(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        //== No household — nothing to swap out of
        if (user.HouseholdId == null)
        {
            return new SwapStatusResponse { Scenario = "none" };
        }

        var household = await householdRepository.GetById(user.HouseholdId.Value, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        var members = (await householdRepository.GetMembers(household.Id, cancellationToken)).ToList();
        var isOwner = household.Owner1UserId == userId || household.Owner2UserId == userId;

        var baseResponse = new SwapStatusResponse
        {
            CurrentHouseholdId = household.Id,
            CurrentHouseholdName = household.Name
        };

        //== Non-owner can always leave freely
        if (!isOwner)
        {
            baseResponse.Scenario = "regular-member";
            return baseResponse;
        }

        //== Owner — check for co-owner
        var coOwnerUserId = household.Owner1UserId == userId ? household.Owner2UserId : (Guid?)household.Owner1UserId;

        /*
         * If the user IS Owner1, the co-owner is Owner2 (nullable).
         * If the user IS Owner2, the co-owner is Owner1 (always populated).
         * But Owner1 could theoretically equal the user only when they're Owner1,
         * so we check both directions.
         */
        if (household.Owner2UserId == userId)
        {
            coOwnerUserId = household.Owner1UserId;
        }
        else
        {
            coOwnerUserId = household.Owner2UserId;
        }

        if (coOwnerUserId != null)
        {
            var coOwner = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == coOwnerUserId, cancellationToken);

            baseResponse.Scenario = "has-co-owner";
            baseResponse.CoOwnerName = coOwner?.Name ?? "Unknown";
            return baseResponse;
        }

        //== No co-owner — check if sole member or has other members
        if (members.Count == 1)
        {
            baseResponse.Scenario = "sole-member";
            return baseResponse;
        }

        baseResponse.Scenario = "ownership-transfer-required";
        return baseResponse;
    }

    //== Get household members mapped to response DTOs
    public async Task<IEnumerable<HouseholdMemberResponse>> GetMembers(Guid userId, Guid householdId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        var members = await householdRepository.GetMembers(householdId, cancellationToken);

        return members.Select(m => new HouseholdMemberResponse
        {
            UserId = m.Id,
            Name = m.Name,
            IsOwner = household.Owner1UserId == m.Id || household.Owner2UserId == m.Id
        });
    }

    //== Remove another member from the household — owners only, cannot remove other owners
    public async Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        if (requestingUserId == targetUserId)
        {
            throw new InvalidOperationException("Use the leave action to remove yourself");
        }

        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        //== Verify requesting user is an owner
        if (household.Owner1UserId != requestingUserId && household.Owner2UserId != requestingUserId)
        {
            throw new UnauthorizedAccessException("Only owners can remove members");
        }

        //== Cannot remove another owner — they must be demoted first or leave voluntarily
        if (household.Owner1UserId == targetUserId || household.Owner2UserId == targetUserId)
        {
            throw new InvalidOperationException("Owners must be demoted before they can be removed, or they can leave voluntarily");
        }

        var targetUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken)
                             ?? throw new ArgumentException("Target user not found");

        if (targetUser.HouseholdId != householdId)
        {
            throw new ArgumentException("Target user is not a member of this household");
        }

        await RemoveUserFromHousehold(targetUser, householdId, cancellationToken);
    }

    //== Promote a member to co-owner — requires an empty owner slot
    public async Task PromoteToOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        //== Verify requesting user is an owner
        if (household.Owner1UserId != requestingUserId && household.Owner2UserId != requestingUserId)
        {
            throw new UnauthorizedAccessException("Only owners can promote members");
        }

        //== Verify target is a member of this household
        var targetUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken)
                             ?? throw new ArgumentException("Target user not found");

        if (targetUser.HouseholdId != householdId)
        {
            throw new ArgumentException("Target user is not a member of this household");
        }

        //== Fill the empty owner slot
        if (household.Owner1UserId == Guid.Empty)
        {
            household.Owner1UserId = targetUserId;
        }
        else if (household.Owner2UserId == null)
        {
            household.Owner2UserId = targetUserId;
        }
        else
        {
            throw new InvalidOperationException("Both owner slots are already filled");
        }

        await householdRepository.Update(household, cancellationToken);
    }

    //== Demote an owner to regular member — cannot leave zero owners
    public async Task DemoteOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        //== Verify requesting user is an owner
        if (household.Owner1UserId != requestingUserId && household.Owner2UserId != requestingUserId)
        {
            throw new UnauthorizedAccessException("Only owners can demote other owners");
        }

        //== Check if demoting this user would leave zero owners
        var isTargetOwner1 = household.Owner1UserId == targetUserId;
        var isTargetOwner2 = household.Owner2UserId == targetUserId;

        if (!isTargetOwner1 && !isTargetOwner2)
        {
            throw new ArgumentException("Target user is not an owner");
        }

        var wouldLeaveZeroOwners = (isTargetOwner1 && household.Owner2UserId == null) ||
                                   (isTargetOwner2 && household.Owner1UserId == Guid.Empty);

        if (wouldLeaveZeroOwners)
        {
            throw new InvalidOperationException("Cannot demote the last remaining owner");
        }

        //== Clear the target's owner slot — they remain a member via HouseholdId
        if (isTargetOwner1)
        {
            //== Move Owner2 into Owner1 slot so Owner1 is always populated
            if (household.Owner2UserId != null)
            {
                household.Owner1UserId = household.Owner2UserId.Value;
                household.Owner2UserId = null;
            }
        }
        else
        {
            household.Owner2UserId = null;
        }

        await householdRepository.Update(household, cancellationToken);
    }

    //== Regenerate the invite code — owners only
    public async Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId, CancellationToken cancellationToken = default)
    {
        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        if (household.Owner1UserId != requestingUserId && household.Owner2UserId != requestingUserId)
        {
            throw new UnauthorizedAccessException("Only owners can regenerate the invite code");
        }

        household.InviteCode = GenerateInviteCode();
        await householdRepository.Update(household, cancellationToken);

        return household.InviteCode;
    }

    //== Get invite code — any member can view
    public async Task<string> GetInviteCode(Guid userId, Guid householdId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                       ?? throw new ArgumentException("User not found");

        if (user.HouseholdId != householdId)
        {
            throw new UnauthorizedAccessException("User is not a member of this household");
        }

        var household = await householdRepository.GetById(householdId, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        return household.InviteCode;
    }

    /*
     * Execute the swap — same logic as LeaveHousehold but called internally
     * by CreateHousehold and JoinHousehold. Re-evaluates the scenario at
     * execution time since the swap-status endpoint is advisory only.
     */
    private async Task ExecuteSwap(User user, CancellationToken cancellationToken)
    {
        if (user.HouseholdId == null)
        {
            return;
        }

        var household = await householdRepository.GetById(user.HouseholdId.Value, cancellationToken)
                            ?? throw new ArgumentException("Household not found");

        var members = (await householdRepository.GetMembers(household.Id, cancellationToken)).ToList();
        var isOwner = household.Owner1UserId == user.Id || household.Owner2UserId == user.Id;

        if (!isOwner)
        {
            //== Non-owner — just leave and clean up
            await RemoveUserFromHousehold(user, household.Id, cancellationToken);
            return;
        }

        var hasCoOwner = (household.Owner1UserId == user.Id && household.Owner2UserId != null) ||
                         (household.Owner2UserId == user.Id);

        if (hasCoOwner)
        {
            //== Owner with co-owner — adjust owner slots, then leave
            if (household.Owner1UserId == user.Id)
            {
                household.Owner1UserId = household.Owner2UserId!.Value;
                household.Owner2UserId = null;
            }
            else
            {
                household.Owner2UserId = null;
            }

            await householdRepository.Update(household, cancellationToken);
            await RemoveUserFromHousehold(user, household.Id, cancellationToken);
            return;
        }

        //== Owner with no co-owner
        if (members.Count > 1)
        {
            //== Cannot auto-swap when other members would be orphaned
            throw new InvalidOperationException("You cannot leave this household until you transfer ownership to one of the other members");
        }

        //== Sole member — leave and delete the household
        user.HouseholdId = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        await householdRepository.Delete(household.Id, cancellationToken);
    }

    //== Shared helper: clear user's HouseholdId and delete their personal trip items from the household
    private async Task RemoveUserFromHousehold(User user, Guid householdId, CancellationToken cancellationToken)
    {
        user.HouseholdId = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        await tripRepository.DeletePersonalTripItemsForUser(householdId, user.Id, cancellationToken);
    }

    //== Shared helper: ensure ShowHouseholdPage is true when joining or creating a household
    private async Task ResetShowHouseholdPage(Guid userId, CancellationToken cancellationToken)
    {
        var prefs = await userPreferencesRepository.GetByUserId(userId, cancellationToken);

        if (prefs != null)
        {
            prefs.ShowHouseholdPage = true;
            await userPreferencesRepository.CreateOrUpdate(prefs, cancellationToken);
        }
    }
}
