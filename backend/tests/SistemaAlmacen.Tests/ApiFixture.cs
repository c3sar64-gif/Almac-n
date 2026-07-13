using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SistemaAlmacen.Infrastructure;
using Xunit;

namespace SistemaAlmacen.Tests;

// BD de prueba real en Postgres local: se borra y recrea al inicio de la colección.
public class ApiFixture : WebApplicationFactory<Program>
{
    private const string ConexionPrueba =
        "Host=localhost;Database=almacen_test;Username=almacen;Password=almacen_dev";

    public ApiFixture()
    {
        // EnsureDeleted aquí, ANTES de que CreateClient() arranque el host: el
        // ConfigureServices de WebApplicationFactory corre demasiado tarde (el
        // Program.cs ya hizo Migrate/seed para cuando se invoca), así que se
        // recrea la BD de prueba desde el constructor del fixture.
        var opts = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConexionPrueba).Options;
        using var db = new AppDbContext(opts);
        db.Database.EnsureDeleted();
    }

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, cfg) =>
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = ConexionPrueba,
            }));
    }
}

[CollectionDefinition("api")]
public class ApiCollection : ICollectionFixture<ApiFixture> { }
