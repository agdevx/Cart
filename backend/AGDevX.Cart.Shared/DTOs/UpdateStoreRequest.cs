// ABOUTME: DTO for updating an existing store.
// ABOUTME: Contains Name and optional HouseholdId for scope changes.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateStoreRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Null means personal store
    public Guid? HouseholdId { get; set; }
}
