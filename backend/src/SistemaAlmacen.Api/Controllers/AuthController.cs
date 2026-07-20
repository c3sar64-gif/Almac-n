using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record LoginRequest(string Email, string Password);

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, TokenService tokens)
    {
        _db = db; _tokens = tokens;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == req.Email && u.Activo);
        if (usuario is null || !BCrypt.Net.BCrypt.Verify(req.Password, usuario.PasswordHash))
            return Unauthorized(new { error = "Credenciales inválidas." });
        return Ok(new
        {
            token = _tokens.Generar(usuario),
            nombre = usuario.Nombre,
            rol = usuario.Rol.ToString(),
            modulosPermitidos = usuario.ModulosPermitidos ?? "productos,almacenes,movimientos,logistica,reportes,usuarios"
        });
    }
}
