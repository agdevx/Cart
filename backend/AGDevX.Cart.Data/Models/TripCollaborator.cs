// ABOUTME: Join table linking trips to users for collaboration
// ABOUTME: Enables many-to-many relationship between Trip and ApplicationUser
namespace AGDevX.Cart.Data.Models;

public class TripCollaborator : BaseEntity
{
    //== Trip being collaborated on
    public required Guid TripId { get; set; }
    public required Trip Trip { get; set; }

    //== User who is a collaborator
    public required Guid UserId { get; set; }
    public required User User { get; set; }
}
