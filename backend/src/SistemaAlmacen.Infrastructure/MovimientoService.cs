using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class MovimientoService
{
    private readonly AppDbContext _db;
    public MovimientoService(AppDbContext db) { _db = db; }

    public async Task<Movimiento> RegistrarEntradaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        await using var tx = await _db.Database.BeginTransactionAsync();
        var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
        existencia.Cantidad += cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Entrada, ProductoId = productoId,
            AlmacenDestinoId = almacenId, Cantidad = cantidad,
            UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }

    public async Task<Movimiento> RegistrarSalidaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        await using var tx = await _db.Database.BeginTransactionAsync();
        var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
        if (existencia.Cantidad < cantidad)
            throw new ReglaNegocioException(
                $"Stock insuficiente: hay {existencia.Cantidad} y se pidieron {cantidad}.");
        existencia.Cantidad -= cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Salida, ProductoId = productoId,
            AlmacenOrigenId = almacenId, Cantidad = cantidad,
            UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }

    public async Task<Movimiento> RegistrarTransferenciaAsync(
        int productoId, int almacenOrigenId, int almacenDestinoId,
        decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        if (almacenOrigenId == almacenDestinoId)
            throw new ReglaNegocioException("El almacén de origen y destino no pueden ser el mismo.");
        await using var tx = await _db.Database.BeginTransactionAsync();
        var origen = await ObtenerOCrearExistenciaAsync(productoId, almacenOrigenId);
        if (origen.Cantidad < cantidad)
            throw new ReglaNegocioException(
                $"Stock insuficiente en origen: hay {origen.Cantidad} y se pidieron {cantidad}.");
        var destino = await ObtenerOCrearExistenciaAsync(productoId, almacenDestinoId);
        origen.Cantidad -= cantidad;
        destino.Cantidad += cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Transferencia, ProductoId = productoId,
            AlmacenOrigenId = almacenOrigenId, AlmacenDestinoId = almacenDestinoId,
            Cantidad = cantidad, UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }

    private static void ValidarCantidad(decimal cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad debe ser mayor a cero.");
    }

    private async Task<Existencia> ObtenerOCrearExistenciaAsync(int productoId, int almacenId)
    {
        var ex = await _db.Existencias
            .FirstOrDefaultAsync(e => e.ProductoId == productoId && e.AlmacenId == almacenId);
        if (ex is null)
        {
            ex = new Existencia { ProductoId = productoId, AlmacenId = almacenId, Cantidad = 0 };
            _db.Existencias.Add(ex);
        }
        return ex;
    }
}
