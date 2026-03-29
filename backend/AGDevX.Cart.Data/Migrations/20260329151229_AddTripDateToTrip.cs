using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripDateToTrip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "TripDate",
                table: "Trips",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE Trips
                SET TripDate = date(CompletedAt)
                WHERE IsCompleted = 1 AND CompletedAt IS NOT NULL;

                UPDATE Trips
                SET TripDate = date(CreatedDate)
                WHERE TripDate IS NULL AND CreatedDate IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TripDate",
                table: "Trips");
        }
    }
}
