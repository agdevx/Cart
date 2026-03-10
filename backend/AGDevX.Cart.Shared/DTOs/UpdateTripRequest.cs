// ABOUTME: DTO for updating trip properties
// ABOUTME: Supports renaming trips and changing scope (personal/household)

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid? HouseholdId { get; set; }
}
