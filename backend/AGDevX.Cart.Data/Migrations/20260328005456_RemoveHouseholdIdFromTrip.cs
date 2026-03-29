using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveHouseholdIdFromTrip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trips_Households_HouseholdId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_HouseholdId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Trips");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Trips",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trips_HouseholdId",
                table: "Trips",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_Households_HouseholdId",
                table: "Trips",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id");
        }
    }
}
