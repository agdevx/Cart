// ABOUTME: Entity model for per-user preferences including default landing page and location data.
// ABOUTME: Has a one-to-one relationship with User (cascade delete, unique index on UserId).

namespace AGDevX.Cart.Data.Models;

public class UserPreferences : BaseEntity
{
    public Guid UserId { get; set; }

    public string? DefaultPage { get; set; }

    //== Controls whether the Household tab appears in the bottom nav
    public bool ShowHouseholdPage { get; set; } = true;

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }

    public bool ShowWeatherIcons { get; set; } = true;

    public bool ShowWeatherTemps { get; set; } = true;

    public User User { get; set; } = null!;
}
