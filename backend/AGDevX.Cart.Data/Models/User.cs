// ABOUTME: User entity representing an authenticated user account
// ABOUTME: Contains authentication details and navigation to household memberships
namespace AGDevX.Cart.Data.Models;

public class User : BaseEntity
{
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? DisplayName { get; set; }

    //== Navigation property to household memberships this user belongs to
    public ICollection<HouseholdMember> HouseholdMemberships { get; set; } = [];
}
