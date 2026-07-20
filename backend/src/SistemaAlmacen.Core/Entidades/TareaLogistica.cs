namespace SistemaAlmacen.Core.Entidades;

public enum EstadoTarea
{
    Pendiente = 1,
    EnRuta = 2,
    Completada = 3,
    Cancelada = 4
}

public class TareaLogistica
{
    public int Id { get; set; }
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public int ChoferId { get; set; }
    public Usuario? Chofer { get; set; }
    public int? AlmacenOrigenId { get; set; }
    public Almacen? AlmacenOrigen { get; set; }
    public int? AlmacenDestinoId { get; set; }
    public Almacen? AlmacenDestino { get; set; }
    public EstadoTarea Estado { get; set; } = EstadoTarea.Pendiente;
    public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaProgramada { get; set; } = DateTime.UtcNow.Date;
    public string HoraInicio { get; set; } = "08:00";
    public string HoraFin { get; set; } = "09:00";
    public DateTime? FechaCompletado { get; set; }
    public string? NotasChofer { get; set; }
    public string? ComprobanteUrl { get; set; }
}
