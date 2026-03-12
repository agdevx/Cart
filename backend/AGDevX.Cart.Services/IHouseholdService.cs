// ABOUTME: Service interface for household business logic.
// ABOUTME: Provides methods for household operations with user authorization.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHousehold(Guid userId, string name, CancellationToken cancellationToken = default);
    Task<IEnumerable<Household>> GetUserHouseholds(Guid userId, CancellationToken cancellationToken = default);
    Task<Household?> GetById(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name, CancellationToken cancellationToken = default);
    Task DeleteHousehold(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> JoinHousehold(Guid userId, string inviteCode, CancellationToken cancellationToken = default);
    Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task TransferOwnership(Guid requestingUserId, Guid householdId, Guid newOwnerUserId, CancellationToken cancellationToken = default);
    Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HouseholdMember>> GetMembers(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<string> GetInviteCode(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
}
