// ABOUTME: This file defines the CreateTripRequest DTO used for creating new trips.
// ABOUTME: Contains Name and optional HouseholdId properties for trip creation operations.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    // Intentionally optional — null means personal trip
    public Guid? HouseholdId { get; set; }
}
