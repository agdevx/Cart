using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class DenormalizeTripItemAndSetNullFKs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Stores_DefaultStoreId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TripItems_InventoryItems_InventoryItemId",
                table: "TripItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TripItems_Stores_StoreId",
                table: "TripItems");

            migrationBuilder.AlterColumn<Guid>(
                name: "InventoryItemId",
                table: "TripItems",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AddColumn<string>(
                name: "ItemName",
                table: "TripItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StoreName",
                table: "TripItems",
                type: "TEXT",
                nullable: true);

            //== Populate denormalized ItemName from related InventoryItems
            migrationBuilder.Sql(
                @"UPDATE TripItems SET ItemName = (
                    SELECT Name FROM InventoryItems WHERE InventoryItems.Id = TripItems.InventoryItemId
                  ) WHERE InventoryItemId IS NOT NULL");

            //== Populate denormalized StoreName from related Stores
            migrationBuilder.Sql(
                @"UPDATE TripItems SET StoreName = (
                    SELECT Name FROM Stores WHERE Stores.Id = TripItems.StoreId
                  ) WHERE StoreId IS NOT NULL");

            //== Handle any TripItems with orphaned InventoryItemId
            migrationBuilder.Sql(
                @"UPDATE TripItems SET ItemName = 'Unknown Item' WHERE ItemName = '' OR ItemName IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Stores_DefaultStoreId",
                table: "InventoryItems",
                column: "DefaultStoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TripItems_InventoryItems_InventoryItemId",
                table: "TripItems",
                column: "InventoryItemId",
                principalTable: "InventoryItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TripItems_Stores_StoreId",
                table: "TripItems",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Stores_DefaultStoreId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TripItems_InventoryItems_InventoryItemId",
                table: "TripItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TripItems_Stores_StoreId",
                table: "TripItems");

            migrationBuilder.DropColumn(
                name: "ItemName",
                table: "TripItems");

            migrationBuilder.DropColumn(
                name: "StoreName",
                table: "TripItems");

            migrationBuilder.AlterColumn<Guid>(
                name: "InventoryItemId",
                table: "TripItems",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Stores_DefaultStoreId",
                table: "InventoryItems",
                column: "DefaultStoreId",
                principalTable: "Stores",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TripItems_InventoryItems_InventoryItemId",
                table: "TripItems",
                column: "InventoryItemId",
                principalTable: "InventoryItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TripItems_Stores_StoreId",
                table: "TripItems",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id");
        }
    }
}
