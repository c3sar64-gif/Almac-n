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
