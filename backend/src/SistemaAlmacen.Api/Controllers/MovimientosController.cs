using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record MovimientoRequest(
    int ProductoId, decimal Cantidad, string? Nota,
    int? AlmacenOrigenId, int? AlmacenDestinoId);

[ApiController]
[Route("api/movimientos")]
[Authorize]
public class MovimientosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MovimientoService _svc;

    public MovimientosController(AppDbContext db, MovimientoService svc)
    {
        _db = db; _svc = svc;
    }

    private int UsuarioId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("entrada")]
    public async Task<ActionResult<Movimiento>> Entrada(MovimientoRequest r)
    {
        if (r.AlmacenDestinoId is null)
            throw new ReglaNegocioException("Falta el almacén de destino.");
        return await _svc.RegistrarEntradaAsync(r.ProductoId, r.AlmacenDestinoId.Value, r.Cantidad, UsuarioId, r.Nota);
    }

    [HttpPost("salida")]
    public async Task<ActionResult<Movimiento>> Salida(MovimientoRequest r)
    {
        if (r.AlmacenOrigenId is null)
            throw new ReglaNegocioException("Falta el almacén de origen.");
        return await _svc.RegistrarSalidaAsync(r.ProductoId, r.AlmacenOrigenId.Value, r.Cantidad, UsuarioId, r.Nota);
    }

    [HttpPost("transferencia")]
    public async Task<ActionResult<Movimiento>> Transferencia(MovimientoRequest r)
    {
        if (r.AlmacenOrigenId is null)
            throw new ReglaNegocioException("Falta el almacén de origen.");
        if (r.AlmacenDestinoId is null)
            throw new ReglaNegocioException("Falta el almacén de destino.");
        return await _svc.RegistrarTransferenciaAsync(
            r.ProductoId, r.AlmacenOrigenId.Value, r.AlmacenDestinoId.Value, r.Cantidad, UsuarioId, r.Nota);
    }

    // Historial con filtros: sirve también como reporte de movimientos por rango de fechas.
    [HttpGet]
    public async Task<IEnumerable<object>> Listar(
        DateTime? desde, DateTime? hasta, int? productoId, int? almacenId)
    {
        var q = _db.Movimientos.AsQueryable();
        if (desde is not null) q = q.Where(m => m.Fecha >= desde.Value.ToUniversalTime());
        if (hasta is not null) q = q.Where(m => m.Fecha <= hasta.Value.ToUniversalTime());
        if (productoId is not null) q = q.Where(m => m.ProductoId == productoId);
        if (almacenId is not null)
            q = q.Where(m => m.AlmacenOrigenId == almacenId || m.AlmacenDestinoId == almacenId);
        return await q.OrderByDescending(m => m.Fecha).Take(500)
            .Select(m => new
            {
                m.Id, Tipo = m.Tipo.ToString(), m.Fecha, m.Cantidad, m.Nota,
                Producto = new { m.Producto!.Id, m.Producto.Sku, m.Producto.Nombre },
                AlmacenOrigen = m.AlmacenOrigen == null ? null : m.AlmacenOrigen.Nombre,
                AlmacenDestino = m.AlmacenDestino == null ? null : m.AlmacenDestino.Nombre,
                Usuario = m.Usuario!.Nombre,
            }).ToListAsync();
    }
}
