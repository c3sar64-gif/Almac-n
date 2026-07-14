using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace SistemaAlmacen.Tests;

[Collection("api")]
public class ApiIntegracionTests
{
    private readonly ApiFixture _api;
    public ApiIntegracionTests(ApiFixture api) { _api = api; }

    private async Task<HttpClient> ClienteAdminAsync()
    {
        var cliente = _api.CreateClient();
        var resp = await cliente.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@almacen.local", password = "Admin123!" });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        cliente.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("token").GetString());
        return cliente;
    }

    [Fact]
    public async Task Sin_token_devuelve_401()
    {
        var cliente = _api.CreateClient();
        var resp = await cliente.GetAsync("/api/productos");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Login_y_flujo_completo_de_inventario()
    {
        var cliente = await ClienteAdminAsync();

        var almacen = await (await cliente.PostAsJsonAsync("/api/almacenes",
            new { nombre = "Central-IT" })).Content.ReadFromJsonAsync<JsonElement>();
        var producto = await (await cliente.PostAsJsonAsync("/api/productos",
            new { sku = "IT-001", nombre = "Producto integracion" })).Content.ReadFromJsonAsync<JsonElement>();
        int almacenId = almacen.GetProperty("id").GetInt32();
        int productoId = producto.GetProperty("id").GetInt32();

        var entrada = await cliente.PostAsJsonAsync("/api/movimientos/entrada",
            new { productoId, almacenDestinoId = almacenId, cantidad = 10 });
        Assert.Equal(HttpStatusCode.OK, entrada.StatusCode);

        // Enum serializado como texto
        var mov = await entrada.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Entrada", mov.GetProperty("tipo").GetString());

        var existencias = await cliente.GetFromJsonAsync<JsonElement>($"/api/existencias?almacenId={almacenId}");
        Assert.Equal(10, existencias[0].GetProperty("cantidad").GetDecimal());

        // Error de negocio → 400 con mensaje
        var salida = await cliente.PostAsJsonAsync("/api/movimientos/salida",
            new { productoId, almacenOrigenId = almacenId, cantidad = 999 });
        Assert.Equal(HttpStatusCode.BadRequest, salida.StatusCode);
        var error = await salida.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("Stock insuficiente", error.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Sku_duplicado_devuelve_400()
    {
        var cliente = await ClienteAdminAsync();
        await cliente.PostAsJsonAsync("/api/productos", new { sku = "DUP-001", nombre = "Original" });
        var resp = await cliente.PostAsJsonAsync("/api/productos", new { sku = "DUP-001", nombre = "Copia" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Operador_no_puede_crear_almacenes()
    {
        var admin = await ClienteAdminAsync();
        await admin.PostAsJsonAsync("/api/usuarios",
            new { email = "operador@test.local", nombre = "Operador Test", password = "Operador123!", rol = "Operador" });

        var cliente = _api.CreateClient();
        var login = await cliente.PostAsJsonAsync("/api/auth/login",
            new { email = "operador@test.local", password = "Operador123!" });
        var json = await login.Content.ReadFromJsonAsync<JsonElement>();
        cliente.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("token").GetString());

        var resp = await cliente.PostAsJsonAsync("/api/almacenes", new { nombre = "Prohibido" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
