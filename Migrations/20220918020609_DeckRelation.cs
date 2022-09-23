using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeckScribe.Migrations
{
    public partial class DeckRelation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Users_UserId",
                table: "Products");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Products",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_UserId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Products");

            migrationBuilder.RenameTable(
                name: "Products",
                newName: "Decks");

            migrationBuilder.AddColumn<string>(
                name: "DeckCode",
                table: "Decks",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Decks",
                table: "Decks",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "DeckUser",
                columns: table => new
                {
                    DecksId = table.Column<int>(type: "integer", nullable: false),
                    UsersId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeckUser", x => new { x.DecksId, x.UsersId });
                    table.ForeignKey(
                        name: "FK_DeckUser_Decks_DecksId",
                        column: x => x.DecksId,
                        principalTable: "Decks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeckUser_Users_UsersId",
                        column: x => x.UsersId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeckUser_UsersId",
                table: "DeckUser",
                column: "UsersId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeckUser");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Decks",
                table: "Decks");

            migrationBuilder.DropColumn(
                name: "DeckCode",
                table: "Decks");

            migrationBuilder.RenameTable(
                name: "Decks",
                newName: "Products");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Products",
                type: "integer",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Products",
                table: "Products",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Products_UserId",
                table: "Products",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Users_UserId",
                table: "Products",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
