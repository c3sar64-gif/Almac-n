# Backend Sistema de Almacenes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API REST en ASP.NET Core para gestión de inventario multi-almacén con autenticación JWT, según el spec `docs/superpowers/specs/2026-07-13-sistema-almacenes-design.md`.

**Architecture:** Solución .NET 8 con tres proyectos: `SistemaAlmacen.Core` (entidades y lógica de negocio), `SistemaAlmacen.Infrastructure` (EF Core + PostgreSQL), `SistemaAlmacen.Api` (controladores REST + JWT). Las existencias solo cambian a través de `MovimientoService` dentro de transacciones de BD. Tests con xUnit usando SQLite in-memory (soporta transacciones reales, a diferencia del provider InMemory).

**Tech Stack:** .NET 8, ASP.NET Core Web API, EF Core 8, Npgsql, BCrypt.Net-Next, JWT Bearer, xUnit, SQLite (solo tests), PostgreSQL 16 (Docker).

**Nota de nombres:** Los proyectos se llaman `SistemaAlmacen.*` (no `Almacen.*`) para evitar el conflicto C# entre el namespace `Almacen` y la entidad `Almacen`.

**Directorio de trabajo:** todos los comandos se ejecutan desde `backend/` salvo que se indique otra ruta. Shell: PowerShell.

---

### Task 1: Scaffold de la solución

**Files:**
- Create: `backend/SistemaAlmacen.sln`, `backend/src/SistemaAlmacen.Core/`, `backend/src/SistemaAlmacen.Infrastructure/`, `backend/src/SistemaAlmacen.Api/`, `backend/tests/SistemaAlmacen.Tests/`
- Create: `.gitignore` (raíz del repo)

- [ ] **Step 1: Crear proyectos y solución**

```powershell
mkdir backend; cd backend
dotnet new sln -n SistemaAlmacen
dotnet new classlib -n SistemaAlmacen.Core -o src/SistemaAlmacen.Core -f net8.0
dotnet new classlib -n SistemaAlmacen.Infrastructure -o src/SistemaAlmacen.Infrastructure -f net8.0
dotnet new webapi -n SistemaAlmacen.Api -o src/SistemaAlmacen.Api -f net8.0 --use-controllers
dotnet new xunit -n SistemaAlmacen.Tests -o tests/SistemaAlmacen.Tests -f net8.0
dotnet sln add src/SistemaAlmacen.Core src/SistemaAlmacen.Infrastructure src/SistemaAlmacen.Api tests/SistemaAlmacen.Tests
```

- [ ] **Step 2: Referencias entre proyectos**

```powershell
dotnet add src/SistemaAlmacen.Infrastructure reference src/SistemaAlmacen.Core
dotnet add src/SistemaAlmacen.Api reference src/SistemaAlmacen.Core src/SistemaAlmacen.Infrastructure
dotnet add tests/SistemaAlmacen.Tests reference src/SistemaAlmacen.Core src/SistemaAlmacen.Infrastructure
```

- [ ] **Step 3: Paquetes NuGet**

```powershell
dotnet add src/SistemaAlmacen.Infrastructure package Microsoft.EntityFrameworkCore --version 8.0.*
dotnet add src/SistemaAlmacen.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.*
dotnet add src/SistemaAlmacen.Infrastructure package BCrypt.Net-Next
dotnet add src/SistemaAlmacen.Api package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.*
dotnet add src/SistemaAlmacen.Api package Microsoft.EntityFrameworkCore.Design --version 8.0.*
dotnet add tests/SistemaAlmacen.Tests package Microsoft.EntityFrameworkCore.Sqlite --version 8.0.*
```

- [ ] **Step 4: Borrar archivos de ejemplo y verificar build**

Borrar `src/SistemaAlmacen.Core/Class1.cs`, `src/SistemaAlmacen.Infrastructure/Class1.cs`, y en `SistemaAlmacen.Api`: `WeatherForecast.cs` y `Controllers/WeatherForecastController.cs`.

Run: `dotnet build`
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: .gitignore en la raíz del repo**

Crear `.gitignore` (raíz, junto a `docs/`):

