using ArGo.Api.Data;
using ArGo.Api.Entities;
using ArGo.Api.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ArGo.Api.Services;

public class LinkService : ILinkService
{
    private readonly AppDbContext _db;
    private readonly ILogger<LinkService> _logger;

    public LinkService(AppDbContext db, ILogger<LinkService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private static string GenerateShortCode() =>
        Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-").Replace("/", "_").Replace("=", "")
            .Substring(0, 8);

    public async Task<LinkMetadata> CreateUrlLinkAsync(string longUrl, string createdBy, CreateLinkRequest? request = null)
    {
        var shortCode = request?.CustomShortCode;
        if (!string.IsNullOrEmpty(shortCode))
        {
            if (await _db.Links.FirstOrDefaultAsync(l => l.ShortCode == shortCode) != null)
            {
                throw new InvalidOperationException("Short code already in use.");
            }
        }
        else
        {
            shortCode = GenerateShortCode();
        }

        var link = new LinkMetadata
        {
            ShortCode = shortCode,
            Type = LinkType.UrlRedirect,
            LongUrl = longUrl,
            CreatedBy = createdBy,
            ExpirationUtc = request?.ExpirationUtc,
            Title = request?.Title,
            Description = request?.Description,
            IconUrl = request?.IconUrl,
            ImageUrl = request?.ImageUrl,
            SiteName = request?.SiteName,
            ThemeColor = request?.ThemeColor,
            ClientId = request?.ClientId,
            MetadataFetched = !string.IsNullOrEmpty(request?.Title) || !string.IsNullOrEmpty(request?.ImageUrl)
        };
        _db.Links.Add(link);
        await _db.SaveChangesAsync();
        return link;
    }

    public async Task<LinkMetadata> CreateFileLinkAsync(string fileId, string createdBy, string sasLink, CreateLinkRequest? request = null)
    {
        var shortCode = request?.CustomShortCode;
        if (!string.IsNullOrEmpty(shortCode))
        {
            if (await _db.Links.FirstOrDefaultAsync(l => l.ShortCode == shortCode) != null)
            {
                throw new InvalidOperationException("Short code already in use.");
            }
        }
        else
        {
            shortCode = GenerateShortCode();
        }

        var link = new LinkMetadata
        {
            ShortCode = shortCode,
            Type = LinkType.FileAccess,
            FileId = fileId,
            LongUrl = sasLink,
            CreatedBy = createdBy,
            ExpirationUtc = request?.ExpirationUtc,
            Title = request?.Title,
            Description = request?.Description,
            IconUrl = request?.IconUrl,
            ImageUrl = request?.ImageUrl,
            SiteName = request?.SiteName,
            ThemeColor = request?.ThemeColor,
            ClientId = request?.ClientId,
            MetadataFetched = !string.IsNullOrEmpty(request?.Title) || !string.IsNullOrEmpty(request?.ImageUrl)
        };
        _db.Links.Add(link);
        await _db.SaveChangesAsync();
        return link;
    }

    public async Task UpdateMetadataAsync(string shortCode, UrlMetadata metadata)
    {
        var link = await _db.Links.FirstOrDefaultAsync(l => l.ShortCode == shortCode);
        if (link != null)
        {
            link.Title = link.Title ?? metadata.Title;
            link.Description = link.Description ?? metadata.Description;
            link.IconUrl = link.IconUrl ?? metadata.IconUrl;
            link.ImageUrl = link.ImageUrl ?? metadata.ImageUrl;
            link.SiteName = link.SiteName ?? metadata.SiteName;
            link.ThemeColor = link.ThemeColor ?? metadata.ThemeColor;
            link.MetadataFetched = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<bool> DeleteLinkAsync(string shortCode, string requestedBy)
    {
        var link = await _db.Links.FirstOrDefaultAsync(l => l.ShortCode == shortCode);
        if (link == null) return false;

        // Optionally check if the user is the owner
        if (link.CreatedBy != requestedBy && requestedBy != "admin")
        {
            _logger.LogWarning("User {UserId} tried to delete link {ShortCode} owned by {OwnerId}", requestedBy, shortCode, link.CreatedBy);
            return false;
        }

        _db.Links.Remove(link);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<LinkMetadata>> GetLinksByUserAsync(string userId)
    {
        return await _db.Links
            .Where(l => l.CreatedBy == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
    }

    public async Task<LinkResolutionResult?> ResolveLinkAsync(string shortCode)
    {
        var link = await _db.Links.FirstOrDefaultAsync(l => l.ShortCode == shortCode);
        
        if (link == null) return null;
        
        if (link.ExpirationUtc.HasValue && link.ExpirationUtc.Value <= DateTime.UtcNow)
        {
            _logger.LogWarning("Link {ShortCode} has expired.", shortCode);
            return null;
        }

        FileMetadata? file = null;
        string? blobName = null;
        if (link.Type == LinkType.FileAccess && !string.IsNullOrEmpty(link.FileId))
        {
            file = await _db.FileMetadatas.FindAsync(link.FileId);
            blobName = file?.BlobName;
        }
        
        return new LinkResolutionResult(link, blobName, file);
    }
}
