// ABOUTME: Represents a discrete shopping session or trip
// ABOUTME: Tracks items to purchase, collaborators, and completion status
namespace AGDevX.Cart.Data.Models;

public class Trip : BaseEntity
{
    //== Name of the trip (e.g., "Weekly Grocery Run")
    public required string Name { get; set; }

    //== Whether the trip has been completed
    public bool IsCompleted { get; set; }

    //== When the trip was marked as completed
    public DateTime? CompletedAt { get; set; }

    //== Whether the trip has been started (moved from planning to active)
    public bool IsStarted { get; set; }

    //== When the trip was started
    public DateTime? StartedAt { get; set; }

    //== Users who can collaborate on this trip
    public ICollection<TripCollaborator> Collaborators { get; set; } = [];

    //== Items to purchase on this trip
    public ICollection<TripItem> Items { get; set; } = [];
}