```gitignore
bin/
obj/
*.user
appsettings.Development.json
node_modules/
dist/
.vs/
```

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "chore: scaffold de la solucion backend .NET 8"
```

---

### Task 2: Entidades del dominio

**Files:**
- Create: `backend/src/SistemaAlmacen.Core/Entidades/Producto.cs`
- Create: `backend/src/SistemaAlmacen.Core/Entidades/Almacen.cs`
- Create: `backend/src/SistemaAlmacen.Core/Entidades/Existencia.cs`
- Create: `backend/src/SistemaAlmacen.Core/Entidades/Movimiento.cs`
- Create: `backend/src/SistemaAlmacen.Core/Entidades/Usuario.cs`
- Create: `backend/src/SistemaAlmacen.Core/ReglaNegocioException.cs`

- [ ] **Step 1: Crear las entidades**

`Producto.cs`:
```csharp
namespace SistemaAlmacen.Core.Entidades;

public class Producto
{
    public int Id { get; set; }
    public string Sku { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
    public string UnidadMedida { get; set; } = "pieza";
    public bool Activo { get; set; } = true;
}
```

`Almacen.cs`:
```csharp
namespace SistemaAlmacen.Core.Entidades;

public class Almacen
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string? Ubicacion { get; set; }
    public bool Activo { get; set; } = true;
}
```

`Existencia.cs`:
```csharp
namespace SistemaAlmacen.Core.Entidades;

public class Existencia
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }
    public int AlmacenId { get; set; }
    public Almacen? Almacen { get; set; }
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
}
```

`Movimiento.cs`:
```csharp
namespace SistemaAlmacen.Core.Entidades;

public enum TipoMovimiento { Entrada = 1, Salida = 2, Transferencia = 3 }

public class Movimiento
{
    public int Id { get; set; }
    public TipoMovimiento Tipo { get; set; }
    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }
    public int? AlmacenOrigenId { get; set; }
    public Almacen? AlmacenOrigen { get; set; }
    public int? AlmacenDestinoId { get; set; }
    public Almacen? AlmacenDestino { get; set; }
    public decimal Cantidad { get; set; }
    public DateTime Fecha { get; set; }
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public string? Nota { get; set; }
}
```

`Usuario.cs`:
```csharp
namespace SistemaAlmacen.Core.Entidades;

public enum Rol { Admin = 1, Operador = 2 }

public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Rol Rol { get; set; } = Rol.Operador;
    public bool Activo { get; set; } = true;
}
```

`ReglaNegocioException.cs`:
```csharp
namespace SistemaAlmacen.Core;

/// Error de regla de negocio: el middleware lo traduce a HTTP 400.
public class ReglaNegocioException : Exception
{
    public ReglaNegocioException(string mensaje) : base(mensaje) { }
}
```

- [ ] **Step 2: Verificar build**

Run: `dotnet build`
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: entidades del dominio"
```

---

### Task 3: DbContext, PostgreSQL con Docker y migración inicial

**Files:**
- Create: `backend/src/SistemaAlmacen.Infrastructure/AppDbContext.cs`
- Create: `docker-compose.yml` (raíz del repo)
- Modify: `backend/src/SistemaAlmacen.Api/appsettings.json`

- [ ] **Step 1: Crear el DbContext**

`AppDbContext.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Almacen> Almacenes => Set<Almacen>();
    public DbSet<Existencia> Existencias => Set<Existencia>();
    public DbSet<Movimiento> Movimientos => Set<Movimiento>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Producto>().HasIndex(p => p.Sku).IsUnique();
        mb.Entity<Usuario>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Existencia>().HasIndex(e => new { e.ProductoId, e.AlmacenId }).IsUnique();
        mb.Entity<Existencia>().Property(e => e.Cantidad).HasPrecision(18, 3);
        mb.Entity<Existencia>().Property(e => e.StockMinimo).HasPrecision(18, 3);
        mb.Entity<Movimiento>().Property(m => m.Cantidad).HasPrecision(18, 3);
        mb.Entity<Movimiento>()
            .HasOne(m => m.AlmacenOrigen).WithMany()
            .HasForeignKey(m => m.AlmacenOrigenId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Movimiento>()
            .HasOne(m => m.AlmacenDestino).WithMany()
            .HasForeignKey(m => m.AlmacenDestinoId).OnDelete(DeleteBehavior.Restrict);
    }
}
```

