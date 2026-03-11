// ABOUTME: DTO for adding an item to a trip.
// ABOUTME: TripId comes from the route; this contains item details.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class AddTripItemRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? InventoryItemId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid? StoreId { get; set; }
}
