// ABOUTME: Repository interface for household data access operations
// ABOUTME: Single-household model — membership is via User.HouseholdId, not a join table
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IHouseholdRepository
{
    Task<Household?> GetById(Guid householdId, CancellationToken cancellationToken = default);
    Task<Household?> GetByInviteCode(string inviteCode, CancellationToken cancellationToken = default);
    Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetMembers(Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> Create(Household household, CancellationToken cancellationToken = default);
    Task<Household> Update(Household household, CancellationToken cancellationToken = default);
    Task Delete(Guid householdId, CancellationToken cancellationToken = default);
    Task<bool> IsUserOwner(Guid householdId, Guid userId, CancellationToken cancellationToken = default);
}
