// ABOUTME: DTO for returning user preferences data from the API.

namespace AGDevX.Cart.Shared.DTOs;

public class UserPreferencesResponse
{
    public string? DefaultPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }

    public bool ShowWeatherIcons { get; set; } = true;

    public bool ShowWeatherTemps { get; set; } = true;
}
