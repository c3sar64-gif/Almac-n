using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/productos")]
[Authorize]
public class ProductosController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductosController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IEnumerable<Producto>> Listar() =>
        await _db.Productos.OrderBy(p => p.Nombre).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Producto>> Obtener(int id) =>
        await _db.Productos.FindAsync(id) is { } p ? p : NotFound();

    [HttpPost]
    public async Task<ActionResult<Producto>> Crear(Producto producto)
    {
        if (await _db.Productos.AnyAsync(p => p.Sku == producto.Sku))
            throw new ReglaNegocioException($"Ya existe un producto con SKU '{producto.Sku}'.");
        producto.Id = 0;
        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Obtener), new { id = producto.Id }, producto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, Producto datos)
    {
        var p = await _db.Productos.FindAsync(id);
        if (p is null) return NotFound();
        if (await _db.Productos.AnyAsync(x => x.Sku == datos.Sku && x.Id != id))
            throw new ReglaNegocioException($"Ya existe un producto con SKU '{datos.Sku}'.");
        (p.Sku, p.Nombre, p.Descripcion, p.Categoria, p.UnidadMedida, p.Activo) =
            (datos.Sku, datos.Nombre, datos.Descripcion, datos.Categoria, datos.UnidadMedida, datos.Activo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
