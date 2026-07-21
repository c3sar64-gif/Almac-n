namespace SistemaAlmacen.Core.Entidades;

public class Lote
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }
    public int AlmacenId { get; set; }
    public Almacen? Almacen { get; set; }
    public string CodigoLote { get; set; } = string.Empty;
    public DateTime? FechaVencimiento { get; set; }
    public decimal Cantidad { get; set; }
    public DateTime FechaIngreso { get; set; } = DateTime.UtcNow;
}
