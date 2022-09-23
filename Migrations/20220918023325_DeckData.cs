using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeckScribe.Migrations
{
    public partial class DeckData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeckData",
                table: "Decks",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeckData",
                table: "Decks");
        }
    }
}
