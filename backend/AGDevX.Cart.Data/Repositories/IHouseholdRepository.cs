// ABOUTME: Repository interface for household data access operations.
// ABOUTME: Provides methods for CRUD operations and membership verification.

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetByIdAsync(Guid householdId);
    Task<Household?> GetByInviteCode(string inviteCode);
    Task<IEnumerable<Household>> GetUserHouseholdsAsync(Guid userId);
    Task<Household> CreateAsync(Household household);
    Task<Household> UpdateAsync(Household household);
    Task DeleteAsync(Guid householdId);
    Task<bool> IsUserMemberAsync(Guid householdId, Guid userId);
    Task AddMember(HouseholdMember member);
    Task RemoveMember(Guid householdId, Guid userId);
    Task UpdateMemberRole(Guid householdId, Guid userId, string role);
}
