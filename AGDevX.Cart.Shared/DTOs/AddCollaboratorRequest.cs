// ABOUTME: This file defines the AddCollaboratorRequest DTO used for adding collaborators to trips.
// ABOUTME: Contains UserId property to specify the user being added as a collaborator.
namespace AGDevX.Cart.Shared.DTOs;

public class AddCollaboratorRequest
{
    public Guid UserId { get; set; }
}
