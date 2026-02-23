// ABOUTME: Repository interface for household data access operations.
// ABOUTME: Provides methods for CRUD operations and membership verification.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetById(Guid householdId);
    Task<Household?> GetByInviteCode(string inviteCode);
    Task<IEnumerable<Household>> GetUserHouseholds(Guid userId);
    Task<Household> Create(Household household);
    Task<Household> Update(Household household);
    Task Delete(Guid householdId);
    Task<bool> IsUserMember(Guid householdId, Guid userId);
    Task AddMember(HouseholdMember member);
    Task RemoveMember(Guid householdId, Guid userId);
    Task UpdateMemberRole(Guid householdId, Guid userId, string role);
}
