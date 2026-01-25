// ABOUTME: Request DTO for refresh token endpoint
// ABOUTME: Contains the refresh token to be validated and exchanged for new access/refresh tokens

namespace AGDevX.Cart.Shared.DTOs;

public class RefreshTokenRequest
{
    public required string RefreshToken { get; set; }
}
