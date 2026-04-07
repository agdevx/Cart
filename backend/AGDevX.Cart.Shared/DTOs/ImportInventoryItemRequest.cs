// ABOUTME: DTO for a single row in a CSV pantry import request
// ABOUTME: Represents one item to import with name, notes, default store name, and scope

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class ImportInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? DefaultStore { get; set; }

    [Required]
    public string Scope { get; set; } = string.Empty;
}
