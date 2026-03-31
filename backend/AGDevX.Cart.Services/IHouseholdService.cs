// ABOUTME: Service interface for household business logic
// ABOUTME: Single-household model with equal co-ownership and auto-swap on join/create
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHousehold(Guid userId, string name, CancellationToken cancellationToken = default);
    Task<Household?> GetUserHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<Household?> GetById(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> UpdateHousehold(Guid userId, Guid householdId, string name, CancellationToken cancellationToken = default);
    Task DeleteHousehold(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task<Household> JoinHousehold(Guid userId, string inviteCode, CancellationToken cancellationToken = default);
    Task LeaveHousehold(Guid userId, CancellationToken cancellationToken = default);
    Task<SwapStatusResponse> GetSwapStatus(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HouseholdMemberResponse>> GetMembers(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
    Task RemoveMember(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task PromoteToOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task DemoteOwner(Guid requestingUserId, Guid householdId, Guid targetUserId, CancellationToken cancellationToken = default);
    Task<string> RegenerateInviteCode(Guid requestingUserId, Guid householdId, CancellationToken cancellationToken = default);
    Task<string> GetInviteCode(Guid userId, Guid householdId, CancellationToken cancellationToken = default);
}
