// ABOUTME: DTO for updating trip item details.
// ABOUTME: Contains quantity, notes, and optional store assignment.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class UpdateTripItemRequest
{
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid? StoreId { get; set; }
}
