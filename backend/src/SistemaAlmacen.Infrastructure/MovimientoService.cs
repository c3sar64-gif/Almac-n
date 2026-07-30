using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class MovimientoService
{
    private readonly AppDbContext _db;
    public MovimientoService(AppDbContext db) { _db = db; }

    private static DateTime ObtenerFechaMovimientoUtc(DateTime? fecha)
    {
        if (!fecha.HasValue) return DateTime.UtcNow;
        var dt = fecha.Value;
        return new DateTime(dt.Year, dt.Month, dt.Day, 12, 0, 0, DateTimeKind.Utc);
    }

    public Task<Movimiento> RegistrarEntradaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null, DateTime? fecha = null, string? numeroLote = null, DateTime? fechaVencimiento = null, decimal? precioUnitario = null)
        => EjecutarConReintentosAsync(async () =>
        {
            ValidarCantidad(cantidad);
            await ValidarReferenciasAsync(productoId, almacenId);
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
            existencia.Cantidad += cantidad;

            // Actualizar precio unitario de referencia en el Producto
            var prod = await _db.Productos.FindAsync(productoId);
            if (prod is not null && precioUnitario.HasValue)
            {
                prod.PrecioUnitario = precioUnitario.Value;
            }

            DateTime? fechaVencUtc = fechaVencimiento.HasValue ? ObtenerFechaMovimientoUtc(fechaVencimiento) : null;
            var loteStr = string.IsNullOrWhiteSpace(numeroLote) ? null : numeroLote.Trim();

            if (!string.IsNullOrEmpty(loteStr))
            {
                var lote = await _db.Lotes.FirstOrDefaultAsync(l => l.ProductoId == productoId && l.AlmacenId == almacenId && l.CodigoLote == loteStr);
                if (lote is null)
                {
                    lote = new Lote
                    {
                        ProductoId = productoId,
                        AlmacenId = almacenId,
                        CodigoLote = loteStr,
                        FechaVencimiento = fechaVencUtc,
                        Cantidad = cantidad,
                        FechaIngreso = DateTime.UtcNow
                    };
                    _db.Lotes.Add(lote);
                }
                else
                {
                    lote.Cantidad += cantidad;
                    if (fechaVencUtc.HasValue) lote.FechaVencimiento = fechaVencUtc;
                }
            }

            var mov = new Movimiento
            {
                Tipo = TipoMovimiento.Entrada, ProductoId = productoId,
                AlmacenDestinoId = almacenId, Cantidad = cantidad,
                UsuarioId = usuarioId, Nota = nota, Fecha = ObtenerFechaMovimientoUtc(fecha),
                NumeroLote = loteStr, FechaVencimiento = fechaVencUtc,
                PrecioUnitario = precioUnitario
            };
            _db.Movimientos.Add(mov);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return mov;
        });

    public Task<Movimiento> RegistrarSalidaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null, DateTime? fecha = null, string? numeroLote = null, DateTime? fechaVencimiento = null)
        => EjecutarConReintentosAsync(async () =>
        {
            ValidarCantidad(cantidad);
            await ValidarReferenciasAsync(productoId, almacenId);
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
            if (existencia.Cantidad < cantidad)
                throw new ReglaNegocioException(
                    $"Stock insuficiente: hay {existencia.Cantidad} y se pidieron {cantidad}.");
            existencia.Cantidad -= cantidad;

            DateTime? fechaVencUtc = fechaVencimiento.HasValue ? ObtenerFechaMovimientoUtc(fechaVencimiento) : null;
            var loteStr = string.IsNullOrWhiteSpace(numeroLote) ? null : numeroLote.Trim();

            // Aplicar FEFO sobre la tabla Lotes si existen lotes activos
            var lotesDisponibles = await _db.Lotes
                .Where(l => l.ProductoId == productoId && l.AlmacenId == almacenId && l.Cantidad > 0)
                .OrderBy(l => l.FechaVencimiento.HasValue ? 0 : 1)
                .ThenBy(l => l.FechaVencimiento)
                .ThenBy(l => l.FechaIngreso)
                .ToListAsync();

            if (lotesDisponibles.Any())
            {
                decimal porDescontar = cantidad;
                foreach (var lote in lotesDisponibles)
                {
                    if (porDescontar <= 0) break;
                    decimal descuento = Math.Min(lote.Cantidad, porDescontar);
                    lote.Cantidad -= descuento;
                    porDescontar -= descuento;
                    if (string.IsNullOrEmpty(loteStr)) loteStr = lote.CodigoLote;
                    if (!fechaVencUtc.HasValue) fechaVencUtc = lote.FechaVencimiento;
                }
            }

            var mov = new Movimiento
            {
                Tipo = TipoMovimiento.Salida, ProductoId = productoId,
                AlmacenOrigenId = almacenId, Cantidad = cantidad,
                UsuarioId = usuarioId, Nota = nota, Fecha = ObtenerFechaMovimientoUtc(fecha),
                NumeroLote = loteStr, FechaVencimiento = fechaVencUtc
            };
            _db.Movimientos.Add(mov);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return mov;
        });

    public Task<Movimiento> RegistrarTransferenciaAsync(
        int productoId, int almacenOrigenId, int almacenDestinoId,
        decimal cantidad, int usuarioId, string? nota = null, DateTime? fecha = null, string? numeroLote = null, DateTime? fechaVencimiento = null)
        => EjecutarConReintentosAsync(async () =>
        {
            ValidarCantidad(cantidad);
            if (almacenOrigenId == almacenDestinoId)
                throw new ReglaNegocioException("El almacén de origen y destino no pueden ser el mismo.");
            await ValidarReferenciasAsync(productoId, almacenOrigenId, almacenDestinoId);
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var origen = await ObtenerOCrearExistenciaAsync(productoId, almacenOrigenId);
            if (origen.Cantidad < cantidad)
                throw new ReglaNegocioException(
                    $"Stock insuficiente en origen: hay {origen.Cantidad} y se pidieron {cantidad}.");
            var destino = await ObtenerOCrearExistenciaAsync(productoId, almacenDestinoId);
            origen.Cantidad -= cantidad;
            destino.Cantidad += cantidad;

            DateTime? fechaVencUtc = fechaVencimiento.HasValue ? ObtenerFechaMovimientoUtc(fechaVencimiento) : null;
            var loteStr = string.IsNullOrWhiteSpace(numeroLote) ? null : numeroLote.Trim();

            var mov = new Movimiento
            {
                Tipo = TipoMovimiento.Transferencia, ProductoId = productoId,
                AlmacenOrigenId = almacenOrigenId, AlmacenDestinoId = almacenDestinoId,
                Cantidad = cantidad, UsuarioId = usuarioId, Nota = nota, Fecha = ObtenerFechaMovimientoUtc(fecha),
                NumeroLote = loteStr, FechaVencimiento = fechaVencUtc
            };
            _db.Movimientos.Add(mov);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return mov;
        });

    // Reintenta ante fallos de serialización de Postgres (40001) y ante la carrera
    // de crear la primera existencia de un par producto/almacén (23505 sobre su
    // índice único); limpia el change tracker en cualquier fallo para no dejar
    // entidades fantasma.
    private async Task<Movimiento> EjecutarConReintentosAsync(Func<Task<Movimiento>> operacion)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        const int maxIntentos = 3;
        for (var intento = 1; ; intento++)
        {
            try
            {
                return await strategy.ExecuteAsync(async () =>
                {
                    _db.ChangeTracker.Clear();
                    return await operacion();
                });
            }
            catch (Exception ex) when (intento < maxIntentos && EsReintentable(ex))
            {
                _db.ChangeTracker.Clear();
            }
            catch
            {
                _db.ChangeTracker.Clear();
                throw;
            }
        }
    }
    public Task<Movimiento> EliminarMovimientoAsync(int id)
        => EjecutarConReintentosAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var mov = await _db.Movimientos.FindAsync(id);
            if (mov is null)
                throw new ReglaNegocioException("El movimiento no existe.");

            await RevertirMovimientoEfectoAsync(mov);
            _db.Movimientos.Remove(mov);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return mov;
        });

    public Task<Movimiento> EditarMovimientoAsync(
        int id, int productoId, decimal cantidad, string? nota,
        int? almacenOrigenId, int? almacenDestinoId, DateTime? fecha,
        string? numeroLote, DateTime? fechaVencimiento, decimal? precioUnitario)
        => EjecutarConReintentosAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var mov = await _db.Movimientos.FindAsync(id);
            if (mov is null)
                throw new ReglaNegocioException("El movimiento no existe.");

            await RevertirMovimientoEfectoAsync(mov);
            await AplicarMovimientoEfectoAsync(
                productoId, cantidad, nota, almacenOrigenId, almacenDestinoId,
                fecha, numeroLote, fechaVencimiento, precioUnitario, mov);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return mov;
        });

    private async Task RevertirMovimientoEfectoAsync(Movimiento mov)
    {
        if (mov.Tipo == TipoMovimiento.Entrada)
        {
            if (!mov.AlmacenDestinoId.HasValue) return;
            var existencia = await ObtenerOCrearExistenciaAsync(mov.ProductoId, mov.AlmacenDestinoId.Value);
            if (existencia.Cantidad < mov.Cantidad)
                throw new ReglaNegocioException($"No se puede revertir este movimiento porque el stock actual ({existencia.Cantidad}) es menor a la cantidad a retirar ({mov.Cantidad}).");
            
            existencia.Cantidad -= mov.Cantidad;

            if (!string.IsNullOrWhiteSpace(mov.NumeroLote))
            {
                var lote = await _db.Lotes.FirstOrDefaultAsync(l => l.ProductoId == mov.ProductoId && l.AlmacenId == mov.AlmacenDestinoId.Value && l.CodigoLote == mov.NumeroLote);
                if (lote is not null)
                {
                    if (lote.Cantidad < mov.Cantidad)
                        throw new ReglaNegocioException($"No se puede revertir este movimiento porque el lote '{mov.NumeroLote}' ya fue consumido y no tiene suficiente stock (actual: {lote.Cantidad}, requerido: {mov.Cantidad}).");
                    
                    lote.Cantidad -= mov.Cantidad;
                    if (lote.Cantidad <= 0)
                    {
                        _db.Lotes.Remove(lote);
                    }
                }
            }
        }
        else if (mov.Tipo == TipoMovimiento.Salida)
        {
            if (!mov.AlmacenOrigenId.HasValue) return;
            var existencia = await ObtenerOCrearExistenciaAsync(mov.ProductoId, mov.AlmacenOrigenId.Value);
            existencia.Cantidad += mov.Cantidad;

            if (!string.IsNullOrWhiteSpace(mov.NumeroLote))
            {
                var lote = await _db.Lotes.FirstOrDefaultAsync(l => l.ProductoId == mov.ProductoId && l.AlmacenId == mov.AlmacenOrigenId.Value && l.CodigoLote == mov.NumeroLote);
                if (lote is not null)
                {
                    lote.Cantidad += mov.Cantidad;
                }
                else
                {
                    lote = new Lote
                    {
                        ProductoId = mov.ProductoId,
                        AlmacenId = mov.AlmacenOrigenId.Value,
                        CodigoLote = mov.NumeroLote,
                        FechaVencimiento = mov.FechaVencimiento,
                        Cantidad = mov.Cantidad,
                        FechaIngreso = DateTime.UtcNow
                    };
                    _db.Lotes.Add(lote);
                }
            }
        }
        else if (mov.Tipo == TipoMovimiento.Transferencia)
        {
            if (!mov.AlmacenOrigenId.HasValue || !mov.AlmacenDestinoId.HasValue) return;
            var destino = await ObtenerOCrearExistenciaAsync(mov.ProductoId, mov.AlmacenDestinoId.Value);
            if (destino.Cantidad < mov.Cantidad)
                throw new ReglaNegocioException($"No se puede revertir este movimiento porque el stock del almacén de destino ({destino.Cantidad}) es menor a la cantidad a retirar ({mov.Cantidad}).");
            
            var origen = await ObtenerOCrearExistenciaAsync(mov.ProductoId, mov.AlmacenOrigenId.Value);
            destino.Cantidad -= mov.Cantidad;
            origen.Cantidad += mov.Cantidad;
        }
    }

    private async Task AplicarMovimientoEfectoAsync(
        int productoId, decimal cantidad, string? nota,
        int? almacenOrigenId, int? almacenDestinoId, DateTime? fecha,
        string? numeroLote, DateTime? fechaVencimiento, decimal? precioUnitario,
        Movimiento mov)
    {
        ValidarCantidad(cantidad);
        
        var ids = new List<int>();
        if (almacenOrigenId.HasValue) ids.Add(almacenOrigenId.Value);
        if (almacenDestinoId.HasValue) ids.Add(almacenDestinoId.Value);
        await ValidarReferenciasAsync(productoId, ids.ToArray());

        mov.ProductoId = productoId;
        mov.Cantidad = cantidad;
        mov.Nota = nota;
        mov.Fecha = ObtenerFechaMovimientoUtc(fecha);
        mov.PrecioUnitario = precioUnitario;

        var loteStr = string.IsNullOrWhiteSpace(numeroLote) ? null : numeroLote.Trim();
        DateTime? fechaVencUtc = fechaVencimiento.HasValue ? ObtenerFechaMovimientoUtc(fechaVencimiento) : null;

        mov.NumeroLote = loteStr;
        mov.FechaVencimiento = fechaVencUtc;

        if (mov.Tipo == TipoMovimiento.Entrada)
        {
            if (!almacenDestinoId.HasValue)
                throw new ReglaNegocioException("Falta el almacén de destino para la entrada.");

            mov.AlmacenDestinoId = almacenDestinoId.Value;
            mov.AlmacenOrigenId = null;

            var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenDestinoId.Value);
            existencia.Cantidad += cantidad;

            var prod = await _db.Productos.FindAsync(productoId);
            if (prod is not null && precioUnitario.HasValue)
            {
                prod.PrecioUnitario = precioUnitario.Value;
            }

            if (!string.IsNullOrEmpty(loteStr))
            {
                var lote = await _db.Lotes.FirstOrDefaultAsync(l => l.ProductoId == productoId && l.AlmacenId == almacenDestinoId.Value && l.CodigoLote == loteStr);
                if (lote is null)
                {
                    lote = new Lote
                    {
                        ProductoId = productoId,
                        AlmacenId = almacenDestinoId.Value,
                        CodigoLote = loteStr,
                        FechaVencimiento = fechaVencUtc,
                        Cantidad = cantidad,
                        FechaIngreso = DateTime.UtcNow
                    };
                    _db.Lotes.Add(lote);
                }
                else
                {
                    lote.Cantidad += cantidad;
                    if (fechaVencUtc.HasValue) lote.FechaVencimiento = fechaVencUtc;
                }
            }
        }
        else if (mov.Tipo == TipoMovimiento.Salida)
        {
            if (!almacenOrigenId.HasValue)
                throw new ReglaNegocioException("Falta el almacén de origen para la salida.");

            mov.AlmacenOrigenId = almacenOrigenId.Value;
            mov.AlmacenDestinoId = null;

            var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenOrigenId.Value);
            if (existencia.Cantidad < cantidad)
                throw new ReglaNegocioException($"Stock insuficiente: hay {existencia.Cantidad} y se pidieron {cantidad}.");
            
            existencia.Cantidad -= cantidad;

            var lotesDisponibles = await _db.Lotes
                .Where(l => l.ProductoId == productoId && l.AlmacenId == almacenOrigenId.Value && l.Cantidad > 0)
                .OrderBy(l => l.FechaVencimiento.HasValue ? 0 : 1)
                .ThenBy(l => l.FechaVencimiento)
                .ThenBy(l => l.FechaIngreso)
                .ToListAsync();

            if (lotesDisponibles.Any())
            {
                decimal porDescontar = cantidad;
                foreach (var lote in lotesDisponibles)
                {
                    if (porDescontar <= 0) break;
                    decimal descuento = Math.Min(lote.Cantidad, porDescontar);
                    lote.Cantidad -= descuento;
                    porDescontar -= descuento;
                    if (string.IsNullOrEmpty(loteStr)) loteStr = lote.CodigoLote;
                    if (!fechaVencUtc.HasValue) fechaVencUtc = lote.FechaVencimiento;
                }
            }

            mov.NumeroLote = loteStr;
            mov.FechaVencimiento = fechaVencUtc;
        }
        else if (mov.Tipo == TipoMovimiento.Transferencia)
        {
            if (!almacenOrigenId.HasValue || !almacenDestinoId.HasValue)
                throw new ReglaNegocioException("Falta el almacén de origen o destino para la transferencia.");

            mov.AlmacenOrigenId = almacenOrigenId.Value;
            mov.AlmacenDestinoId = almacenDestinoId.Value;

            var origen = await ObtenerOCrearExistenciaAsync(productoId, almacenOrigenId.Value);
            if (origen.Cantidad < cantidad)
                throw new ReglaNegocioException($"Stock insuficiente en origen: hay {origen.Cantidad} y se pidieron {cantidad}.");
            
            var destino = await ObtenerOCrearExistenciaAsync(productoId, almacenDestinoId.Value);
            origen.Cantidad -= cantidad;
            destino.Cantidad += cantidad;
        }
    }


    private static bool EsReintentable(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException!)
            if (e is PostgresException pg &&
                (pg.SqlState == "40001" ||
                 (pg.SqlState == "23505" && pg.ConstraintName == "IX_Existencias_ProductoId_AlmacenId")))
                return true;
        return false;
    }

    private static void ValidarCantidad(decimal cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad debe ser mayor a cero.");
    }

    private async Task ValidarReferenciasAsync(int productoId, params int[] almacenIds)
    {
        if (!await _db.Productos.AnyAsync(p => p.Id == productoId))
            throw new ReglaNegocioException($"El producto {productoId} no existe.");
        foreach (var id in almacenIds)
            if (!await _db.Almacenes.AnyAsync(a => a.Id == id))
                throw new ReglaNegocioException($"El almacén {id} no existe.");
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
