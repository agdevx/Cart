// ABOUTME: Service implementation for user preferences — maps between DTOs and data models.
// ABOUTME: Returns an empty-but-valid response when no preferences record exists yet (first-time users).

using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public class UserPreferencesService(IUserPreferencesRepository repository) : IUserPreferencesService
{
    public async Task<UserPreferencesResponse> GetPreferences(Guid userId, CancellationToken cancellationToken = default)
    {
        var prefs = await repository.GetByUserId(userId, cancellationToken);

        return new UserPreferencesResponse
        {
            DefaultPage = prefs?.DefaultPage,
            ShowHouseholdPage = prefs?.ShowHouseholdPage ?? true,
            LocationLatitude = prefs?.LocationLatitude,
            LocationLongitude = prefs?.LocationLongitude,
            LocationDisplayName = prefs?.LocationDisplayName,
            ShowWeatherIcons = prefs?.ShowWeatherIcons ?? true,
            ShowWeatherTemps = prefs?.ShowWeatherTemps ?? true,
        };
    }

    public async Task<UserPreferencesResponse> UpdatePreferences(Guid userId, UpdateUserPreferencesRequest request, CancellationToken cancellationToken = default)
    {
        var prefs = new UserPreferences
        {
            UserId = userId,
            DefaultPage = request.DefaultPage,
            ShowHouseholdPage = request.ShowHouseholdPage ?? true,
            LocationLatitude = request.LocationLatitude,
            LocationLongitude = request.LocationLongitude,
            LocationDisplayName = request.LocationDisplayName,
            ShowWeatherIcons = request.ShowWeatherIcons ?? true,
            ShowWeatherTemps = request.ShowWeatherTemps ?? true,
        };

        var saved = await repository.CreateOrUpdate(prefs, cancellationToken);

        return new UserPreferencesResponse
        {
            DefaultPage = saved.DefaultPage,
            ShowHouseholdPage = saved.ShowHouseholdPage,
            LocationLatitude = saved.LocationLatitude,
            LocationLongitude = saved.LocationLongitude,
            LocationDisplayName = saved.LocationDisplayName,
            ShowWeatherIcons = saved.ShowWeatherIcons,
            ShowWeatherTemps = saved.ShowWeatherTemps,
        };
    }
}
