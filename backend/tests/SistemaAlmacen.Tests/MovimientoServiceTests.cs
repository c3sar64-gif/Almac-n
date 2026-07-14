using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;
using Xunit;

namespace SistemaAlmacen.Tests;

// Nota: la garantía anti-sobregiro bajo concurrencia depende del aislamiento
// SERIALIZABLE + reintentos ante fallos de serialización (Postgres 40001).
// Ese escenario no es reproducible en estos tests mono-hilo sobre SQLite.
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

    [Fact]
    public async Task Salida_disminuye_el_stock()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await svc.RegistrarSalidaAsync(p.Id, a1.Id, 4, u.Id);

        var ex = db.Existencias.Single(e => e.ProductoId == p.Id && e.AlmacenId == a1.Id);
        Assert.Equal(6, ex.Cantidad);
    }

    [Fact]
    public async Task Salida_con_stock_insuficiente_lanza_error()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 3, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarSalidaAsync(p.Id, a1.Id, 5, u.Id));
    }

    [Fact]
    public async Task Transferencia_mueve_stock_entre_almacenes()
    {
        var (db, p, a1, a2, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a2.Id, 4, u.Id);

        Assert.Equal(6, db.Existencias.Single(e => e.AlmacenId == a1.Id).Cantidad);
        Assert.Equal(4, db.Existencias.Single(e => e.AlmacenId == a2.Id).Cantidad);
    }

    [Fact]
    public async Task Transferencia_sin_stock_no_cambia_nada()
    {
        var (db, p, a1, a2, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 2, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a2.Id, 5, u.Id));

        Assert.Equal(2, db.Existencias.Single(e => e.AlmacenId == a1.Id).Cantidad);
        Assert.False(db.Existencias.Any(e => e.AlmacenId == a2.Id));
        Assert.Equal(1, db.Movimientos.Count()); // solo la entrada inicial
    }

    [Fact]
    public async Task Transferencia_al_mismo_almacen_lanza_error()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a1.Id, 5, u.Id));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Cantidad_invalida_lanza_error(decimal cantidad)
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarEntradaAsync(p.Id, a1.Id, cantidad, u.Id));
    }

    [Fact]
    public async Task Salida_sin_existencia_previa_no_deja_existencia_fantasma()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarSalidaAsync(p.Id, a1.Id, 5, u.Id));

        // Reutilizar el MISMO contexto: un SaveChanges posterior no debe insertar nada.
        db.SaveChanges();
        Assert.False(db.Existencias.Any());
        Assert.False(db.Movimientos.Any());
    }

    [Fact]
    public async Task Entrada_con_producto_inexistente_lanza_error()
    {
        var (db, _, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarEntradaAsync(999, a1.Id, 5, u.Id));
    }

    [Fact]
    public async Task Entrada_con_almacen_inexistente_lanza_error()
    {
        var (db, p, _, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarEntradaAsync(p.Id, 999, 5, u.Id));
    }
}
