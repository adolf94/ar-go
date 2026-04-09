using ArGo.Utilities;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ArGo.Utilities
{
    internal class AppMiddleware : IFunctionsWorkerMiddleware
    {
        private AppConfig _config;
        private readonly ILogger<AppMiddleware> _logger;

        public AppMiddleware(AppConfig config, ILogger<AppMiddleware> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
        {
            var httpContext = context.GetHttpContext();

            if (httpContext != null)
            {
                // Register a callback to add our headers just before the response starts.
                // This ensures we can see the correct StatusCode after IActionResult execution.
                httpContext.Response.OnStarting(() =>
                {
                    if (httpContext.Response.StatusCode == 401 || httpContext.Response.StatusCode == 403)
                    {
                        var user = httpContext.RequestServices.GetService<CurrentUser>();
                        if (!string.IsNullOrEmpty(user?.AuthFailureReason))
                        {
                            httpContext.Response.Headers["X-Auth-Reason"] = user.AuthFailureReason;
                        }
                    }
                    return Task.CompletedTask;
                });
            }

            if (httpContext != null && httpContext.Request.Headers.ContainsKey("Authorization"))
            {
                var _user = httpContext.RequestServices.GetRequiredService<CurrentUser>();
                var authConfig = _config.ArAuthConfig;
                var authorization = httpContext.Request.Headers.Authorization.ToString();
                
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var bearer = authorization.Substring(7);
                    
                    try 
                    {
                        var (principal, error) = await JwtTokenHelper.ValidateOidcToken(bearer, authConfig.Authority, authConfig.Audience, authConfig.Scope);
                        _user.AuthFailureReason = error;

                        if (principal != null)
                        {
                            var sub = principal.Claims.FirstOrDefault(e => e.Type == ClaimTypes.NameIdentifier || e.Type == "sub")?.Value;
                            var clientId = principal.Claims.FirstOrDefault(e => e.Type == "client_id")?.Value;
                            var grantType = principal.Claims.FirstOrDefault(e => e.Type == "grant_type")?.Value;

                            if (!string.IsNullOrEmpty(sub))
                            {
                                httpContext.User = principal;
                                _user.IsAuthenticated = true;
                                _user.ClientId = clientId ?? "";

                                if (Guid.TryParse(sub, out var userIdGuid))
                                {
                                    _user.UserId = userIdGuid;
                                    _user.PrincipalType = PrincipalType.User;
                                }
                                else
                                {
                                    // If sub is not a GUID, it's likely an APP (client_credentials)
                                    _user.PrincipalType = PrincipalType.App;
                                    _user.App = sub;
                                }

                                // Explicit check for grant_type if present
                                if (grantType == "client_credentials")
                                {
                                    _user.PrincipalType = PrincipalType.App;
                                }

                                _user.Name = principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue("name") ?? "";
                                _user.EmailAddress = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email") ?? "";

                                _user.Roles = principal.Claims.Where(e => e.Type == ClaimTypes.Role || e.Type == "role")
                                                .Where(e => e.Value.StartsWith("api://")).Select(e => e.Value).ToArray();

                                _user.Scopes = principal.Claims.Where(e => e.Type == ClaimTypes.Role || e.Type == "role")
                                                .Where(e => e.Value.StartsWith("api://"))
                                                .Select(e =>
                                                {
                                                    var resourceId = $"api://{authConfig.Audience}/";
                                                    if (e.Value.StartsWith(resourceId)) return e.Value.Substring(resourceId.Length);
                                                    return e.Value;
                                                }).ToArray();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _user.AuthFailureReason = ex.Message;
                        _logger.LogError(ex, "Authentication failed");
                    }
                }
            }

            await next(context);
        }
    }
}
