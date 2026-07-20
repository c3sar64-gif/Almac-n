using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Cargar variables de entorno desde el archivo .env si existe en el directorio de trabajo o padres
var currentDir = Directory.GetCurrentDirectory();
while (!string.IsNullOrEmpty(currentDir))
{
    var envPath = Path.Combine(currentDir, ".env");
    if (File.Exists(envPath))
    {
        foreach (var line in File.ReadAllLines(envPath))
        {
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
            var parts = line.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = parts[0].Trim();
                var val = parts[1].Trim();
                if (val.StartsWith("\"") && val.EndsWith("\"") && val.Length >= 2)
                {
                    val = val[1..^1];
                }
                Environment.SetEnvironmentVariable(key, val);
            }
        }
        break;
    }
    currentDir = Directory.GetParent(currentDir)?.FullName;
}

var builder = WebApplication.CreateBuilder(args);

// Enums como texto en JSON (el frontend envía/recibe "Admin", "Entrada", etc.)
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<AppDbContext>(o =>
{
    var rawConnection = Environment.GetEnvironmentVariable("DATABASE_URL")
        ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
        ?? builder.Configuration.GetConnectionString("Default");

    var connectionString = ParsePostgresConnectionString(rawConnection);

    o.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
    });
});

static string ParsePostgresConnectionString(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw)) return "";

    // Si viene en formato URL (postgres://user:pass@host:port/db o postgresql://)
    if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(raw);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var db = uri.AbsolutePath.TrimStart('/');

        return $"Host={host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
    }

    return raw;
}

builder.Services.AddScoped<MovimientoService>();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
             ?? jwtSection["Key"]
             ?? "clave-desarrollo-cambiar-en-produccion-minimo-32-chars";

if (jwtKey == "clave-desarrollo-cambiar-en-produccion-minimo-32-chars")
{
    jwtKey = "ProduccionClaveSeguraSistemaAlmacenOvoPlus2026_987654321_Key";
}

var jwtIssuer = jwtSection["Issuer"] ?? "SistemaAlmacen";
var jwtExpiraMinutos = int.TryParse(jwtSection["ExpiraMinutos"], out var min) ? min : 480;

var adminPass = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD")
                ?? builder.Configuration["Seed:AdminPassword"]
                ?? "Admin123!";

var envAllowedOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
var origenesPermitidos = !string.IsNullOrEmpty(envAllowedOrigins)
    ? envAllowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    : builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddSingleton(new TokenService(jwtKey, jwtIssuer, jwtExpiraMinutos));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtIssuer,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();
app.UseMiddleware<SistemaAlmacen.Api.ManejadorErrores>();
app.UseStaticFiles();

// Seed & Auto-Migrate DB en segundo plano / inicio tolerante a fallos
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE \"Productos\" ADD COLUMN IF NOT EXISTS \"ImagenUrl\" TEXT;");
        db.Database.ExecuteSqlRaw("ALTER TABLE \"Usuarios\" ADD COLUMN IF NOT EXISTS \"ModulosPermitidos\" TEXT NOT NULL DEFAULT 'productos,almacenes,movimientos,logistica,reportes,usuarios';");
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""TareasLogistica"" (
                ""Id"" INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                ""Titulo"" TEXT NOT NULL,
                ""Descripcion"" TEXT NULL,
                ""ChoferId"" INT NOT NULL REFERENCES ""Usuarios""(""Id"") ON DELETE RESTRICT,
                ""AlmacenOrigenId"" INT NULL REFERENCES ""Almacenes""(""Id"") ON DELETE RESTRICT,
                ""AlmacenDestinoId"" INT NULL REFERENCES ""Almacenes""(""Id"") ON DELETE RESTRICT,
                ""Estado"" INT NOT NULL DEFAULT 1,
                ""FechaAsignacion"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""FechaProgramada"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""HoraInicio"" TEXT NOT NULL DEFAULT '08:00',
                ""HoraFin"" TEXT NOT NULL DEFAULT '09:00',
                ""FechaCompletado"" TIMESTAMP WITH TIME ZONE NULL,
                ""NotasChofer"" TEXT NULL
            );
            ALTER TABLE ""TareasLogistica"" ADD COLUMN IF NOT EXISTS ""FechaProgramada"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE ""TareasLogistica"" ADD COLUMN IF NOT EXISTS ""HoraInicio"" TEXT NOT NULL DEFAULT '08:00';
            ALTER TABLE ""TareasLogistica"" ADD COLUMN IF NOT EXISTS ""HoraFin"" TEXT NOT NULL DEFAULT '09:00';
            ALTER TABLE ""TareasLogistica"" ADD COLUMN IF NOT EXISTS ""ComprobanteUrl"" TEXT NULL;
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error initializing DB tables: {ex.Message}");
    }

    if (!db.Usuarios.Any())
    {
        db.Usuarios.Add(new Usuario
        {
            Email = "admin@almacen.local",
            Nombre = "Administrador",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPass),
            Rol = Rol.Admin,
        });
        db.SaveChanges();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"[DB MIGRATION WARNING] No se pudo conectar a la base de datos PostgreSQL: {ex.Message}");
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// Necesario para WebApplicationFactory<Program> en los tests de integración
// (top-level statements generan una clase Program interna por defecto).
public partial class Program { }
