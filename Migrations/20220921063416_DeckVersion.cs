using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeckScribe.Migrations
{
    public partial class DeckVersion : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Version",
                table: "Decks",
                type: "text",
                nullable: false,
                defaultValue: "1");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Version",
                table: "Decks");
        }
    }
}
