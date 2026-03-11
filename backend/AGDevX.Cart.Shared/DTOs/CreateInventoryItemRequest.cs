// ABOUTME: DTO for creating a new inventory item.
// ABOUTME: Contains Name and optional HouseholdId for personal or household scope.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class CreateInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Null means personal item
    public Guid? HouseholdId { get; set; }

    public Guid? DefaultStoreId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
