using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record RecepcionRequest(
    int ProductoId,
    int AlmacenId,
    decimal CantidadRecibida,
    string Proveedor,
    string? NumeroGuiaFactura,
    string? RegistroSenasag,
    string? NombreTransportista,
    string NumeroLote,
    DateTime? FechaFabricacion,
    DateTime? FechaVencimiento,
    // Protocolo Documentación
    bool? DocCuentaConFacturaFichaCalidad,
    bool? DocCoincidePedido,
    // Protocolo Transporte y Vehículo
    bool? TranspVehiculoLimpio,
    bool? TranspMercanciaEstibada,
    // Protocolo Empaques
    bool? EmpaqueEtiquetasLegibles,
    bool? EmpaqueEnvasesLimpios,
    // Legacy / Compatibilidad
    bool? EmpaqueConforme,
    bool? AspectoConforme,
    string? Temperatura,
    int DictamenCalidad, // 1 = Aprobado, 2 = Rechazado, 3 = Condicional
    string? Observaciones,
    string? FichaTecnicaUrl
);

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecepcionesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MovimientoService _movimientoService;

    public RecepcionesController(AppDbContext db, MovimientoService movimientoService)
    {
        _db = db;
        _movimientoService = movimientoService;
    }

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? productoId, [FromQuery] int? almacenId, [FromQuery] int? dictamen)
    {
        var q = _db.RecepcionesMateriaPrima.AsQueryable();

        if (productoId.HasValue && productoId.Value > 0)
            q = q.Where(r => r.ProductoId == productoId.Value);

        if (almacenId.HasValue && almacenId.Value > 0)
            q = q.Where(r => r.AlmacenId == almacenId.Value);

        if (dictamen.HasValue && dictamen.Value > 0)
            q = q.Where(r => (int)r.DictamenCalidad == dictamen.Value);

        var list = await q
            .Include(r => r.Producto)
            .Include(r => r.Almacen)
            .Include(r => r.Usuario)
            .OrderByDescending(r => r.FechaRecepcion)
            .Select(r => new
            {
                r.Id,
                r.FechaRecepcion,
                producto = new { r.Producto!.Id, r.Producto.Sku, r.Producto.Nombre, r.Producto.UnidadMedida },
                almacen = new { r.Almacen!.Id, r.Almacen.Nombre },
                r.CantidadRecibida,
                r.Proveedor,
                r.NumeroGuiaFactura,
                r.RegistroSenasag,
                r.NombreTransportista,
                r.NumeroLote,
                FechaFabricacion = r.FechaFabricacion.HasValue ? r.FechaFabricacion.Value.ToString("yyyy-MM-dd") : null,
                FechaVencimiento = r.FechaVencimiento.HasValue ? r.FechaVencimiento.Value.ToString("yyyy-MM-dd") : null,
                r.DocCuentaConFacturaFichaCalidad,
                r.DocCoincidePedido,
                r.TranspVehiculoLimpio,
                r.TranspMercanciaEstibada,
                r.EmpaqueEtiquetasLegibles,
                r.EmpaqueEnvasesLimpios,
                r.EmpaqueConforme,
                r.AspectoConforme,
                r.Temperatura,
                dictamenCalidad = r.DictamenCalidad.ToString(),
                dictamenNum = (int)r.DictamenCalidad,
                r.Observaciones,
                r.FichaTecnicaUrl,
                usuario = r.Usuario != null ? r.Usuario.Nombre : "Operador"
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] RecepcionRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var usuarioId))
            return Unauthorized();

        var dictamenEnum = (DictamenCalidad)req.DictamenCalidad;

        var recepcion = new RecepcionMateriaPrima
        {
            FechaRecepcion = DateTime.UtcNow,
            ProductoId = req.ProductoId,
            AlmacenId = req.AlmacenId,
            CantidadRecibida = req.CantidadRecibida,
            Proveedor = req.Proveedor.Trim(),
            NumeroGuiaFactura = req.NumeroGuiaFactura?.Trim(),
            RegistroSenasag = req.RegistroSenasag?.Trim(),
            NombreTransportista = req.NombreTransportista?.Trim(),
            NumeroLote = req.NumeroLote.Trim(),
            FechaFabricacion = req.FechaFabricacion?.ToUniversalTime(),
            FechaVencimiento = req.FechaVencimiento?.ToUniversalTime(),
            DocCuentaConFacturaFichaCalidad = req.DocCuentaConFacturaFichaCalidad ?? true,
            DocCoincidePedido = req.DocCoincidePedido ?? true,
            TranspVehiculoLimpio = req.TranspVehiculoLimpio ?? true,
            TranspMercanciaEstibada = req.TranspMercanciaEstibada ?? true,
            EmpaqueEtiquetasLegibles = req.EmpaqueEtiquetasLegibles ?? true,
            EmpaqueEnvasesLimpios = req.EmpaqueEnvasesLimpios ?? true,
            EmpaqueConforme = req.EmpaqueConforme ?? true,
            AspectoConforme = req.AspectoConforme ?? true,
            Temperatura = req.Temperatura?.Trim(),
            DictamenCalidad = dictamenEnum,
            Observaciones = req.Observaciones?.Trim(),
            FichaTecnicaUrl = req.FichaTecnicaUrl?.Trim(),
            UsuarioId = usuarioId
        };

        _db.RecepcionesMateriaPrima.Add(recepcion);
        await _db.SaveChangesAsync();

        // Si el dictamen de calidad es APROBADO, registrar automáticamente el movimiento de entrada e inventario con lote
        if (dictamenEnum == DictamenCalidad.Aprobado)
        {
            await _movimientoService.RegistrarEntradaAsync(
                productoId: req.ProductoId,
                almacenId: req.AlmacenId,
                cantidad: req.CantidadRecibida,
                usuarioId: usuarioId,
                nota: $"Recepción Materia Prima / Calidad Aprobada (Guía: {req.NumeroGuiaFactura ?? "S/N"} - Proveedor: {req.Proveedor})",
                fecha: DateTime.UtcNow,
                numeroLote: req.NumeroLote.Trim(),
                fechaVencimiento: req.FechaVencimiento?.ToUniversalTime()
            );
        }

        return CreatedAtAction(nameof(Listar), new { id = recepcion.Id }, new
        {
            recepcion.Id,
            status = "ok",
            ingresadoAInventario = dictamenEnum == DictamenCalidad.Aprobado
        });
    }
}
