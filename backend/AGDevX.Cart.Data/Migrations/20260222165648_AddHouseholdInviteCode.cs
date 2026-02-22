using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdInviteCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "Households",
                type: "TEXT",
                maxLength: 8,
                nullable: false,
                defaultValue: "");

            //== Backfill existing households with unique random 6-char codes
            migrationBuilder.Sql(
                "UPDATE Households SET InviteCode = UPPER(SUBSTR(HEX(RANDOMBLOB(3)), 1, 6)) WHERE InviteCode = ''");

            migrationBuilder.CreateIndex(
                name: "IX_Households_InviteCode",
                table: "Households",
                column: "InviteCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Households_InviteCode",
                table: "Households");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "Households");
        }
    }
}
