using ArGo.Api.Interfaces;
using ArGo.Api.Entities;
using ArGo.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace ArGo.Api.Functions;

public class UploadFunction
{
    private readonly IFileService _fileService;
    private readonly ILinkService _linkService;
    private readonly IRetentionService _retentionService;
    private readonly IMetadataService _metadataService;
    private readonly CurrentUser _currentUser;
    private readonly ILogger<UploadFunction> _logger;

    public UploadFunction(
        IFileService fileService,
        ILinkService linkService,
        IRetentionService retentionService,
        IMetadataService metadataService,
        CurrentUser currentUser,
        ILogger<UploadFunction> logger)
    {
        _fileService = fileService;
        _linkService = linkService;
        _retentionService = retentionService;
        _metadataService = metadataService;
        _currentUser = currentUser;
        _logger = logger;
    }

    [Function("FetchMetadata")]
    public async Task<IActionResult> FetchMetadata(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "metadata")] HttpRequest req)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized("user", [AuthorizeLookUp.Scope])) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        string? url = req.Query["url"];

        if (string.IsNullOrEmpty(url))
        {
            return new BadRequestResult();
        }

        var metadata = await _metadataService.ExtractMetadataAsync(url);
        return new OkObjectResult(metadata);
    }

    [Function(nameof(UploadFunction))]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "upload")] HttpRequest req)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized("files:create")) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        var ct = req.ContentType ?? "";

        if (!ct.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult("Content-Type must be multipart/form-data.");
        }

        var storageTierRaw = req.Query["storageTier"].FirstOrDefault() ?? "OneDay";
        var linkTierRaw = req.Query["linkTier"].FirstOrDefault() ?? "OneHour";
        var createdBy = _currentUser.UserId.ToString();
        var fileName = req.Query["fileName"].FirstOrDefault() ?? $"{Guid.NewGuid()}.bin";
        var customShortCode = req.Query["customShortCode"].FirstOrDefault();
        var title = (string?)req.Query["title"];
        var description = (string?)req.Query["description"];
        var iconUrl = (string?)req.Query["iconUrl"];
        var imageUrl = (string?)req.Query["imageUrl"];
        var siteName = (string?)req.Query["siteName"];
        var themeColor = (string?)req.Query["themeColor"];

        if (!Enum.TryParse<StorageTier>(storageTierRaw, out var storageTier))
            storageTier = StorageTier.OneDay;
        if (!Enum.TryParse<LinkTier>(linkTierRaw, out var linkTier))
            linkTier = LinkTier.OneHour;

        var storageExpiry = _retentionService.CalculateStorageExpiration(storageTier);
        var linkExpiry = _retentionService.CalculateLinkExpiration(linkTier);

        try
        {
            // 1. Upload file
            var fileMetadata = await _fileService.UploadFileAsync(req.Body, fileName, storageExpiry, createdBy);

            // 2. Generate sharing link
            var sasUri = await _fileService.GenerateSasTokenAsync(fileMetadata.BlobName, linkExpiry);

            // 3. Smart Metadata Defaults for Files
            title ??= fileName;
            if (string.IsNullOrEmpty(description))
            {
                var ext = Path.GetExtension(fileName).ToUpperInvariant().TrimStart('.');
                description = $"File Type: {ext} | Storage till: {storageExpiry:yyyy-MM-dd}";
            }

            if (string.IsNullOrEmpty(iconUrl))
            {
                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                iconUrl = GetFileIconUrl(ext);
            }

            // If it's an image, use the SAS URI as the preview image
            if (string.IsNullOrEmpty(imageUrl) && IsImageExtension(fileName))
            {
                imageUrl = sasUri;
            }

            var linkRequest = new CreateLinkRequest(customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor, linkExpiry);
            var link = await _linkService.CreateFileLinkAsync(fileMetadata.Id, createdBy, sasUri, linkRequest);

            return new ObjectResult(new
            {
                shortCode = link.ShortCode,
                linkExpiresAt = link.ExpirationUtc,
                storageExpiresAt = fileMetadata.StorageExpirationUtc,
                fileId = fileMetadata.Id
            }) { StatusCode = StatusCodes.Status201Created };
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already in use"))
        {
            return new ConflictObjectResult(ex.Message);
        }
    }

    [Function("ShortenUrl")]
    public async Task<IActionResult> ShortenUrl(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "shorten")] HttpRequest req)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized()) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(body);

        var longUrl = data.TryGetProperty("longUrl", out var lurl) ? lurl.GetString() : null;
        var createdBy = _currentUser.UserId.ToString();

        var customShortCode = data.TryGetProperty("customShortCode", out var csc) ? csc.GetString() : null;
        var title = data.TryGetProperty("title", out var t) ? t.GetString() : null;
        var description = data.TryGetProperty("description", out var desc) ? desc.GetString() : null;
        var iconUrl = data.TryGetProperty("iconUrl", out var i) ? i.GetString() : null;
        var imageUrl = data.TryGetProperty("imageUrl", out var img) ? img.GetString() : null;
        var siteName = data.TryGetProperty("siteName", out var sn) ? sn.GetString() : null;
        var themeColor = data.TryGetProperty("themeColor", out var tc) ? tc.GetString() : null;

        if (string.IsNullOrEmpty(longUrl))
        {
            return new BadRequestResult();
        }

        // Auto-extract metadata if missing
        if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(iconUrl) || string.IsNullOrEmpty(imageUrl))
        {
            var extracted = await _metadataService.ExtractMetadataAsync(longUrl);
            title ??= extracted.Title;
            description ??= extracted.Description;
            iconUrl ??= extracted.IconUrl;
            imageUrl ??= extracted.ImageUrl;
            siteName ??= extracted.SiteName;
            themeColor ??= extracted.ThemeColor;
        }

        try
        {
            var linkRequest = new CreateLinkRequest(customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor);
            var link = await _linkService.CreateUrlLinkAsync(longUrl, createdBy ?? "anonymous", linkRequest);

            return new OkObjectResult(new { shortCode = link.ShortCode });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already in use"))
        {
            return new ConflictObjectResult(ex.Message);
        }
    }

    [Function("GenerateFileLink")]
    public async Task<IActionResult> GenerateFileLink(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "files/{fileId}/links")] HttpRequest req,
        string fileId)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized()) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var data = string.IsNullOrWhiteSpace(body) ? default : JsonSerializer.Deserialize<JsonElement>(body);

        var linkTierRaw = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("linkTier", out var lt) ? lt.GetString() : "OneHour";
        var createdBy = _currentUser.UserId.ToString();

        var customShortCode = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("customShortCode", out var csc) ? csc.GetString() : null;
        var title = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("title", out var t) ? t.GetString() : null;
        var description = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("description", out var desc) ? desc.GetString() : null;
        var iconUrl = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("iconUrl", out var i) ? i.GetString() : null;
        var imageUrl = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("imageUrl", out var img) ? img.GetString() : null;
        var siteName = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("siteName", out var sn) ? sn.GetString() : null;
        var themeColor = data.ValueKind == JsonValueKind.Object && data.TryGetProperty("themeColor", out var tc) ? tc.GetString() : null;

        if (!Enum.TryParse<LinkTier>(linkTierRaw, out var linkTier))
            linkTier = LinkTier.OneHour;

        var linkExpiry = _retentionService.CalculateLinkExpiration(linkTier);

        var fileMetadata = await _fileService.GetFileMetadataAsync(fileId);
        if (fileMetadata == null)
        {
            return new NotFoundResult();
        }

        // Default title to FileName if not provided
        title ??= fileMetadata.FileName;

        try
        {
            var sasUri = await _fileService.GenerateSasTokenAsync(fileMetadata.BlobName, linkExpiry);
            var linkRequest = new CreateLinkRequest(customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor, linkExpiry);
            var link = await _linkService.CreateFileLinkAsync(fileMetadata.Id, createdBy, sasUri, linkRequest);

            return new ObjectResult(new
            {
                shortCode = link.ShortCode,
                linkExpiresAt = link.ExpirationUtc,
                fileId = fileMetadata.Id
            }) { StatusCode = StatusCodes.Status201Created };
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already in use"))
        {
            return new ConflictObjectResult(ex.Message);
        }
    }

    [Function("GetMyItems")]
    public async Task<IActionResult> GetMyItems(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "my-items")] HttpRequest req)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized()) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        var userId = _currentUser.UserId.ToString();

        var links = await _linkService.GetLinksByUserAsync(userId!);
        var files = await _fileService.GetFilesByUserAsync(userId!);

        return new OkObjectResult(new { links, files });
    }

    [Function("DeleteLink")]
    public async Task<IActionResult> DeleteLink(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "links/{shortCode}")] HttpRequest req,
        string shortCode)
    {
        if (!_currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!_currentUser.IsAuthorized()) return new StatusCodeResult(StatusCodes.Status403Forbidden);

        var userId = _currentUser.UserId.ToString();

        var deleted = await _linkService.DeleteLinkAsync(shortCode, userId);
        if (!deleted)
        {
            return new NotFoundResult();
        }

        return new NoContentResult();
    }

    private static bool IsImageExtension(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" }.Contains(ext);
    }

    private static string GetFileIconUrl(string extension)
    {
        return extension switch
        {
            ".pdf" => "https://cdn-icons-png.flaticon.com/512/337/337946.png",
            ".doc" or ".docx" => "https://cdn-icons-png.flaticon.com/512/337/337932.png",
            ".xls" or ".xlsx" => "https://cdn-icons-png.flaticon.com/512/337/337958.png",
            ".zip" or ".rar" or ".7z" => "https://cdn-icons-png.flaticon.com/512/337/337960.png",
            ".jpg" or ".png" or ".gif" => "https://cdn-icons-png.flaticon.com/512/337/337948.png",
            _ => "https://cdn-icons-png.flaticon.com/512/337/337943.png" // Default
        };
    }
}
