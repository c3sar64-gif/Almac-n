using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaAlmacen.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CheckCantidadNoNegativa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "ck_existencias_cantidad_no_negativa",
                table: "Existencias",
                sql: "\"Cantidad\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_existencias_cantidad_no_negativa",
                table: "Existencias");
        }
    }
}
