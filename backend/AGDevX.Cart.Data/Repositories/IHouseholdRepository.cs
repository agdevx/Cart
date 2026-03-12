// ABOUTME: Repository interface for household data access operations.
// ABOUTME: Provides methods for CRUD operations and membership verification.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default);
    Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default);
    Task<IEnumerable<Household>> GetUserHouseholds(Guid userId, CancellationToken cancellationToken = default);
    Task<Household> Create(Household household, CancellationToken cancellationToken = default);
    Task<Household> Update(Household household, CancellationToken cancellationToken = default);
    Task Delete(Guid householdId, CancellationToken cancellationToken = default);
    Task<bool> IsUserMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task AddMember(HouseholdMember member, CancellationToken cancellationToken = default);
    Task RemoveMember(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
    Task UpdateMemberRole(Guid householdId, Guid userId, string role, CancellationToken cancellationToken = default);
}
