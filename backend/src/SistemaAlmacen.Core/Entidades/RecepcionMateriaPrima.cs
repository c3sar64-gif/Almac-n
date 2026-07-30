namespace SistemaAlmacen.Core.Entidades;

public enum DictamenCalidad
{
    Aprobado = 1,
    Rechazado = 2,
    Condicional = 3
}

public class RecepcionMateriaPrima
{
    public int Id { get; set; }
    public DateTime FechaRecepcion { get; set; } = DateTime.UtcNow;
    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }
    public int AlmacenId { get; set; }
    public Almacen? Almacen { get; set; }
    public decimal CantidadRecibida { get; set; }
    public string Proveedor { get; set; } = "";
    public string? NumeroGuiaFactura { get; set; }

    // Control de Lote y Vencimiento
    public string NumeroLote { get; set; } = "";
    public DateTime? FechaFabricacion { get; set; }
    public DateTime? FechaVencimiento { get; set; }

    // Protocolo de Calidad (BPM / HACCP)
    public bool EmpaqueConforme { get; set; } = true;
    public bool AspectoConforme { get; set; } = true;
    public string? Temperatura { get; set; }
    public DictamenCalidad DictamenCalidad { get; set; } = DictamenCalidad.Aprobado;
    public string? Observaciones { get; set; }

    // Archivos adjuntos (Ficha técnica o certificado de análisis)
    public string? FichaTecnicaUrl { get; set; }

    // Auditoría
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
}
