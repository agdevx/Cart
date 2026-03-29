// ABOUTME: DTO for updating trip properties
// ABOUTME: Supports renaming trips and setting the trip date
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public DateOnly? TripDate { get; set; }
}
