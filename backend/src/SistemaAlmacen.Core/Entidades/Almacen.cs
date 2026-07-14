namespace SistemaAlmacen.Core.Entidades;

public class Almacen
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string? Ubicacion { get; set; }
    public bool Activo { get; set; } = true;
}
