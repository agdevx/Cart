// ABOUTME: User entity representing an authenticated user account
// ABOUTME: Contains authentication details and nullable household membership FK
using System.Text.Json.Serialization;

namespace AGDevX.Cart.Data.Models;

public class User : BaseEntity
{
    public string? Email { get; set; }

    [JsonIgnore]
    public string? PasswordHash { get; set; }
    public string? Name { get; set; }

    //== Household this user belongs to (null = solo user, no household)
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
