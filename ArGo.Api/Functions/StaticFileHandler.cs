using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ArGo.Api.Functions;

public class StaticFileHandler
{
    private readonly ILogger<StaticFileHandler> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider;

    public StaticFileHandler(ILogger<StaticFileHandler> logger)
    {
        _logger = logger;
        _contentTypeProvider = new FileExtensionContentTypeProvider();
    }

    [Function("StaticFileHandler")]
    public IActionResult Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "{dir}/{*path}")] HttpRequest req,
        string dir,
        string? path)
    {
        var fullPath = string.IsNullOrEmpty(path) ? dir : Path.Combine(dir, path);
        _logger.LogInformation("Static file request: {Path}", fullPath);

        var wwwroot = Path.Combine(Environment.CurrentDirectory, "wwwroot");
        var filePath = Path.Combine(wwwroot, fullPath);

        if (!File.Exists(filePath))
        {
            _logger.LogWarning("File not found: {FilePath}", filePath);
            return new NotFoundResult();
        }

        if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return new PhysicalFileResult(filePath, contentType);
    }
}
