// ABOUTME: Service interface for household business logic.
// ABOUTME: Provides methods for household operations with user authorization.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHousehold(Guid userId, string name);
    Task<IEnumerable<Household>> GetUserHouseholds(Guid userId);
    Task<Household?> GetById(Guid userId, Guid householdId);
    Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name);
    Task DeleteHousehold(Guid userId, Guid householdId);
    Task<Household> JoinHousehold(Guid userId, string inviteCode);
    Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId);
    Task TransferOwnership(Guid requestingUserId, Guid householdId, Guid newOwnerUserId);
    Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId);
    Task<IEnumerable<HouseholdMember>> GetMembers(Guid userId, Guid householdId);
    Task<string> GetInviteCode(Guid userId, Guid householdId);
}
