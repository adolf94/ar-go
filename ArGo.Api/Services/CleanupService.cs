using ArGo.Api.Data;
using ArGo.Api.Entities;
using ArGo.Api.Interfaces;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ArGo.Api.Services;

public class CleanupService : ICleanupService
{
    private readonly AppDbContext _db;
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<CleanupService> _logger;
    private const string ContainerName = "uploads";

    public CleanupService(AppDbContext db, BlobServiceClient blobServiceClient, ILogger<CleanupService> logger)
    {
        _db = db;
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task ProcessExpiredFilesAsync()
    {
        var now = DateTime.UtcNow;
        var container = _blobServiceClient.GetBlobContainerClient(ContainerName);

        // 1. Cleanup expired FileMetadata AND their blobs
        var expiredFiles = await _db.FileMetadatas
            .Where(f => f.StorageExpirationUtc <= now)
            .ToListAsync();

        _logger.LogInformation("Found {Count} expired file(s) for cleanup.", expiredFiles.Count);

        foreach (var file in expiredFiles)
        {
            try
            {
                var blobClient = container.GetBlobClient(file.BlobName);
                await blobClient.DeleteIfExistsAsync();

                // Delete associated links for this file
                var linksToDelete = await _db.Links
                    .Where(l => l.FileId == file.Id)
                    .ToListAsync();
                
                foreach (var link in linksToDelete)
                {
                    _logger.LogInformation("History Log: Deleting file access link: {ShortCode} for file {FileId}", link.ShortCode, file.Id);
                    _db.DeletionHistory.Add(MapToHistory(link, "File Storage Expired"));
                }
                
                _db.Links.RemoveRange(linksToDelete);
                _db.FileMetadatas.Remove(file);

                _logger.LogInformation("Deleted blob and metadata for: {BlobName}", file.BlobName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up file: {BlobName}", file.BlobName);
            }
        }

        // 2. Cleanup ANY expired Links (both URL and File)
        var expiredLinks = await _db.Links
            .Where(l => l.ExpirationUtc != null && l.ExpirationUtc <= now)
            .ToListAsync();

        _logger.LogInformation("Found {Count} additional expired link(s) for cleanup.", expiredLinks.Count);

        foreach (var link in expiredLinks)
        {
            _logger.LogInformation("History Log: Deleting expired link: {ShortCode} (Type: {Type})", link.ShortCode, link.Type);
            _db.DeletionHistory.Add(MapToHistory(link, "Link Expired"));
            _db.Links.Remove(link);
        }

        await _db.SaveChangesAsync();
    }

    private DeletedLinkHistory MapToHistory(LinkMetadata link, string reason)
    {
        return new DeletedLinkHistory
        {
            ShortCode = link.ShortCode,
            Type = link.Type,
            LongUrl = link.LongUrl,
            FileId = link.FileId,
            DeletedBy = "CleanupService",
            DeletedAt = DateTime.UtcNow,
            Reason = reason,
            OriginalCreatedBy = link.CreatedBy
        };
    }
}
