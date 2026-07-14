using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/almacenes")]
[Authorize]
public class AlmacenesController : ControllerBase
{
    private readonly AppDbContext _db;
    public AlmacenesController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IEnumerable<Almacen>> Listar() =>
        await _db.Almacenes.OrderBy(a => a.Nombre).ToListAsync();

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Almacen>> Crear(Almacen almacen)
    {
        almacen.Id = 0;
        _db.Almacenes.Add(almacen);
        await _db.SaveChangesAsync();
        return Created($"api/almacenes/{almacen.Id}", almacen);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Actualizar(int id, Almacen datos)
    {
        var a = await _db.Almacenes.FindAsync(id);
        if (a is null) return NotFound();
        (a.Nombre, a.Ubicacion, a.Activo) = (datos.Nombre, datos.Ubicacion, datos.Activo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
