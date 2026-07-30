using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen([FromQuery] int? almacenId, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta)
    {
        var hoy = DateTime.UtcNow.Date;
        var inicioMes = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var limite30Dias = hoy.AddDays(30);

        var fechaDesde = desde ?? hoy.AddDays(-6);
        var fechaHasta = hasta ?? hoy.AddDays(1).AddSeconds(-1);

        // Query base de existencias con filtro opcional de almacén
        var existenciasQuery = _db.Existencias.AsQueryable();
        var lotesQuery = _db.Lotes.AsQueryable();
        var movimientosQuery = _db.Movimientos.AsQueryable();

        if (almacenId.HasValue && almacenId.Value > 0)
        {
            existenciasQuery = existenciasQuery.Where(e => e.AlmacenId == almacenId.Value);
            lotesQuery = lotesQuery.Where(l => l.AlmacenId == almacenId.Value);
            movimientosQuery = movimientosQuery.Where(m => m.AlmacenOrigenId == almacenId.Value || m.AlmacenDestinoId == almacenId.Value);
        }

        // 1. KPIs principales
        var totalProductos = await _db.Productos.CountAsync(p => p.Activo);
        var totalAlmacenes = await _db.Almacenes.CountAsync(a => a.Activo);

        var alertasStockCount = await existenciasQuery
            .CountAsync(e => e.Cantidad < e.StockMinimo);

        var alertasVencimientoCount = await lotesQuery
            .CountAsync(l => l.Cantidad > 0 && l.FechaVencimiento.HasValue && l.FechaVencimiento.Value.Date <= limite30Dias);

        var tareasPendientesCount = await _db.TareasLogistica
            .CountAsync(t => t.Estado == EstadoTarea.Pendiente);

        var movimientosMesCount = await movimientosQuery
            .CountAsync(m => m.Fecha >= inicioMes);

        // 2. Entradas vs Salidas por Rango de Fechas (Máximo 14 días agrupados)
        var movimientosRango = await movimientosQuery
            .Where(m => m.Fecha >= fechaDesde && m.Fecha <= fechaHasta)
            .ToListAsync();

        var totalDias = (int)Math.Max(1, Math.Min(31, (fechaHasta.Date - fechaDesde.Date).TotalDays + 1));
        var entradasVsSalidas = new List<object>();
        for (int i = 0; i < totalDias; i++)
        {
            var dia = fechaDesde.Date.AddDays(i);
            var fechaStr = dia.ToString("dd/MM");
            var entradas = movimientosRango.Where(m => m.Fecha.Date == dia && m.Tipo == TipoMovimiento.Entrada).Sum(m => (double)m.Cantidad);
            var salidas = movimientosRango.Where(m => m.Fecha.Date == dia && m.Tipo == TipoMovimiento.Salida).Sum(m => (double)m.Cantidad);

            entradasVsSalidas.Add(new
            {
                fecha = fechaStr,
                entradas,
                salidas
            });
        }

        // 3. Top 5 Insumos consumidos en el período filtrado
        var topInsumos = await movimientosQuery
            .Where(m => m.Tipo == TipoMovimiento.Salida && m.Fecha >= fechaDesde && m.Fecha <= fechaHasta && m.Producto != null)
            .GroupBy(m => new { m.ProductoId, Nombre = m.Producto!.Nombre, UnidadMedida = m.Producto.UnidadMedida })
            .Select(g => new
            {
                productoNombre = g.Key.Nombre,
                unidadMedida = g.Key.UnidadMedida,
                totalSalidas = (double)g.Sum(m => m.Cantidad)
            })
            .OrderByDescending(x => x.totalSalidas)
            .Take(5)
            .ToListAsync();

        // 4. Distribución de Stock por Almacén
        var distribucionAlmacenes = await existenciasQuery
            .Where(e => e.Almacen != null)
            .GroupBy(e => new { e.AlmacenId, Nombre = e.Almacen!.Nombre })
            .Select(g => new
            {
                almacenNombre = g.Key.Nombre,
                totalStock = (double)g.Sum(e => e.Cantidad)
            })
            .ToListAsync();

        // 5. Estado de Logística de Choferes
        var tareasLogistica = await _db.TareasLogistica.ToListAsync();
        var estadoLogistica = new
        {
            pendientes = tareasLogistica.Count(t => t.Estado == EstadoTarea.Pendiente),
            enTransito = tareasLogistica.Count(t => t.Estado == EstadoTarea.EnRuta),
            entregadas = tareasLogistica.Count(t => t.Estado == EstadoTarea.Completada),
            total = tareasLogistica.Count
        };

        // 6. Últimos 6 movimientos filtrados
        var ultimosMovimientos = await movimientosQuery
            .Include(m => m.Producto)
            .Include(m => m.AlmacenOrigen)
            .Include(m => m.AlmacenDestino)
            .Include(m => m.Usuario)
            .OrderByDescending(m => m.Fecha)
            .ThenByDescending(m => m.Id)
            .Take(6)
            .Select(m => new
            {
                id = m.Id,
                fecha = m.Fecha,
                tipo = m.Tipo.ToString(),
                productoNombre = m.Producto != null ? m.Producto.Nombre : "Producto",
                sku = m.Producto != null ? m.Producto.Sku : "",
                cantidad = m.Cantidad,
                unidadMedida = m.Producto != null ? m.Producto.UnidadMedida : "unidades",
                almacenOrigen = m.AlmacenOrigen != null ? m.AlmacenOrigen.Nombre : null,
                almacenDestino = m.AlmacenDestino != null ? m.AlmacenDestino.Nombre : null,
                usuario = m.Usuario != null ? m.Usuario.Nombre : "Sistema"
            })
            .ToListAsync();

        return Ok(new
        {
            kpis = new
            {
                totalProductos,
                totalAlmacenes,
                alertasStockCount,
                alertasVencimientoCount,
                tareasPendientesCount,
                movimientosMesCount
            },
            entradasVsSalidas,
            topInsumos,
            distribucionAlmacenes,
            estadoLogistica,
            ultimosMovimientos
        });
    }
}
