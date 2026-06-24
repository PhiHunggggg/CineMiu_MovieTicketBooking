using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repository.Migrations
{
    public partial class AddSeatOperationalStatus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "seats",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "available");

            migrationBuilder.Sql("""
                UPDATE seats
                SET status = CASE
                    WHEN is_active = 1 THEN 'available'
                    ELSE 'maintenance'
                END
                WHERE status IS NULL OR status = '' OR is_active = 0;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "status",
                table: "seats");
        }
    }
}
