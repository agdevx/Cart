// ABOUTME: This file defines the AddCollaboratorRequest DTO used for adding collaborators to trips.
// ABOUTME: Contains UserId property to specify the user being added as a collaborator.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class AddCollaboratorRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? UserId { get; set; }
}
