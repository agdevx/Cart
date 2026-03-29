using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AGDevX.Cart.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShowWeatherTempsToUserPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowWeatherTemps",
                table: "UserPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowWeatherTemps",
                table: "UserPreferences");
        }
    }
}
