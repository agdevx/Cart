// ABOUTME: Response DTO for household member list endpoint
// ABOUTME: Returns user details with ownership status

namespace AGDevX.Cart.Shared.DTOs;

public class HouseholdMemberResponse
{
    public Guid UserId { get; set; }
    public string? Name { get; set; }
    public bool IsOwner { get; set; }
}
