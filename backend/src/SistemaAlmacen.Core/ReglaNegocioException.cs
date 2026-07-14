namespace SistemaAlmacen.Core;

/// Error de regla de negocio: el middleware lo traduce a HTTP 400.
public class ReglaNegocioException : Exception
{
    public ReglaNegocioException(string mensaje) : base(mensaje) { }
}
