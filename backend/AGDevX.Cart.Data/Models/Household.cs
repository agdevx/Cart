// ABOUTME: Household entity representing a shared shopping group
// ABOUTME: Supports two equal co-owners via Owner1UserId and Owner2UserId
namespace AGDevX.Cart.Data.Models;

public class Household : BaseEntity
{
    public required string Name { get; set; }
    public string InviteCode { get; set; } = string.Empty;

    //== Primary owner — required, always populated
    public Guid Owner1UserId { get; set; }
    public User? Owner1User { get; set; }

    //== Secondary owner — optional, equal permissions to Owner1
    public Guid? Owner2UserId { get; set; }
    public User? Owner2User { get; set; }
}
