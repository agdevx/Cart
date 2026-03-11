// ABOUTME: DTO for updating trip properties
// ABOUTME: Supports renaming trips and changing scope (personal/household)
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    // Intentionally optional — null means personal trip
    public Guid? HouseholdId { get; set; }
}
