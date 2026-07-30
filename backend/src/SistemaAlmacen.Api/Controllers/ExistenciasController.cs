using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/existencias")]
[Authorize]
public class ExistenciasController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExistenciasController(AppDbContext db) { _db = db; }

    // Reporte de existencias actuales; bajoMinimo=true filtra alertas de stock.
    [HttpGet]
    public async Task<IEnumerable<object>> Listar(int? almacenId, bool bajoMinimo = false)
    {
        var q = _db.Existencias.AsQueryable();
        if (almacenId is not null) q = q.Where(e => e.AlmacenId == almacenId);
        if (bajoMinimo) q = q.Where(e => e.Cantidad < e.StockMinimo);
        return await q
            .OrderBy(e => e.Producto!.Nombre)
            .Select(e => new
            {
                e.Id, e.Cantidad, e.StockMinimo,
                BajoMinimo = e.Cantidad < e.StockMinimo,
                Producto = new { e.Producto!.Id, e.Producto.Sku, e.Producto.Nombre, e.Producto.UnidadMedida, e.Producto.Categoria, e.Producto.ImagenUrl },
                Almacen = new { e.Almacen!.Id, e.Almacen.Nombre },
            }).ToListAsync();
    }

    [HttpGet("lotes")]
    public async Task<IActionResult> ListarLotes(int? productoId, int? almacenId)
    {
        var q = _db.Lotes.AsQueryable();
        if (productoId.HasValue) q = q.Where(l => l.ProductoId == productoId.Value);
        if (almacenId.HasValue) q = q.Where(l => l.AlmacenId == almacenId.Value);

        var res = await q
            .Where(l => l.Cantidad > 0)
            .OrderBy(l => l.FechaVencimiento)
            .Select(l => new
            {
                l.Id,
                l.CodigoLote,
                l.Cantidad,
                FechaVencimiento = l.FechaVencimiento.HasValue ? l.FechaVencimiento.Value.ToString("dd/MM/yyyy") : "Sin Vencimiento",
                DiasParaVencer = l.FechaVencimiento.HasValue ? (int?)(l.FechaVencimiento.Value.Date - DateTime.UtcNow.Date).TotalDays : null,
                AlmacenNombre = l.Almacen != null ? l.Almacen.Nombre : "Almacén",
                ProductoNombre = l.Producto != null ? l.Producto.Nombre : "Insumo"
            }).ToListAsync();

        return Ok(res);
    }

    [HttpPut("{id:int}/stock-minimo")]
    public async Task<IActionResult> ActualizarStockMinimo(int id, [FromBody] decimal stockMinimo)
    {
        var e = await _db.Existencias.FindAsync(id);
        if (e is null) return NotFound();
        e.StockMinimo = stockMinimo;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
