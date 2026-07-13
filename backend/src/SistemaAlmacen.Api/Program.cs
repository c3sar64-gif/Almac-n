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
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

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
