using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/archivos")]
[Authorize]
public class ArchivosController : ControllerBase
{
    [HttpPost("subir")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubirArchivo([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No se proporcionó ningún archivo." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var nuevoNombre = $"{Guid.NewGuid()}{extension}";
        var keyDestino = $"comprobantes/{nuevoNombre}";

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
                    ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType
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
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error S3 upload: {ex.Message}");
            }
        }

        // Fallback local storage
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "comprobantes");
        if (!Directory.Exists(uploadsDir))
        {
            Directory.CreateDirectory(uploadsDir);
        }

        var filePath = Path.Combine(uploadsDir, nuevoNombre);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var localUrl = $"/uploads/comprobantes/{nuevoNombre}";
        return Ok(new { url = localUrl });
    }
}
