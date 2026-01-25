// ABOUTME: Join table entity representing a user's membership in a household
// ABOUTME: Contains foreign keys and role information for the many-to-many relationship
namespace AGDevX.Cart.Shared.Models;

public class HouseholdMember : BaseEntity
{
    public int HouseholdId { get; set; }
    public Household? Household { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    public DateTime JoinedAt { get; set; }

    //== Member role within the household (e.g., "member", "admin")
    public string Role { get; set; } = "member";
}
