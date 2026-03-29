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
    public DbSet<HouseholdMember> HouseholdMembers { get; set; }
    public DbSet<Store> Stores { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<Trip> Trips { get; set; }
    public DbSet<TripCollaborator> TripCollaborators { get; set; }
    public DbSet<TripItem> TripItems { get; set; }
    public DbSet<UserPreferences> UserPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //== Configure HouseholdMember composite key and relationships
        modelBuilder.Entity<HouseholdMember>(entity =>
        {
            entity.HasKey(hm => new { hm.HouseholdId, hm.UserId });

            entity.HasOne(hm => hm.Household)
                  .WithMany(h => h.Members)
                  .HasForeignKey(hm => hm.HouseholdId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(hm => hm.User)
                  .WithMany(u => u.HouseholdMemberships)
                  .HasForeignKey(hm => hm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        //== Configure TripCollaborator composite key and relationships
        modelBuilder.Entity<TripCollaborator>(entity =>
        {
            entity.HasKey(tc => new { tc.TripId, tc.UserId });

            entity.HasOne(tc => tc.Trip)
                  .WithMany(t => t.Collaborators)
                  .HasForeignKey(tc => tc.TripId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        //== Configure Household invite code
        modelBuilder.Entity<Household>(entity =>
        {
            entity.Property(h => h.InviteCode).HasMaxLength(8);
            entity.HasIndex(h => h.InviteCode).IsUnique();
        });

        //== Configure User unique index on Email
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Name).HasMaxLength(64);
            entity.Property(u => u.Email).HasMaxLength(254);
            entity.Property(u => u.PasswordHash).HasMaxLength(256);
        });

        //== InventoryItem FK behaviors
        modelBuilder.Entity<InventoryItem>(entity =>
        {
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
        });

        //== TripItem FK behaviors
        modelBuilder.Entity<TripItem>(entity =>
        {
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

        //== Cascade delete stores when household is deleted
        modelBuilder.Entity<Store>(entity =>
        {
            entity.HasOne(s => s.Household)
                  .WithMany()
                  .HasForeignKey(s => s.HouseholdId)
                  .OnDelete(DeleteBehavior.Cascade);
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
        var userId = httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? "System";
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedBy = userId;
                entry.Entity.CreatedDate = now;
                entry.Entity.ModifiedBy = userId;
                entry.Entity.ModifiedDate = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.ModifiedBy = userId;
                entry.Entity.ModifiedDate = now;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
