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
        catch (Exception ex)
        {
            _log.LogError(ex, "Error no controlado");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(new { error = "Error interno del servidor." });
        }
    }
}
