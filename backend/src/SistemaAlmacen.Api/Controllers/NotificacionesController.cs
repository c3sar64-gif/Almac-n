using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/notificaciones")]
[Authorize]
public class NotificacionesController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificacionesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumenNotificaciones()
    {
        // 1. Alertas de Stock Mínimo
        var alertasStock = await _db.Existencias
            .Include(e => e.Producto)
            .Include(e => e.Almacen)
            .Where(e => e.Cantidad < e.StockMinimo)
            .Select(e => new
            {
                productoId = e.ProductoId,
                productoNombre = e.Producto!.Nombre,
                sku = e.Producto.Sku,
                unidadMedida = e.Producto.UnidadMedida,
                almacenNombre = e.Almacen!.Nombre,
                stockActual = e.Cantidad,
                stockMinimo = e.StockMinimo
            })
            .ToListAsync();

        // 2. Alertas de Lotes Próximos a Vencer (< 30 días) o ya Vencidos
        var limite30Dias = DateTime.UtcNow.Date.AddDays(30);
        var alertasVencimiento = await _db.Lotes
            .Include(l => l.Producto)
            .Include(l => l.Almacen)
            .Where(l => l.Cantidad > 0 && l.FechaVencimiento != null && l.FechaVencimiento <= limite30Dias)
            .OrderBy(l => l.FechaVencimiento)
            .Select(l => new
            {
                loteId = l.Id,
                codigoLote = l.CodigoLote,
                productoNombre = l.Producto!.Nombre,
                almacenNombre = l.Almacen!.Nombre,
                cantidad = l.Cantidad,
                fechaVencimiento = l.FechaVencimiento!.Value.ToString("yyyy-MM-dd"),
                diasParaVencer = (l.FechaVencimiento.Value.Date - DateTime.UtcNow.Date).Days,
                esVencido = l.FechaVencimiento.Value.Date < DateTime.UtcNow.Date
            })
            .ToListAsync();

        // 3. Tareas Logísticas Pendientes
        var tareasPendientes = await _db.TareasLogistica
            .CountAsync(t => t.Estado == EstadoTarea.Pendiente);

        var totalAlertas = alertasStock.Count + alertasVencimiento.Count + tareasPendientes;

        return Ok(new
        {
            totalAlertas,
            alertasStock,
            alertasVencimiento,
            tareasPendientes
        });
    }
}
