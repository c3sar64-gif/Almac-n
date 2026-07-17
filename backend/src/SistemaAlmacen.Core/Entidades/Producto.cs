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
    public string? ImagenUrl { get; set; }
}
