// ABOUTME: Base class for all database entities with common audit fields
// ABOUTME: Provides Id, CreatedBy, CreatedDate, ModifiedBy, and ModifiedDate properties
namespace AGDevX.Cart.Data.Models;

public abstract class BaseEntity
{
    public Guid Id { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public Guid ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