- [ ] **Step 2: docker-compose.yml en la raíz del repo**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: almacen
      POSTGRES_PASSWORD: almacen_dev
      POSTGRES_DB: almacen
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Levantar la BD: `docker compose up -d` (desde la raíz del repo).
Si no hay Docker disponible: instalar PostgreSQL 16 local y crear usuario/BD `almacen` con la misma contraseña.

- [ ] **Step 3: Cadena de conexión y registro del DbContext**

En `appsettings.json` agregar al objeto raíz:

```json
"ConnectionStrings": {
  "Default": "Host=localhost;Database=almacen;Username=almacen;Password=almacen_dev"
},
"Jwt": {
  "Key": "clave-desarrollo-cambiar-en-produccion-minimo-32-chars",
  "Issuer": "SistemaAlmacen",
  "ExpiraMinutos": 480
}
```

En `Program.cs` (después de `var builder = ...`):

```csharp
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
```

con `using Microsoft.EntityFrameworkCore;` y `using SistemaAlmacen.Infrastructure;` arriba.

- [ ] **Step 4: Migración inicial y aplicarla**

```powershell
dotnet tool install -g dotnet-ef
dotnet ef migrations add Inicial -p src/SistemaAlmacen.Infrastructure -s src/SistemaAlmacen.Api
dotnet ef database update -p src/SistemaAlmacen.Infrastructure -s src/SistemaAlmacen.Api
```

Expected: `Done.` sin errores (requiere la BD de Docker corriendo).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: DbContext, PostgreSQL y migracion inicial"
```

---

### Task 4: MovimientoService — Entrada (TDD)

**Files:**
- Create: `backend/tests/SistemaAlmacen.Tests/TestDb.cs`
- Create: `backend/tests/SistemaAlmacen.Tests/MovimientoServiceTests.cs`
- Create: `backend/src/SistemaAlmacen.Infrastructure/MovimientoService.cs`

`MovimientoService` va en **Infrastructure** (no en Core) porque depende de `AppDbContext`.

- [ ] **Step 1: Helper de BD de prueba**

`tests/SistemaAlmacen.Tests/TestDb.cs`:
```csharp
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Tests;

public static class TestDb
{
    // SQLite in-memory: la conexión debe permanecer abierta mientras viva el contexto.
    public static AppDbContext Crear()
    {
        var conn = new SqliteConnection("DataSource=:memory:");
        conn.Open();
        var opts = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options;
        var db = new AppDbContext(opts);
        db.Database.EnsureCreated();
        return db;
    }
}
```

- [ ] **Step 2: Test que falla — entrada aumenta stock**

`tests/SistemaAlmacen.Tests/MovimientoServiceTests.cs`:
```csharp
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;
using Xunit;

namespace SistemaAlmacen.Tests;

public class MovimientoServiceTests
{
    private static (AppDbContext db, Producto p, Almacen a1, Almacen a2, Usuario u) Preparar()
    {
        var db = TestDb.Crear();
        var p = new Producto { Sku = "P-001", Nombre = "Tornillo" };
        var a1 = new Almacen { Nombre = "Central" };
        var a2 = new Almacen { Nombre = "Sucursal" };
        var u = new Usuario { Email = "op@test.com", Nombre = "Op", PasswordHash = "x" };
        db.AddRange(p, a1, a2, u);
        db.SaveChanges();
        return (db, p, a1, a2, u);
    }

