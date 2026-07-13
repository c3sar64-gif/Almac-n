using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Enums como texto en JSON (el frontend envía/recibe "Admin", "Entrada", etc.)
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<MovimientoService>();

var jwt = builder.Configuration.GetSection("Jwt");
var origenesPermitidos = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

// En producción es obligatorio configurar secretos propios (env vars / secret manager).
if (builder.Environment.IsProduction())
{
    if (jwt["Key"] == "clave-desarrollo-cambiar-en-produccion-minimo-32-chars")
        throw new InvalidOperationException("Jwt:Key de desarrollo detectada: configura una clave propia para producción.");
    if (string.IsNullOrEmpty(builder.Configuration["Seed:AdminPassword"]))
        throw new InvalidOperationException("Configura Seed:AdminPassword para producción.");
    if (origenesPermitidos.Length == 0 || origenesPermitidos.Any(or => or.Contains("localhost")))
        throw new InvalidOperationException("Configura Cors:AllowedOrigins con el dominio real del frontend para producción.");
}

builder.Services.AddSingleton(new TokenService(
    jwt["Key"]!, jwt["Issuer"]!, int.Parse(jwt["ExpiraMinutos"]!)));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = jwt["Issuer"],
        ValidAudience = jwt["Issuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origenesPermitidos).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Seed: primer usuario admin si la tabla está vacía.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    if (!db.Usuarios.Any())
    {
        db.Usuarios.Add(new Usuario
        {
            Email = "admin@almacen.local",
            Nombre = "Administrador",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                builder.Configuration["Seed:AdminPassword"] ?? "Admin123!"),
            Rol = Rol.Admin,
        });
        db.SaveChanges();
    }
}

app.UseMiddleware<SistemaAlmacen.Api.ManejadorErrores>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
