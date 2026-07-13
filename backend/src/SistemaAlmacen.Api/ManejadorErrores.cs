using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;

namespace SistemaAlmacen.Api;

public class ManejadorErrores
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ManejadorErrores> _log;

    public ManejadorErrores(RequestDelegate next, ILogger<ManejadorErrores> log)
    {
        _next = next; _log = log;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await _next(ctx); }
        catch (ReglaNegocioException ex)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (DbUpdateException ex) when (ExtraerPostgres(ex) is { } pg &&
                                           (pg.SqlState == "23505" || pg.SqlState == "23503"))
        {
            ctx.Response.StatusCode = 400;
            var mensaje = pg.SqlState == "23505"
                ? MensajeDuplicado(pg.ConstraintName)
                : "Referencia inválida: el registro relacionado no existe.";
            await ctx.Response.WriteAsJsonAsync(new { error = mensaje });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error no controlado");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(new { error = "Error interno del servidor." });
        }
    }

    private static Npgsql.PostgresException? ExtraerPostgres(Exception ex)
    {
        for (Exception? e = ex; e is not null; e = e.InnerException)
            if (e is Npgsql.PostgresException pg) return pg;
        return null;
    }

    private static string MensajeDuplicado(string? constraint) => constraint switch
    {
        "IX_Productos_Sku" => "Ya existe un producto con ese SKU.",
        "IX_Usuarios_Email" => "Ya existe un usuario con ese email.",
        _ => "El registro ya existe (valor duplicado).",
    };
}
