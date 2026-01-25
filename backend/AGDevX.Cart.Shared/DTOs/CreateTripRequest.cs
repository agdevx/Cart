// ABOUTME: This file defines the CreateTripRequest DTO used for creating new trips.
// ABOUTME: Contains Name and optional HouseholdId properties for trip creation operations.
namespace AGDevX.Cart.Shared.DTOs;

public class CreateTripRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid? HouseholdId { get; set; }
}
