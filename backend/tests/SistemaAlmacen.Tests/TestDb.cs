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
