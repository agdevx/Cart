// ABOUTME: Service interface for household business logic.
// ABOUTME: Provides methods for household operations with user authorization.

using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public interface IHouseholdService
{
    Task<Household> CreateHouseholdAsync(Guid userId, string name);
    Task<IEnumerable<Household>> GetUserHouseholdsAsync(Guid userId);
    Task<Household?> GetByIdAsync(Guid userId, Guid householdId);
    Task<Household> UpdateHouseholdAsync(Guid userId, Guid householdId, string name);
    Task DeleteHouseholdAsync(Guid userId, Guid householdId);
}