    [Fact]
    public async Task Entrada_aumenta_el_stock()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);

        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        var ex = db.Existencias.Single(e => e.ProductoId == p.Id && e.AlmacenId == a1.Id);
        Assert.Equal(10, ex.Cantidad);
    }
}
```

- [ ] **Step 3: Verificar que falla**

Run: `dotnet test`
Expected: error de compilación `MovimientoService` no existe (equivale a test rojo).

- [ ] **Step 4: Implementación mínima**

`src/SistemaAlmacen.Infrastructure/MovimientoService.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class MovimientoService
{
    private readonly AppDbContext _db;
    public MovimientoService(AppDbContext db) { _db = db; }

    public async Task<Movimiento> RegistrarEntradaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        await using var tx = await _db.Database.BeginTransactionAsync();
        var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
        existencia.Cantidad += cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Entrada, ProductoId = productoId,
            AlmacenDestinoId = almacenId, Cantidad = cantidad,
            UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }

    private static void ValidarCantidad(decimal cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad debe ser mayor a cero.");
    }

    private async Task<Existencia> ObtenerOCrearExistenciaAsync(int productoId, int almacenId)
    {
        var ex = await _db.Existencias
            .FirstOrDefaultAsync(e => e.ProductoId == productoId && e.AlmacenId == almacenId);
        if (ex is null)
        {
            ex = new Existencia { ProductoId = productoId, AlmacenId = almacenId, Cantidad = 0 };
            _db.Existencias.Add(ex);
        }
        return ex;
    }
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `dotnet test`
Expected: `Passed!` (1 test).

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: MovimientoService.RegistrarEntrada con TDD"
```

---

### Task 5: MovimientoService — Salida con validación de stock (TDD)

**Files:**
- Modify: `backend/tests/SistemaAlmacen.Tests/MovimientoServiceTests.cs`
- Modify: `backend/src/SistemaAlmacen.Infrastructure/MovimientoService.cs`

- [ ] **Step 1: Tests que fallan**

Agregar a `MovimientoServiceTests.cs`:
```csharp
    [Fact]
    public async Task Salida_disminuye_el_stock()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await svc.RegistrarSalidaAsync(p.Id, a1.Id, 4, u.Id);

        var ex = db.Existencias.Single(e => e.ProductoId == p.Id && e.AlmacenId == a1.Id);
        Assert.Equal(6, ex.Cantidad);
    }

    [Fact]
    public async Task Salida_con_stock_insuficiente_lanza_error()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 3, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarSalidaAsync(p.Id, a1.Id, 5, u.Id));
    }
```

- [ ] **Step 2: Verificar que fallan**

Run: `dotnet test`
Expected: error de compilación `RegistrarSalidaAsync` no existe.

- [ ] **Step 3: Implementar**

Agregar a `MovimientoService`:
```csharp
    public async Task<Movimiento> RegistrarSalidaAsync(
        int productoId, int almacenId, decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        await using var tx = await _db.Database.BeginTransactionAsync();
        var existencia = await ObtenerOCrearExistenciaAsync(productoId, almacenId);
        if (existencia.Cantidad < cantidad)
            throw new ReglaNegocioException(
                $"Stock insuficiente: hay {existencia.Cantidad} y se pidieron {cantidad}.");
        existencia.Cantidad -= cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Salida, ProductoId = productoId,
            AlmacenOrigenId = almacenId, Cantidad = cantidad,
            UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }
```

- [ ] **Step 4: Verificar que pasan**

Run: `dotnet test`
Expected: `Passed!` (3 tests).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: salida de stock con validacion de existencias"
```

---

### Task 6: MovimientoService — Transferencia atómica (TDD)

**Files:**
- Modify: `backend/tests/SistemaAlmacen.Tests/MovimientoServiceTests.cs`
- Modify: `backend/src/SistemaAlmacen.Infrastructure/MovimientoService.cs`

- [ ] **Step 1: Tests que fallan**

Agregar a `MovimientoServiceTests.cs`:
```csharp
    [Fact]
    public async Task Transferencia_mueve_stock_entre_almacenes()
    {
        var (db, p, a1, a2, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a2.Id, 4, u.Id);

        Assert.Equal(6, db.Existencias.Single(e => e.AlmacenId == a1.Id).Cantidad);
        Assert.Equal(4, db.Existencias.Single(e => e.AlmacenId == a2.Id).Cantidad);
    }

    [Fact]
    public async Task Transferencia_sin_stock_no_cambia_nada()
    {
        var (db, p, a1, a2, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 2, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a2.Id, 5, u.Id));

        Assert.Equal(2, db.Existencias.Single(e => e.AlmacenId == a1.Id).Cantidad);
        Assert.False(db.Existencias.Any(e => e.AlmacenId == a2.Id));
        Assert.Equal(1, db.Movimientos.Count()); // solo la entrada inicial
    }

    [Fact]
    public async Task Transferencia_al_mismo_almacen_lanza_error()
    {
        var (db, p, a1, _, u) = Preparar();
        var svc = new MovimientoService(db);
        await svc.RegistrarEntradaAsync(p.Id, a1.Id, 10, u.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => svc.RegistrarTransferenciaAsync(p.Id, a1.Id, a1.Id, 5, u.Id));
    }
```

