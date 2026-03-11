// ABOUTME: DTO for creating a new household.
// ABOUTME: Contains Name for the household.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateHouseholdRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
