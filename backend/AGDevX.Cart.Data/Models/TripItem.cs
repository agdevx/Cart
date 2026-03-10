// ABOUTME: Links inventory items to specific trips with shopping details
// ABOUTME: Tracks quantity, store preference, notes, and checked status for each item
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
}
