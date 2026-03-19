using ArGo.Api.Interfaces;
using ArGo.Api.Entities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Hosting;
using System.Net;

namespace ArGo.Api.Functions;

public class RedirectFunction
{
    private readonly ILinkService _linkService;
    private readonly IFileService _fileService;
    private readonly IMetadataService _metadataService;
    private readonly ILogger<RedirectFunction> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider;
    private readonly IHostEnvironment _env;

    public RedirectFunction(ILinkService linkService, IFileService fileService, IMetadataService metadataService, ILogger<RedirectFunction> logger, IHostEnvironment env)
    {
        _linkService = linkService;
        _fileService = fileService;
        _metadataService = metadataService;
        _logger = logger;
        _env = env;
        _contentTypeProvider = new FileExtensionContentTypeProvider();
    }

    [Function(nameof(RedirectFunction))]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "{shortCode?}")] HttpRequest req,
        string? shortCode)
    {
        // Do not intercept API requests
        if (!string.IsNullOrEmpty(shortCode) && shortCode.Equals("api", StringComparison.OrdinalIgnoreCase))
        {
            return new NotFoundResult();
        }

        // Resolve wwwroot path using AppContext.BaseDirectory (proven ar-auth pattern)
        var baseDir = AppContext.BaseDirectory;
        var wwwroot = Path.Combine(baseDir, "wwwroot");

        // Handle Root / or 'app' route (direct SPA fallback)
        if (string.IsNullOrEmpty(shortCode) || shortCode.Equals("app", StringComparison.OrdinalIgnoreCase))
        {
            var indexPath = Path.GetFullPath(Path.Combine(wwwroot, "index.html"));
            if (File.Exists(indexPath))
            {
                return new PhysicalFileResult(indexPath, "text/html");
            }
            _logger.LogWarning($"Unable to serve index.html at {indexPath}. BaseDirectory: {baseDir}");
            return new ContentResult { Content = "UI not bundled. Please build the UI and copy it to wwwroot.", StatusCode = 404 };
        }

        // Handle root-level static files (e.g., manifest.json, favicon.ico)
        if (shortCode.Contains('.'))
        {
            var filePath = Path.GetFullPath(Path.Combine(wwwroot, shortCode));
            
            // Security: Prevent path traversal
            if (!filePath.StartsWith(wwwroot, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Potential path traversal attempt blocked: {Path}", shortCode);
                return new NotFoundResult();
            }

            if (File.Exists(filePath))
            {
                if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
                {
                    contentType = "application/octet-stream";
                }
                return new PhysicalFileResult(filePath, contentType);
            }
            return new NotFoundResult();
        }

        _logger.LogInformation("Resolving unified link: {ShortCode}", shortCode);

        var result = await _linkService.ResolveLinkAsync(shortCode);

        if (result == null)
        {
            _logger.LogWarning("Link {ShortCode} not found or expired. Falling back to SPA.", shortCode);
            
            var indexPath = Path.Combine(wwwroot, "index.html");

            if (File.Exists(indexPath))
            {
                return new PhysicalFileResult(indexPath, "text/html");
            }

            return new ContentResult { Content = "This link has expired or does not exist.", StatusCode = 410 };
        }

        var link = result.Link;

        // Lazy fetch metadata if not already fetched
        if (!link.MetadataFetched && link.Type == LinkType.UrlRedirect && !string.IsNullOrEmpty(link.LongUrl))
        {
            var metadata = await _metadataService.ExtractMetadataAsync(link.LongUrl);
            if (!string.IsNullOrEmpty(metadata.Title))
            {
                // Background update to not block redirect
                _ = Task.Run(async () => await _linkService.UpdateMetadataAsync(shortCode, metadata));

                // Update local object for the current response
                link.Title = metadata.Title;
                link.Description = metadata.Description;
                link.IconUrl = metadata.IconUrl;
                link.ImageUrl = metadata.ImageUrl;
                link.SiteName = metadata.SiteName;
                link.ThemeColor = metadata.ThemeColor;
            }
        }

        // If link has metadata, serve an HTML page for social crawlers and users
        if (!string.IsNullOrEmpty(link.Title) || !string.IsNullOrEmpty(link.Description) || !string.IsNullOrEmpty(link.ImageUrl))
        {
            var targetUrl = link.LongUrl;
            var baseUrl = $"{req.Scheme}://{req.Host}";
            var currentUrl = $"{baseUrl}{req.Path}";

            if (link.Type == LinkType.FileAccess && string.IsNullOrEmpty(targetUrl))
            {
                if (!string.IsNullOrEmpty(result.BlobName))
                {
                    var sasExpiry = link.ExpirationUtc ?? DateTime.UtcNow.AddHours(1);
                    targetUrl = await _fileService.GenerateSasTokenAsync(result.BlobName, sasExpiry);
                }
            }

            if (!string.IsNullOrEmpty(targetUrl))
            {
                // Detect if the request is from a social bot (Discord, Twitter, etc.)
                var userAgent = req.Headers["User-Agent"].ToString();
                var isSocialBot = userAgent.Contains("Discordbot", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("Twitterbot", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("Slackbot", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("WhatsApp", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("TelegramBot", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("facebookexternalhit", StringComparison.OrdinalIgnoreCase) ||
                                  userAgent.Contains("LinkedInBot", StringComparison.OrdinalIgnoreCase);

                // Seamless experience: Redirect humans immediately, show preview only to bots
                if (!isSocialBot)
                {
                    _logger.LogInformation("Seamless redirect for human user: {UserAgent}", userAgent);
                    return new RedirectResult(targetUrl, permanent: false);
                }

                _logger.LogInformation("Serving metadata preview for social bot: {UserAgent}", userAgent);

                var siteName = string.IsNullOrEmpty(link.SiteName) ? "ArGo" : link.SiteName;
                var displayTitle = System.Web.HttpUtility.HtmlEncode(link.Title ?? "Shared Content");
                var displayDesc = System.Web.HttpUtility.HtmlEncode(link.Description ?? "");
                var displaySite = System.Web.HttpUtility.HtmlEncode(siteName);
                
                var html = $@"
                    <!DOCTYPE html>
                    <html lang=""en"">
                    <head>
                        <meta charset=""utf-8"">
                        <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
                        <title>{displayTitle}</title>
                        <meta name=""description"" content=""{displayDesc}"">
                        
                        <!-- Open Graph / Facebook -->
                        <meta property=""og:type"" content=""website"">
                        <meta property=""og:url"" content=""{currentUrl}"">
                        <meta property=""og:title"" content=""{displayTitle}"">
                        <meta property=""og:description"" content=""{displayDesc}"">
                        <meta property=""og:image"" content=""{link.ImageUrl}"">
                        <meta property=""og:site_name"" content=""{displaySite}"">

                        <!-- Twitter -->
                        <meta name=""twitter:card"" content=""summary_large_image"">
                        <meta name=""twitter:url"" content=""{currentUrl}"">
                        <meta name=""twitter:title"" content=""{displayTitle}"">
                        <meta name=""twitter:description"" content=""{displayDesc}"">
                        <meta name=""twitter:image"" content=""{link.ImageUrl}"">

                        <meta name=""theme-color"" content=""{link.ThemeColor ?? "#0d0d0d"}"">

                        <meta http-equiv=""refresh"" content=""1;url={targetUrl}"">
                        
                        <style>
                            :root {{
                                --bg-color: #0d0d0d;
                                --accent-color: {link.ThemeColor ?? "#6366f1"};
                                --text-color: #ffffff;
                            }}
                            body {{
                                margin: 0;
                                padding: 0;
                                background-color: var(--bg-color);
                                color: var(--text-color);
                                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                overflow: hidden;
                            }}
                            .background {{
                                position: fixed;
                                top: 0; left: 0; width: 100%; height: 100%;
                                background: radial-gradient(circle at 50% 50%, var(--accent-color) 0%, transparent 50%);
                                opacity: 0.15;
                                filter: blur(100px);
                                z-index: -1;
                            }}
                            .glass-card {{
                                background: rgba(255, 255, 255, 0.05);
                                backdrop-filter: blur(20px);
                                -webkit-backdrop-filter: blur(20px);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 24px;
                                padding: 3rem;
                                max-width: 450px;
                                width: 85%;
                                text-align: center;
                                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                                animation: fadeIn 0.8s ease-out;
                            }}
                            @keyframes fadeIn {{
                                from {{ opacity: 0; transform: translateY(20px); }}
                                to {{ opacity: 1; transform: translateY(0); }}
                            }}
                            .logo {{
                                font-weight: 800;
                                font-size: 1.5rem;
                                margin-bottom: 2rem;
                                letter-spacing: -0.05em;
                                color: var(--accent-color);
                            }}
                            .preview-image {{
                                width: 100%;
                                aspect-ratio: 16/9;
                                object-fit: cover;
                                border-radius: 12px;
                                margin-bottom: 2rem;
                                background: rgba(255, 255, 255, 0.05);
                            }}
                            .title {{
                                font-size: 1.5rem;
                                font-weight: 700;
                                margin: 0 0 1rem 0;
                                line-height: 1.2;
                            }}
                            .description {{
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 1rem;
                                margin-bottom: 2.5rem;
                                line-height: 1.5;
                            }}
                            .loader-container {{
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 12px;
                                color: rgba(255, 255, 255, 0.4);
                                font-size: 0.875rem;
                                font-weight: 500;
                            }}
                            .loader {{
                                width: 18px;
                                height: 18px;
                                border: 2px solid rgba(255, 255, 255, 0.1);
                                border-top: 2px solid var(--accent-color);
                                border-radius: 50%;
                                animation: spin 0.8s linear infinite;
                            }}
                            @keyframes spin {{
                                0% {{ transform: rotate(0deg); }}
                                100% {{ transform: rotate(360deg); }}
                            }}
                            a {{
                                color: var(--accent-color);
                                text-decoration: none;
                                word-break: break-all;
                            }}
                        </style>
                    </head>
                    <body>
                        <div class=""background""></div>
                        <div class=""glass-card"">
                            <div class=""logo"">{displaySite}</div>
                            {(!string.IsNullOrEmpty(link.ImageUrl) ? $"<img src=\"{link.ImageUrl}\" class=\"preview-image\" alt=\"Preview\"/>" : "")}
                            <h1 class=""title"">{displayTitle}</h1>
                            <p class=""description"">{displayDesc}</p>
                            <div class=""loader-container"">
                                <div class=""loader""></div>
                                <span>Redirecting to destination...</span>
                            </div>
                            <p style=""margin-top: 2rem; font-size: 0.75rem; opacity: 0.3;"">
                                You are being redirected to <a href=""{targetUrl}"">{targetUrl}</a>
                            </p>
                        </div>
                        <script>
                            setTimeout(() => {{ window.location.href = ""{targetUrl}""; }}, 1000);
                        </script>
                    </body>
                    </html>";
                
                return new ContentResult
                {
                    Content = html,
                    ContentType = "text/html; charset=utf-8",
                    StatusCode = 200
                };
            }
        }

        if (link.Type == LinkType.UrlRedirect)
        {
            return new RedirectResult(link.LongUrl!, permanent: true);
        }
        else if (link.Type == LinkType.FileAccess)
        {
            var targetUri = link.LongUrl;

            if (string.IsNullOrEmpty(targetUri))
            {
                targetUri = null;

                if (string.IsNullOrEmpty(targetUri))
                {
                    if (string.IsNullOrEmpty(result.BlobName))
                    {
                        _logger.LogError("File metadata for link {ShortCode} (FileId: {FileId}) not found.", shortCode, link.FileId);
                        return new NotFoundResult();
                    }

                    var sasExpiry = link.ExpirationUtc ?? DateTime.UtcNow.AddHours(1);
                    targetUri = await _fileService.GenerateSasTokenAsync(result.BlobName, sasExpiry);
                }
            }

            return new RedirectResult(targetUri);
        }

        return new NotFoundResult();
    }
}
