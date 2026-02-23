// ABOUTME: InventoryItem model representing household-shared or user-private items
// ABOUTME: Household items are visible to all household members, user items are private to owner
namespace AGDevX.Cart.Data.Models;

public class InventoryItem : BaseEntity
{
    public required string Name { get; set; }

    //== Optional default store where this item is typically found
    public Guid? DefaultStoreId { get; set; }
    public Store? DefaultStore { get; set; }

    public string? Notes { get; set; }

    //== User-scoped item (private to owner)
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    //== Household-scoped item (shared across household)
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
