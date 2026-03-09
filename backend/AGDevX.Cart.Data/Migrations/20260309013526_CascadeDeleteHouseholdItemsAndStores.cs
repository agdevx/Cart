using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteHouseholdItemsAndStores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Stores_Households_HouseholdId",
                table: "Stores");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Stores_Households_HouseholdId",
                table: "Stores",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Stores_Households_HouseholdId",
                table: "Stores");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Stores_Households_HouseholdId",
                table: "Stores",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id");
        }
    }
}
