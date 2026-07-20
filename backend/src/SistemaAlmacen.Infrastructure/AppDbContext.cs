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
    public DbSet<TareaLogistica> TareasLogistica => Set<TareaLogistica>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Producto>().HasIndex(p => p.Sku).IsUnique();
        mb.Entity<Usuario>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Existencia>().HasIndex(e => new { e.ProductoId, e.AlmacenId }).IsUnique();
        mb.Entity<Existencia>().ToTable(t =>
            t.HasCheckConstraint("ck_existencias_cantidad_no_negativa", "\"Cantidad\" >= 0"));
        mb.Entity<Existencia>().Property(e => e.Cantidad).HasPrecision(18, 3);
        mb.Entity<Existencia>().Property(e => e.StockMinimo).HasPrecision(18, 3);
        mb.Entity<Movimiento>().Property(m => m.Cantidad).HasPrecision(18, 3);
        mb.Entity<Movimiento>()
            .HasOne(m => m.AlmacenOrigen).WithMany()
            .HasForeignKey(m => m.AlmacenOrigenId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Movimiento>()
            .HasOne(m => m.AlmacenDestino).WithMany()
            .HasForeignKey(m => m.AlmacenDestinoId).OnDelete(DeleteBehavior.Restrict);

        mb.Entity<TareaLogistica>()
            .HasOne(t => t.Chofer).WithMany()
            .HasForeignKey(t => t.ChoferId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<TareaLogistica>()
            .HasOne(t => t.AlmacenOrigen).WithMany()
            .HasForeignKey(t => t.AlmacenOrigenId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<TareaLogistica>()
            .HasOne(t => t.AlmacenDestino).WithMany()
            .HasForeignKey(t => t.AlmacenDestinoId).OnDelete(DeleteBehavior.Restrict);
    }
}
