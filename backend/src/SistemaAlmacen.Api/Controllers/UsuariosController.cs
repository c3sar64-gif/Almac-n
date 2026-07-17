using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record CrearUsuarioRequest(string Email, string Nombre, string Password, Rol Rol);
public record EditarUsuarioRequest(string Email, string Nombre, Rol Rol, string? Password);

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "Admin")]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _db;
    public UsuariosController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IEnumerable<object>> Listar() =>
        await _db.Usuarios
            .Select(u => new { u.Id, u.Email, u.Nombre, Rol = u.Rol.ToString(), u.Activo })
            .ToListAsync();

    [HttpPost]
    public async Task<IActionResult> Crear(CrearUsuarioRequest req)
    {
        if (await _db.Usuarios.AnyAsync(u => u.Email == req.Email))
            throw new ReglaNegocioException($"Ya existe un usuario con email '{req.Email}'.");
        if (req.Password.Length < 8)
            throw new ReglaNegocioException("La contraseña debe tener al menos 8 caracteres.");
        var u = new Usuario
        {
            Email = req.Email, Nombre = req.Nombre, Rol = req.Rol,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };
        _db.Usuarios.Add(u);
        await _db.SaveChangesAsync();
        return Created($"api/usuarios/{u.Id}", new { u.Id, u.Email, u.Nombre, Rol = u.Rol.ToString() });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Editar(int id, EditarUsuarioRequest req)
    {
        var u = await _db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();

        if (await _db.Usuarios.AnyAsync(x => x.Email == req.Email && x.Id != id))
            throw new ReglaNegocioException($"Ya existe un usuario con identificador '{req.Email}'.");

        u.Email = req.Email;
        u.Nombre = req.Nombre;
        u.Rol = req.Rol;

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            if (req.Password.Length < 8)
                throw new ReglaNegocioException("La contraseña debe tener al menos 8 caracteres.");
            u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:int}/activo")]
    public async Task<IActionResult> CambiarActivo(int id, [FromBody] bool activo)
    {
        var u = await _db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();

        var currentUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserIdStr is not null && int.TryParse(currentUserIdStr, out var currentId) && currentId == id && !activo)
            throw new ReglaNegocioException("No puedes desactivar tu propio usuario.");

        u.Activo = activo;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var u = await _db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();

        var currentUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserIdStr is not null && int.TryParse(currentUserIdStr, out var currentId) && currentId == id)
            throw new ReglaNegocioException("No puedes eliminar tu propio usuario.");

        _db.Usuarios.Remove(u);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
