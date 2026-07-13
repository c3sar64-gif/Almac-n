using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record CrearUsuarioRequest(string Email, string Nombre, string Password, Rol Rol);

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

    [HttpPut("{id:int}/activo")]
    public async Task<IActionResult> CambiarActivo(int id, [FromBody] bool activo)
    {
        var u = await _db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();
        u.Activo = activo;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