- [ ] **Step 2: Verificar que fallan**

Run: `dotnet test`
Expected: error de compilación `RegistrarTransferenciaAsync` no existe.

- [ ] **Step 3: Implementar**

Agregar a `MovimientoService`:
```csharp
    public async Task<Movimiento> RegistrarTransferenciaAsync(
        int productoId, int almacenOrigenId, int almacenDestinoId,
        decimal cantidad, int usuarioId, string? nota = null)
    {
        ValidarCantidad(cantidad);
        if (almacenOrigenId == almacenDestinoId)
            throw new ReglaNegocioException("El almacén de origen y destino no pueden ser el mismo.");
        await using var tx = await _db.Database.BeginTransactionAsync();
        var origen = await ObtenerOCrearExistenciaAsync(productoId, almacenOrigenId);
        if (origen.Cantidad < cantidad)
            throw new ReglaNegocioException(
                $"Stock insuficiente en origen: hay {origen.Cantidad} y se pidieron {cantidad}.");
        var destino = await ObtenerOCrearExistenciaAsync(productoId, almacenDestinoId);
        origen.Cantidad -= cantidad;
        destino.Cantidad += cantidad;
        var mov = new Movimiento
        {
            Tipo = TipoMovimiento.Transferencia, ProductoId = productoId,
            AlmacenOrigenId = almacenOrigenId, AlmacenDestinoId = almacenDestinoId,
            Cantidad = cantidad, UsuarioId = usuarioId, Nota = nota, Fecha = DateTime.UtcNow
        };
        _db.Movimientos.Add(mov);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return mov;
    }
```

Nota: cuando la validación lanza antes de `SaveChangesAsync`, la transacción se descarta al salir del `await using` — nada se persiste. El test `Transferencia_sin_stock_no_cambia_nada` verifica exactamente eso.

- [ ] **Step 4: Verificar que pasan**

Run: `dotnet test`
Expected: `Passed!` (6 tests).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: transferencia atomica entre almacenes"
```

---

### Task 7: Autenticación JWT y seed del admin

**Files:**
- Create: `backend/src/SistemaAlmacen.Infrastructure/TokenService.cs`
- Create: `backend/src/SistemaAlmacen.Api/Controllers/AuthController.cs`
- Modify: `backend/src/SistemaAlmacen.Api/Program.cs`

- [ ] **Step 1: TokenService**

`TokenService.cs`:
```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class TokenService
{
    private readonly string _key;
    private readonly string _issuer;
    private readonly int _expiraMinutos;

    public TokenService(string key, string issuer, int expiraMinutos)
    {
        _key = key; _issuer = issuer; _expiraMinutos = expiraMinutos;
    }

    public string Generar(Usuario u)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
            new Claim(ClaimTypes.Name, u.Nombre),
            new Claim(ClaimTypes.Role, u.Rol.ToString()),
        };
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer, audience: _issuer, claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expiraMinutos), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

Requiere este paquete en Infrastructure (JwtBearer solo está en Api):

```powershell
dotnet add src/SistemaAlmacen.Infrastructure package System.IdentityModel.Tokens.Jwt
```

- [ ] **Step 2: AuthController**

`Controllers/AuthController.cs`:
```csharp
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
            rol = usuario.Rol.ToString()
        });
    }
}
```

- [ ] **Step 3: Configurar JWT y seed en Program.cs**

Reemplazar `Program.cs` completo:
```csharp
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

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

- [ ] **Step 4: Fijar el puerto de la API**

En `src/SistemaAlmacen.Api/Properties/launchSettings.json`, en el perfil `http`, dejar `"applicationUrl": "http://localhost:5000"`.

- [ ] **Step 5: Probar login manualmente**

```powershell
dotnet run --project src/SistemaAlmacen.Api --launch-profile http
# En otra terminal:
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@almacen.local","password":"Admin123!"}'
```

Expected: JSON con `token`, `nombre: Administrador`, `rol: Admin`. Detener la API después.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: autenticacion JWT, login y seed de admin"
```

---

### Task 8: Middleware de errores consistente

