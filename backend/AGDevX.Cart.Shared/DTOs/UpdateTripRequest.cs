// ABOUTME: DTO for updating trip properties
// ABOUTME: Currently supports renaming trips via the Name field

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    public string Name { get; set; } = string.Empty;
}
