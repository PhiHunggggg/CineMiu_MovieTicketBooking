using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddCinemaOperatingHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "closing_time",
                table: "cinemas",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(23, 30, 0));

            migrationBuilder.AddColumn<TimeSpan>(
                name: "opening_time",
                table: "cinemas",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(8, 0, 0));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "closing_time",
                table: "cinemas");

            migrationBuilder.DropColumn(
                name: "opening_time",
                table: "cinemas");
        }
    }
}
