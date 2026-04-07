// ABOUTME: Response DTO for the inventory import endpoint
// ABOUTME: Reports how many items were imported and how many were skipped by category

namespace AGDevX.Cart.Shared.DTOs;

public class ImportInventoryResult
{
    public int PersonalItemsImported { get; set; }
    public int HouseholdItemsImported { get; set; }
    public int DuplicatesSkipped { get; set; }
    public int HouseholdItemsSkipped { get; set; }
    public int InvalidRowsSkipped { get; set; }
}
