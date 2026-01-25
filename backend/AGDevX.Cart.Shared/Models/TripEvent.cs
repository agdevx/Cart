// ABOUTME: Event model for trip-related real-time updates
// ABOUTME: Used for broadcasting changes via SSE

namespace AGDevX.Cart.Shared.Models;

public class TripEvent
{
    public Guid TripId { get; set; }
    public string EventType { get; set; } = string.Empty; //== ItemAdded, ItemUpdated, ItemChecked, ItemRemoved
    public Guid? TripItemId { get; set; }
    public string Data { get; set; } = string.Empty; //== JSON serialized event data
    public DateTime Timestamp { get; set; }
}
