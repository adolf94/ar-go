using ArGo.Api.Entities;

namespace ArGo.Api.Interfaces;

public record LinkResolutionResult(LinkMetadata Link, string? BlobName = null, FileMetadata? File = null);

public record CreateLinkRequest(
    string? CustomShortCode = null,
    string? Title = null,
    string? Description = null,
    string? IconUrl = null,
    string? ImageUrl = null,
    string? SiteName = null,
    string? ThemeColor = null,
    DateTime? ExpirationUtc = null,
    string? ClientId = null
);

public interface ILinkService
{
    Task<LinkMetadata> CreateUrlLinkAsync(string longUrl, string createdBy, CreateLinkRequest? request = null);
    Task<LinkMetadata> CreateFileLinkAsync(string fileId, string createdBy, string sasLink, CreateLinkRequest? request = null);
    Task<LinkResolutionResult?> ResolveLinkAsync(string shortCode);
    Task<bool> DeleteLinkAsync(string shortCode, string requestedBy);
    Task<List<LinkMetadata>> GetLinksByUserAsync(string userId);
    Task UpdateMetadataAsync(string shortCode, UrlMetadata metadata);
}
