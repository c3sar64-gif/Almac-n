using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SistemaAlmacen.Core.Entidades;

namespace SistemaAlmacen.Infrastructure;

public class TokenService
{
    private readonly string _key;
    private readonly string _issuer;
    private readonly int _expiraMinutos;

    public TokenService(string key, string issuer, int expiraMinutos)
    {
        _key = key; _issuer = issuer; _expiraMinutos = expiraMinutos;
    }

    public string Generar(Usuario u)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
            new Claim(ClaimTypes.Name, u.Nombre),
            new Claim(ClaimTypes.Role, u.Rol.ToString()),
        };
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer, audience: _issuer, claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expiraMinutos), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
