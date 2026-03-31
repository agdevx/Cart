// ABOUTME: DTO for creating new trips with optional household scope
// ABOUTME: HouseholdId null = personal trip, set = household-scoped trip
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public DateOnly? TripDate { get; set; }

    //== Null for personal trips, set for household-scoped trips
    public Guid? HouseholdId { get; set; }
}
