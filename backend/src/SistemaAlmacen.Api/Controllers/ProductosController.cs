using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;
using Amazon.S3;
using Amazon.S3.Model;

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
        (p.Sku, p.Nombre, p.Descripcion, p.Categoria, p.UnidadMedida, p.Activo, p.ImagenUrl) =
            (datos.Sku, datos.Nombre, datos.Descripcion, datos.Categoria, datos.UnidadMedida, datos.Activo, datos.ImagenUrl);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("upload-imagen")]
    public async Task<IActionResult> UploadImagen(IFormFile file, [FromQuery] string? categoria, [FromQuery] string? sku)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No se proporcionó ningún archivo." });

        var extension = Path.GetExtension(file.FileName);
        var nuevoNombre = $"{Guid.NewGuid()}{extension}";

        var categoriaSlug = Slugify(categoria);
        var skuFolder = !string.IsNullOrWhiteSpace(sku) ? $"{Slugify(sku)}/" : "";
        var keyDestino = $"productos/{categoriaSlug}/{skuFolder}{nuevoNombre}";

        var s3AccessKey = Environment.GetEnvironmentVariable("SUPABASE_S3_ACCESS_KEY") ?? "cf4528ea82aedab3ebdf2eb26bd4d3dd";
        var s3SecretKey = Environment.GetEnvironmentVariable("SUPABASE_S3_SECRET_KEY") ?? "69281575b5c5db6ca7ae4682d1084975c0ad9819df2e3f3259c7f0a501ec80bb";
        var s3Endpoint = Environment.GetEnvironmentVariable("SUPABASE_S3_ENDPOINT") ?? "https://spfbypyhdsgbekohihxd.storage.supabase.co/storage/v1/s3";
        var s3Region = Environment.GetEnvironmentVariable("SUPABASE_S3_REGION") ?? "sa-east-1";
        var bucketName = Environment.GetEnvironmentVariable("SUPABASE_S3_BUCKET") ?? "media_almac-n";

        if (!string.IsNullOrEmpty(s3AccessKey) && !string.IsNullOrEmpty(s3SecretKey) && !string.IsNullOrEmpty(s3Endpoint))
        {
            try
            {
                var config = new AmazonS3Config
                {
                    ServiceURL = s3Endpoint,
                    ForcePathStyle = true
                };

                if (!string.IsNullOrEmpty(s3Region))
                {
                    config.AuthenticationRegion = s3Region;
                }

                using var s3Client = new AmazonS3Client(s3AccessKey, s3SecretKey, config);

                using var stream = file.OpenReadStream();
                var putRequest = new PutObjectRequest
                {
                    BucketName = bucketName,
                    Key = keyDestino,
                    InputStream = stream,
                    ContentType = file.ContentType
                };

                var response = await s3Client.PutObjectAsync(putRequest);

                if (response.HttpStatusCode == System.Net.HttpStatusCode.OK)
                {
                    var projectId = "spfbypyhdsgbekohihxd";
                    try
                    {
                        var uri = new Uri(s3Endpoint);
                        var hostParts = uri.Host.Split('.');
                        if (hostParts.Length > 0 && !hostParts[0].Contains("storage"))
                        {
                            projectId = hostParts[0];
                        }
                    }
                    catch {}

                    var publicUrl = $"https://{projectId}.supabase.co/storage/v1/object/public/{bucketName}/{keyDestino}";
                    return Ok(new { url = publicUrl });
                }
                else
                {
                    return BadRequest(new { error = $"Error al subir a Supabase S3 (HTTP {(int)response.HttpStatusCode})" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Error de conexión con S3: {ex.Message}" });
            }
        }
        else
        {
            var folderName = !string.IsNullOrWhiteSpace(sku) ? Slugify(sku) : "";
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "productos", categoriaSlug, folderName);
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            var filePath = Path.Combine(uploadsDir, nuevoNombre);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var localUrl = $"/uploads/productos/{categoriaSlug}/{skuFolder}{nuevoNombre}";
            return Ok(new { url = localUrl });
        }
    }

    private static string Slugify(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "general";
        var str = text.ToLowerInvariant();
        str = System.Text.RegularExpressions.Regex.Replace(str, @"[^a-z0-9\s-]", "");
        str = System.Text.RegularExpressions.Regex.Replace(str, @"[\s-]+", "-").Trim('-');
        return string.IsNullOrEmpty(str) ? "general" : str;
    }
}
