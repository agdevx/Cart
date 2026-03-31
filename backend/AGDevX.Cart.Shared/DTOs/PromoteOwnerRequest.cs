// ABOUTME: DTO for promoting a household member to owner

using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class PromoteOwnerRequest
{
    [Required]
    public Guid? UserId { get; set; }
}
