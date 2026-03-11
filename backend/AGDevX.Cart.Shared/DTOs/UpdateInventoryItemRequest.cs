// ABOUTME: DTO for updating an existing inventory item.
// ABOUTME: Contains fields that the client can modify on an inventory item.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateInventoryItemRequest
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
