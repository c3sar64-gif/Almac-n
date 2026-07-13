using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;
using Xunit;

namespace SistemaAlmacen.Tests;

public class MovimientoServiceTests
{
    private static (AppDbContext db, Producto p, Almacen a1, Almacen a2, Usuario u) Preparar()
    {
        var db = TestDb.Crear();
        var p = new Producto { Sku = "P-001", Nombre = "Tornillo" };
        var a1 = new Almacen { Nombre = "Central" };
        var a2 = new Almacen { Nombre = "Sucursal" };
        var u = new Usuario { Email = "op@test.com", Nombre = "Op", PasswordHash = "x" };
        db.AddRange(p, a1, a2, u);
        db.SaveChanges();
        return (db, p, a1, a2, u);
    }

    [Fact]
    public async Task Entrada_aumenta_el_stock()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        var ex = db.Existencias.Single(e => e.ProductoId == p.Id && e.AlmacenId == a1.Id);
        Assert.Equal(10, ex.Cantidad);
    }
}
