// ABOUTME: EF Core DbContext for the Cart application with entity configurations.
// ABOUTME: Configures all database entities, relationships, composite keys, and constraints.

using AGDevX.Cart.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data;

public class CartDbContext(DbContextOptions<CartDbContext> options) : DbContext(options)
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
            entity.HasIndex(u => u.Email)
                .IsUnique();
        });
    }
}
