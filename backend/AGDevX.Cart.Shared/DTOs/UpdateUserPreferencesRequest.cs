// ABOUTME: DTO for updating user preferences via the API. All fields are optional to support partial updates.

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateUserPreferencesRequest
{
    public string? DefaultPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }
}
