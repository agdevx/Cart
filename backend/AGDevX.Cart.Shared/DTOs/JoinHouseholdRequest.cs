// ABOUTME: DTO for joining a household via invite code.
// ABOUTME: Contains InviteCode for household membership.
using System.ComponentModel.DataAnnotations;

namespace AGDevX.Cart.Shared.DTOs;

public class JoinHouseholdRequest
{
    [Required]
    [MaxLength(8)]
    public string InviteCode { get; set; } = string.Empty;
}
