// ABOUTME: DTO for creating a new store.
// ABOUTME: Contains Name and optional HouseholdId for personal or household scope.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateStoreRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Null means personal store
    public Guid? HouseholdId { get; set; }
}
