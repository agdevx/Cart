// ABOUTME: Response DTO for the household swap-status advisory endpoint
// ABOUTME: Tells the frontend which confirmation modal to show before join/create

namespace AGDevX.Cart.Shared.DTOs;

public class SwapStatusResponse
{
    //== Scenario types: "none", "regular-member", "has-co-owner", "sole-member", "ownership-transfer-required"
    public string Scenario { get; set; } = "none";
    public Guid? CurrentHouseholdId { get; set; }
    public string? CurrentHouseholdName { get; set; }
    public string? CoOwnerName { get; set; }
}
