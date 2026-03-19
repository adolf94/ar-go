using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;

namespace ArGo.Api.Functions;

public class StaticFileHandler
{
    private readonly ILogger<StaticFileHandler> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider;
    private readonly IHostEnvironment _env;

    public StaticFileHandler(ILogger<StaticFileHandler> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
        _contentTypeProvider = new FileExtensionContentTypeProvider();
    }

    [Function("StaticFileHandler")]
    public IActionResult Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "{dir}/{*path}")] HttpRequest req,
        string dir,
        string? path)
    {
        // Do not intercept API requests
        if (dir.Equals("api", StringComparison.OrdinalIgnoreCase))
        {
            return new NotFoundResult();
        }

        var fullPath = string.IsNullOrEmpty(path) ? dir : Path.Combine(dir, path.Replace("/", Path.DirectorySeparatorChar.ToString()));
        _logger.LogInformation("Static file request: {Path}", fullPath);

        var root = _env.ContentRootPath;
        var wwwroot = Path.Combine(root, "wwwroot");
        if (!Directory.Exists(wwwroot) && root.EndsWith("wwwroot", StringComparison.OrdinalIgnoreCase))
        {
            wwwroot = root;
        }

        // Security: Prevent path traversal
        var filePath = Path.GetFullPath(Path.Combine(wwwroot, fullPath));
        if (!filePath.StartsWith(wwwroot, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Potential path traversal attempt blocked: {Path}", fullPath);
            return new NotFoundResult();
        }

        // If a physical file exists, serve it
        if (File.Exists(filePath))
        {
            if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
            {
                contentType = "application/octet-stream";
            }
            return new PhysicalFileResult(filePath, contentType);
        }

        _logger.LogWarning("File not found: {FilePath}", filePath);

        // SPA Fallback: For nested routes, serve index.html if file doesn't exist
        var indexPath = Path.Combine(wwwroot, "index.html");
        if (File.Exists(indexPath))
        {

            _logger.LogInformation("File not found, falling back to index.html for SPA route: {Path}", fullPath);
            return new PhysicalFileResult(indexPath, "text/html");
        }

        _logger.LogWarning("Unable to serve index.html at {IndexPath}", indexPath);

        return new NotFoundResult();
    }
}