**Files:**
- Create: `backend/src/SistemaAlmacen.Api/ManejadorErrores.cs`
- Modify: `backend/src/SistemaAlmacen.Api/Program.cs`

- [ ] **Step 1: Middleware**

`ManejadorErrores.cs`:
```csharp
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
```

- [ ] **Step 2: Registrarlo en Program.cs**

Justo antes de `app.UseCors();`:
```csharp
app.UseMiddleware<SistemaAlmacen.Api.ManejadorErrores>();
```

- [ ] **Step 3: Verificar build y tests**

Run: `dotnet build && dotnet test`
Expected: build OK, 6 tests en verde.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: middleware de errores con JSON consistente"
```

---

### Task 9: CRUD de Productos, Almacenes y Usuarios

**Files:**
- Create: `backend/src/SistemaAlmacen.Api/Controllers/ProductosController.cs`
- Create: `backend/src/SistemaAlmacen.Api/Controllers/AlmacenesController.cs`
- Create: `backend/src/SistemaAlmacen.Api/Controllers/UsuariosController.cs`

- [ ] **Step 1: ProductosController (autenticado)**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

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
        (p.Sku, p.Nombre, p.Descripcion, p.Categoria, p.UnidadMedida, p.Activo) =
            (datos.Sku, datos.Nombre, datos.Descripcion, datos.Categoria, datos.UnidadMedida, datos.Activo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
```

(No hay DELETE: los productos se desactivan con `Activo = false` para conservar el historial.)

