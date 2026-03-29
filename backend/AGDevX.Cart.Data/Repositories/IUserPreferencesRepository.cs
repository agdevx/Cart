// ABOUTME: Repository interface for UserPreferences data access with upsert support.

using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IUserPreferencesRepository
{
    Task<UserPreferences?> GetByUserId(Guid userId, CancellationToken cancellationToken = default);

    Task<UserPreferences> CreateOrUpdate(UserPreferences preferences, CancellationToken cancellationToken = default);
}
