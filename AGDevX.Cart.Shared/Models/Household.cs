// ABOUTME: Household entity representing a shared shopping group
// ABOUTME: Contains household details and navigation to member relationships
namespace AGDevX.Cart.Shared.Models;

public class Household : BaseEntity
{
    public string? Name { get; set; }

    //== Navigation property to members who belong to this household
    public ICollection<HouseholdMember> Members { get; set; } = [];
}
