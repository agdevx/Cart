// ABOUTME: Store model representing either household-scoped or user-scoped stores
// ABOUTME: Household stores are shared across household, user stores are private to individual users
namespace AGDevX.Cart.Data.Models;

public class Store : BaseEntity
{
    public required string Name { get; set; }

    //== Household-scoped store (shared across household)
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    //== User-scoped store (personal to individual user)
    public Guid? UserId { get; set; }
    public User? User { get; set; }
}
