// ABOUTME: Represents a discrete shopping session or trip
// ABOUTME: Tracks items to purchase, collaborators, and completion status
namespace AGDevX.Cart.Shared.Models;

public class Trip : BaseEntity
{
    //== Name of the trip (e.g., "Weekly Grocery Run")
    public required string Name { get; set; }

    //== Optional household this trip belongs to
    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    //== User who created this trip
    public required Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    //== Whether the trip has been completed
    public bool IsCompleted { get; set; }

    //== When the trip was marked as completed
    public DateTime? CompletedAt { get; set; }

    //== Users who can collaborate on this trip
    public ICollection<TripCollaborator> Collaborators { get; set; } = [];

    //== Items to purchase on this trip
    public ICollection<TripItem> Items { get; set; } = [];
}
