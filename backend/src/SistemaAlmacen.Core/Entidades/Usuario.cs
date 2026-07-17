namespace SistemaAlmacen.Core.Entidades;

public enum Rol
{
    Admin = 1,
    Chofer = 2,
    Almacenero = 3,
    Encargado = 4
}

public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Rol Rol { get; set; } = Rol.Almacenero;
    public bool Activo { get; set; } = true;
}
