// ABOUTME: Repository implementation for UserPreferences with upsert logic.
// ABOUTME: Creates a new record if none exists for the user, otherwise updates the existing one.

using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class UserPreferencesRepository(CartDbContext context) : IUserPreferencesRepository
{
    public async Task<UserPreferences?> GetByUserId(Guid userId, CancellationToken cancellationToken = default)
    {
        return await context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
    }

    public async Task<UserPreferences> CreateOrUpdate(UserPreferences preferences, CancellationToken cancellationToken = default)
    {
        var existing = await GetByUserId(preferences.UserId, cancellationToken);

        if (existing is null)
        {
            context.UserPreferences.Add(preferences);
        }
        else
        {
            existing.DefaultPage = preferences.DefaultPage;
            existing.LocationLatitude = preferences.LocationLatitude;
            existing.LocationLongitude = preferences.LocationLongitude;
            existing.LocationDisplayName = preferences.LocationDisplayName;
            existing.ShowWeatherIcons = preferences.ShowWeatherIcons;
            context.UserPreferences.Update(existing);
        }

        await context.SaveChangesAsync(cancellationToken);
        return existing ?? preferences;
    }
}
