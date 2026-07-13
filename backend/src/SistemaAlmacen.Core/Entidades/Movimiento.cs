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
