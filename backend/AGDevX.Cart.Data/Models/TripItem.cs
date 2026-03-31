// ABOUTME: Links inventory items to specific trips with shopping details
// ABOUTME: Tracks quantity, store preference, notes, checked status, and scope snapshot
namespace AGDevX.Cart.Data.Models;

public class TripItem : BaseEntity
{
    //== Trip this item belongs to
    public required Guid TripId { get; set; }
    public Trip? Trip { get; set; }

    //== Inventory item being purchased (nullable for SET NULL on delete)
    public Guid? InventoryItemId { get; set; }
    public InventoryItem? InventoryItem { get; set; }

    //== Denormalized item name from InventoryItem for display after deletion
    public required string ItemName { get; set; }

    //== Denormalized store name from Store for display after deletion
    public string? StoreName { get; set; }

    //== Quantity to purchase
    public int Quantity { get; set; }

    //== Optional preferred store for this item
    public Guid? StoreId { get; set; }
    public Store? Store { get; set; }

    //== Additional notes or details for this item
    public string? Notes { get; set; }

    //== Whether this item has been checked off the list
    public bool IsChecked { get; set; }

    //== When the item was checked off
    public DateTime? CheckedAt { get; set; }

    //== Scope snapshot: true if the source InventoryItem was household-scoped when added.
    //== Used for visibility filtering on household trips — personal items are only
    //== visible to the user who added them (CreatedBy). This denormalization ensures
    //== correct visibility even if the source InventoryItem is later deleted.
    public bool IsHouseholdItem { get; set; }
}
