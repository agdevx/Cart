// ABOUTME: DTO for demoting a household owner to regular member

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class DemoteOwnerRequest
{
    [Required]
    public Guid? UserId { get; set; }
}