- [ ] **Step 2: AlmacenesController (escritura solo Admin)**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/almacenes")]
[Authorize]
public class AlmacenesController : ControllerBase
{
    private readonly AppDbContext _db;
    public AlmacenesController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IEnumerable<Almacen>> Listar() =>
        await _db.Almacenes.OrderBy(a => a.Nombre).ToListAsync();

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Almacen>> Crear(Almacen almacen)
    {
        almacen.Id = 0;
        _db.Almacenes.Add(almacen);
        await _db.SaveChangesAsync();
        return Created($"api/almacenes/{almacen.Id}", almacen);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Actualizar(int id, Almacen datos)
    {
        var a = await _db.Almacenes.FindAsync(id);
        if (a is null) return NotFound();
        (a.Nombre, a.Ubicacion, a.Activo) = (datos.Nombre, datos.Ubicacion, datos.Activo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 3: UsuariosController (solo Admin)**

```csharp
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
```

- [ ] **Step 4: Verificar build**

Run: `dotnet build`
Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: CRUD de productos, almacenes y usuarios"
```

---

### Task 10: Movimientos y Existencias (endpoints)

**Files:**
- Create: `backend/src/SistemaAlmacen.Api/Controllers/MovimientosController.cs`
- Create: `backend/src/SistemaAlmacen.Api/Controllers/ExistenciasController.cs`

- [ ] **Step 1: MovimientosController**

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Core.Entidades;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

public record MovimientoRequest(
    int ProductoId, decimal Cantidad, string? Nota,
    int? AlmacenOrigenId, int? AlmacenDestinoId);

[ApiController]
[Route("api/movimientos")]
[Authorize]
public class MovimientosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MovimientoService _svc;

    public MovimientosController(AppDbContext db, MovimientoService svc)
    {
        _db = db; _svc = svc;
    }

    private int UsuarioId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("entrada")]
    public async Task<ActionResult<Movimiento>> Entrada(MovimientoRequest r) =>
        await _svc.RegistrarEntradaAsync(r.ProductoId, r.AlmacenDestinoId!.Value, r.Cantidad, UsuarioId, r.Nota);

    [HttpPost("salida")]
    public async Task<ActionResult<Movimiento>> Salida(MovimientoRequest r) =>
        await _svc.RegistrarSalidaAsync(r.ProductoId, r.AlmacenOrigenId!.Value, r.Cantidad, UsuarioId, r.Nota);

    [HttpPost("transferencia")]
    public async Task<ActionResult<Movimiento>> Transferencia(MovimientoRequest r) =>
        await _svc.RegistrarTransferenciaAsync(
            r.ProductoId, r.AlmacenOrigenId!.Value, r.AlmacenDestinoId!.Value, r.Cantidad, UsuarioId, r.Nota);

    // Historial con filtros: sirve también como reporte de movimientos por rango de fechas.
    [HttpGet]
    public async Task<IEnumerable<object>> Listar(
        DateTime? desde, DateTime? hasta, int? productoId, int? almacenId)
    {
        var q = _db.Movimientos.AsQueryable();
        if (desde is not null) q = q.Where(m => m.Fecha >= desde.Value.ToUniversalTime());
        if (hasta is not null) q = q.Where(m => m.Fecha <= hasta.Value.ToUniversalTime());
        if (productoId is not null) q = q.Where(m => m.ProductoId == productoId);
        if (almacenId is not null)
            q = q.Where(m => m.AlmacenOrigenId == almacenId || m.AlmacenDestinoId == almacenId);
        return await q.OrderByDescending(m => m.Fecha).Take(500)
            .Select(m => new
            {
                m.Id, Tipo = m.Tipo.ToString(), m.Fecha, m.Cantidad, m.Nota,
                Producto = new { m.Producto!.Id, m.Producto.Sku, m.Producto.Nombre },
                AlmacenOrigen = m.AlmacenOrigen == null ? null : m.AlmacenOrigen.Nombre,
                AlmacenDestino = m.AlmacenDestino == null ? null : m.AlmacenDestino.Nombre,
                Usuario = m.Usuario!.Nombre,
            }).ToListAsync();
    }
}
```

- [ ] **Step 2: ExistenciasController**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaAlmacen.Infrastructure;

namespace SistemaAlmacen.Api.Controllers;

[ApiController]
[Route("api/existencias")]
[Authorize]
public class ExistenciasController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExistenciasController(AppDbContext db) { _db = db; }

    // Reporte de existencias actuales; bajoMinimo=true filtra alertas de stock.
    [HttpGet]
    public async Task<IEnumerable<object>> Listar(int? almacenId, bool bajoMinimo = false)
    {
        var q = _db.Existencias.AsQueryable();
        if (almacenId is not null) q = q.Where(e => e.AlmacenId == almacenId);
        if (bajoMinimo) q = q.Where(e => e.Cantidad < e.StockMinimo);
        return await q
            .OrderBy(e => e.Producto!.Nombre)
            .Select(e => new
            {
                e.Id, e.Cantidad, e.StockMinimo,
                BajoMinimo = e.Cantidad < e.StockMinimo,
                Producto = new { e.Producto!.Id, e.Producto.Sku, e.Producto.Nombre, e.Producto.UnidadMedida },
                Almacen = new { e.Almacen!.Id, e.Almacen.Nombre },
            }).ToListAsync();
    }

    [HttpPut("{id:int}/stock-minimo")]
    public async Task<IActionResult> ActualizarStockMinimo(int id, [FromBody] decimal stockMinimo)
    {
        var e = await _db.Existencias.FindAsync(id);
        if (e is null) return NotFound();
        e.StockMinimo = stockMinimo;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 3: Verificar build y tests**

Run: `dotnet build && dotnet test`
Expected: build OK, 6 tests en verde.

- [ ] **Step 4: Smoke test end-to-end**

```powershell
dotnet run --project src/SistemaAlmacen.Api --launch-profile http
# En otra terminal:
$r = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@almacen.local","password":"Admin123!"}'
$h = @{ Authorization = "Bearer $($r.token)" }
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/almacenes -Headers $h -ContentType "application/json" -Body '{"nombre":"Central"}'
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/productos -Headers $h -ContentType "application/json" -Body '{"sku":"P-001","nombre":"Tornillo 5mm"}'
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/movimientos/entrada -Headers $h -ContentType "application/json" -Body '{"productoId":1,"almacenDestinoId":1,"cantidad":100}'
Invoke-RestMethod -Uri http://localhost:5000/api/existencias -Headers $h
```

Expected: la última llamada muestra 100 unidades de `P-001` en `Central`. Detener la API después.

- [ ] **Step 5: Commit final**

```powershell
git add -A
git commit -m "feat: endpoints de movimientos y existencias"
```

---

## Verificación final del plan

- `dotnet test` → 6 tests en verde.
- Smoke test del Task 10 funciona end-to-end.
- El backend queda listo para que el frontend (plan separado) lo consuma en `http://localhost:5000`.
