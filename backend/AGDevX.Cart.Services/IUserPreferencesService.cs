// ABOUTME: Service interface for user preferences business logic.

using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public interface IUserPreferencesService
{
    Task<UserPreferencesResponse> GetPreferences(Guid userId, CancellationToken cancellationToken = default);

    Task<UserPreferencesResponse> UpdatePreferences(Guid userId, UpdateUserPreferencesRequest request, CancellationToken cancellationToken = default);
}
