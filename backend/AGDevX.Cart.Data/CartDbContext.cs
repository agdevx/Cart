// ABOUTME: EF Core DbContext for the Cart application with entity configurations.
// ABOUTME: Configures all database entities, relationships, composite keys, and constraints.

using System.Security.Claims;
using AGDevX.Cart.Data.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data;

public class CartDbContext(DbContextOptions<CartDbContext> options, IHttpContextAccessor? httpContextAccessor = null) : DbContext(options)
{
    //== DbSets for all entities
    public DbSet<User> Users { get; set; }
    public DbSet<Household> Households { get; set; }
    public DbSet<Store> Stores { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<Trip> Trips { get; set; }
    public DbSet<TripItem> TripItems { get; set; }
    public DbSet<UserPreferences> UserPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //== Configure User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Name).HasMaxLength(64);
            entity.Property(u => u.Email).HasMaxLength(254);
            entity.Property(u => u.PasswordHash).HasMaxLength(256);
            entity.HasIndex(u => u.HouseholdId);

            entity.HasOne(u => u.Household)
                  .WithMany()
                  .HasForeignKey(u => u.HouseholdId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        //== Configure Household
        modelBuilder.Entity<Household>(entity =>
        {
            entity.Property(h => h.Name).IsRequired().HasMaxLength(100);
            entity.Property(h => h.InviteCode).HasMaxLength(8);
            entity.HasIndex(h => h.InviteCode).IsUnique();
            entity.HasIndex(h => h.Owner1UserId);
            entity.HasIndex(h => h.Owner2UserId);

            entity.HasOne(h => h.Owner1User)
                  .WithMany()
                  .HasForeignKey(h => h.Owner1UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(h => h.Owner2User)
                  .WithMany()
                  .HasForeignKey(h => h.Owner2UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        //== Configure Trip
        modelBuilder.Entity<Trip>(entity =>
        {
            entity.HasIndex(t => t.HouseholdId);
            entity.HasIndex(t => t.CreatedBy);

            entity.HasOne(t => t.Household)
                  .WithMany()
                  .HasForeignKey(t => t.HouseholdId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        //== InventoryItem FK behaviors
        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.HasIndex(i => i.HouseholdId);
            entity.HasIndex(i => i.OwnerUserId);

            //== Cascade delete inventory items when household is deleted
            entity.HasOne(i => i.Household)
                  .WithMany()
                  .HasForeignKey(i => i.HouseholdId)
                  .OnDelete(DeleteBehavior.Cascade);

            //== SET NULL on DefaultStore delete so items survive store removal
            entity.HasOne(i => i.DefaultStore)
                  .WithMany()
                  .HasForeignKey(i => i.DefaultStoreId)
                  .OnDelete(DeleteBehavior.SetNull);

            //== Restrict delete on OwnerUser — user deletion is blocked
            entity.HasOne(i => i.OwnerUser)
                  .WithMany()
                  .HasForeignKey(i => i.OwnerUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        //== TripItem FK behaviors
        modelBuilder.Entity<TripItem>(entity =>
        {
            entity.HasIndex(ti => ti.TripId);
            entity.HasIndex(ti => ti.InventoryItemId);
            entity.HasIndex(ti => ti.StoreId);

            //== Cascade delete trip items when their trip is deleted
            entity.HasOne(ti => ti.Trip)
                  .WithMany(t => t.Items)
                  .HasForeignKey(ti => ti.TripId)
                  .OnDelete(DeleteBehavior.Cascade);

            //== SET NULL on InventoryItem delete so trip items survive pantry cleanup
            entity.HasOne(ti => ti.InventoryItem)
                  .WithMany()
                  .HasForeignKey(ti => ti.InventoryItemId)
                  .OnDelete(DeleteBehavior.SetNull);

            //== SET NULL on Store delete so trip items survive store removal
            entity.HasOne(ti => ti.Store)
                  .WithMany()
                  .HasForeignKey(ti => ti.StoreId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        //== Store FK behaviors
        modelBuilder.Entity<Store>(entity =>
        {
            entity.HasIndex(s => s.HouseholdId);
            entity.HasIndex(s => s.UserId);
            entity.HasIndex(s => new { s.Name, s.HouseholdId });
            entity.HasIndex(s => new { s.Name, s.UserId });

            //== Cascade delete stores when household is deleted
            entity.HasOne(s => s.Household)
                  .WithMany()
                  .HasForeignKey(s => s.HouseholdId)
                  .OnDelete(DeleteBehavior.Cascade);

            //== Restrict delete on User — user deletion is blocked
            entity.HasOne(s => s.User)
                  .WithMany()
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        //== UserPreferences: one-to-one with User, cascade delete
        modelBuilder.Entity<UserPreferences>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.HasOne(e => e.User)
                  .WithOne()
                  .HasForeignKey<UserPreferences>(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    //== Automatically populate audit fields on BaseEntity entries
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var userIdClaim = httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                /*
                 * For self-referencing entities (e.g., User registration), CreatedBy may already
                 * be set to the entity's own Id before SaveChanges. Only overwrite if it's empty.
                 */
                if (entry.Entity.CreatedBy == Guid.Empty && userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedUserId))
                {
                    entry.Entity.CreatedBy = parsedUserId;
                    entry.Entity.ModifiedBy = parsedUserId;
                }

                entry.Entity.CreatedDate = now;
                entry.Entity.ModifiedDate = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedModifiedBy))
                {
                    entry.Entity.ModifiedBy = parsedModifiedBy;
                }

                entry.Entity.ModifiedDate = now;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
