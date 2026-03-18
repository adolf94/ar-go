using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ArGo.Utilities
{
    public class JwtTokenHelper
    {
        public static JwtSecurityToken ConvertJwtStringToJwtSecurityToken(string? jwt)
        {
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(jwt);

            return token;
        }

        public static async Task<(ClaimsPrincipal? principal, string? error)> ValidateOidcToken(string token, string authority, string audience, string? expectedScope = null)
        {
            string? errorMessage = null;
            var configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{authority.TrimEnd('/')}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());

            try
            {
                var discoveryDocument = await configurationManager.GetConfigurationAsync();
                var signingKeys = discoveryDocument.SigningKeys;

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = discoveryDocument.Issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                var handler = new JwtSecurityTokenHandler();
                var principal = handler.ValidateToken(token, validationParameters, out _);

                if (!string.IsNullOrEmpty(expectedScope))
                {
                    var scopeClaim = principal.Claims.FirstOrDefault(c => c.Type == "scp" || c.Type == "http://schemas.microsoft.com/identity/claims/scope" || c.Type == "scope")?.Value;
                    var scopes = scopeClaim?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
                    
                    if (!scopes.Contains(expectedScope, StringComparer.OrdinalIgnoreCase))
                    {
                        errorMessage = $"Missing required scope '{expectedScope}'. Present scopes: '{scopeClaim}'";
                        return (null, errorMessage);
                    }
                }

                return (principal, null);
            }
            catch (Exception ex)
            {
                return (null, ex.Message);
            }
        }

        // Keep legacy method for reference if needed, but we'll use ValidateOidcToken
        public static ClaimsPrincipal? ReadClaimsFromJwt(string token, string secretKey, string validIssuer, string validAudience)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = validIssuer,
                ValidateAudience = true,
                ValidAudience = validAudience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                ClaimsPrincipal principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out _);
                return principal;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token validation failed: {ex.Message}");
                return null;
            }
        }
    }
}
