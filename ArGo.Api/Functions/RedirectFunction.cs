using ArGo.Api.Interfaces;
using ArGo.Api.Entities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ArGo.Api.Functions;

public class RedirectFunction
{
    private readonly ILinkService _linkService;
    private readonly IFileService _fileService;
    private readonly IMetadataService _metadataService;
    private readonly ILogger<RedirectFunction> _logger;

    public RedirectFunction(ILinkService linkService, IFileService fileService, IMetadataService metadataService, ILogger<RedirectFunction> logger)
    {
        _linkService = linkService;
        _fileService = fileService;
        _metadataService = metadataService;
        _logger = logger;
    }

    [Function(nameof(RedirectFunction))]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "{shortCode}")] HttpRequest req,
        string shortCode)
    {
        _logger.LogInformation("Resolving unified link: {ShortCode}", shortCode);

        var result = await _linkService.ResolveLinkAsync(shortCode);

        if (result == null)
        {
            _logger.LogWarning("Link {ShortCode} not found or expired.", shortCode);
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
                var html = $@"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset=""utf-8"">
                        <title>{System.Web.HttpUtility.HtmlEncode(link.Title)}</title>
                        <meta name=""description"" content=""{System.Web.HttpUtility.HtmlEncode(link.Description)}"">
                        
                        <!-- Open Graph / Facebook -->
                        <meta property=""og:type"" content=""website"">
                        <meta property=""og:url"" content=""{req.Path}"">
                        <meta property=""og:title"" content=""{System.Web.HttpUtility.HtmlEncode(link.Title)}"">
                        <meta property=""og:description"" content=""{System.Web.HttpUtility.HtmlEncode(link.Description)}"">
                        <meta property=""og:image"" content=""{link.ImageUrl}"">
                        <meta property=""og:site_name"" content=""{System.Web.HttpUtility.HtmlEncode(link.SiteName)}"">

                        <!-- Twitter -->
                        <meta name=""twitter:card"" content=""summary_large_image"">
                        <meta name=""twitter:url"" content=""{req.Path}"">
                        <meta name=""twitter:title"" content=""{System.Web.HttpUtility.HtmlEncode(link.Title)}"">
                        <meta name=""twitter:description"" content=""{System.Web.HttpUtility.HtmlEncode(link.Description)}"">
                        <meta name=""twitter:image"" content=""{link.ImageUrl}"">

                        <meta name=""theme-color"" content=""{link.ThemeColor ?? "#000000"}"">

                        <meta http-equiv=""refresh"" content=""0;url={targetUrl}"">
                        <script type=""text/javascript"">
                            window.location.href = ""{targetUrl}"";
                        </script>
                    </head>
                    <body>
                        <p>Redirecting to <a href=""{targetUrl}"">{targetUrl}</a>...</p>
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
