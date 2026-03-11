// ABOUTME: DTO for transferring household ownership to another member.
// ABOUTME: Contains UserId of the new owner.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class TransferOwnershipRequest
{
    // Guid? with [Required] so model validation catches Guid.Empty / missing values
    [Required]
    public Guid? UserId { get; set; }
}
