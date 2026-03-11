// ABOUTME: DTO for updating an existing household.
// ABOUTME: Contains Name for renaming the household.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateHouseholdRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
