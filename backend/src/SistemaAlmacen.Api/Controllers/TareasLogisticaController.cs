using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record CrearTareaRequest(
    string Titulo,
    string? Descripcion,
    int ChoferId,
    int? AlmacenOrigenId,
    int? AlmacenDestinoId
);

public record ActualizarEstadoTareaRequest(
    EstadoTarea Estado,
    string? NotasChofer
);

[ApiController]
[Route("api/tareas-logistica")]
[Authorize]
public class TareasLogisticaController : ControllerBase
{
    private readonly AppDbContext _db;

    public TareasLogisticaController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "";

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? choferId, [FromQuery] EstadoTarea? estado)
    {
        var query = _db.TareasLogistica
            .Include(t => t.Chofer)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .AsQueryable();

        // Si el usuario es Chofer, restringir obligatoriamente a sus propias tareas
        if (CurrentUserRole == "Chofer")
        {
            query = query.Where(t => t.ChoferId == CurrentUserId);
        }
        else if (choferId.HasValue)
        {
            query = query.Where(t => t.ChoferId == choferId.Value);
        }

        if (estado.HasValue)
        {
            query = query.Where(t => t.Estado == estado.Value);
        }

        var result = await query
            .OrderByDescending(t => t.FechaAsignacion)
            .Select(t => new
            {
                t.Id,
                t.Titulo,
                t.Descripcion,
                t.ChoferId,
                Chofer = t.Chofer != null ? new { t.Chofer.Id, t.Chofer.Nombre, t.Chofer.Email } : null,
                t.AlmacenOrigenId,
                AlmacenOrigen = t.AlmacenOrigen != null ? t.AlmacenOrigen.Nombre : null,
                t.AlmacenDestinoId,
                AlmacenDestino = t.AlmacenDestino != null ? t.AlmacenDestino.Nombre : null,
                Estado = t.Estado.ToString(),
                EstadoNum = (int)t.Estado,
                t.FechaAsignacion,
                t.FechaCompletado,
                t.NotasChofer
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTareaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Titulo))
            throw new ReglaNegocioException("El título de la tarea es obligatorio.");

        var chofer = await _db.Usuarios.FindAsync(req.ChoferId);
        if (chofer is null || !chofer.Activo)
            throw new ReglaNegocioException("El chofer seleccionado no existe o está inactivo.");

        if (req.AlmacenOrigenId.HasValue && !await _db.Almacenes.AnyAsync(a => a.Id == req.AlmacenOrigenId))
            throw new ReglaNegocioException("El almacén de origen no existe.");

        if (req.AlmacenDestinoId.HasValue && !await _db.Almacenes.AnyAsync(a => a.Id == req.AlmacenDestinoId))
            throw new ReglaNegocioException("El almacén de destino no existe.");

        var tarea = new TareaLogistica
        {
            Titulo = req.Titulo.Trim(),
            Descripcion = req.Descripcion?.Trim(),
            ChoferId = req.ChoferId,
            AlmacenOrigenId = req.AlmacenOrigenId,
            AlmacenDestinoId = req.AlmacenDestinoId,
            Estado = EstadoTarea.Pendiente,
            FechaAsignacion = DateTime.UtcNow
        };

        _db.TareasLogistica.Add(tarea);
        await _db.SaveChangesAsync();

        return Created($"api/tareas-logistica/{tarea.Id}", new { tarea.Id, tarea.Titulo });
    }

    [HttpPut("{id:int}/estado")]
    public async Task<IActionResult> ActualizarEstado(int id, [FromBody] ActualizarEstadoTareaRequest req)
    {
        var tarea = await _db.TareasLogistica.FindAsync(id);
        if (tarea is null) return NotFound();

        // Si es Chofer, solo puede actualizar si la tarea le pertenece
        if (CurrentUserRole == "Chofer" && tarea.ChoferId != CurrentUserId)
        {
            return Forbid();
        }

        tarea.Estado = req.Estado;
        if (!string.IsNullOrWhiteSpace(req.NotasChofer))
        {
            tarea.NotasChofer = req.NotasChofer.Trim();
        }

        if (req.Estado == EstadoTarea.Completada && !tarea.FechaCompletado.HasValue)
        {
            tarea.FechaCompletado = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var tarea = await _db.TareasLogistica.FindAsync(id);
        if (tarea is null) return NotFound();

        if (CurrentUserRole == "Chofer")
        {
            return Forbid();
        }

        _db.TareasLogistica.Remove(tarea);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
