using ArGo.Api.Data;
using ArGo.Api.Entities;
using ArGo.Api.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ArGo.Api.Services;

public class FileService : IFileService
{
    private readonly AppDbContext _db;
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<FileService> _logger;
    private const string ContainerName = "uploads";

    public FileService(AppDbContext db, BlobServiceClient blobServiceClient, ILogger<FileService> logger)
    {
        _db = db;
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task<FileMetadata> UploadFileAsync(Stream fileStream, string fileName, DateTime storageExpirationUtc, string createdBy)
    {
        var container = _blobServiceClient.GetBlobContainerClient(ContainerName);
        await container.CreateIfNotExistsAsync();

        var blobName = $"{Guid.NewGuid()}/{fileName}";
        var blobClient = container.GetBlobClient(blobName);
        await blobClient.UploadAsync(fileStream, overwrite: true);

        var metadata = new FileMetadata
        {
            FileName = fileName,
            BlobName = blobName,
            StorageExpirationUtc = storageExpirationUtc,
            CreatedBy = createdBy
        };

        _db.FileMetadatas.Add(metadata);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Uploaded blob {BlobName} for user {CreatedBy}", blobName, createdBy);
        return metadata;
    }

    public Task<string> GenerateSasTokenAsync(string blobName, DateTime linkExpirationUtc)
    {
        var container = _blobServiceClient.GetBlobContainerClient(ContainerName);
        var blobClient = container.GetBlobClient(blobName);

        if (!blobClient.CanGenerateSasUri)
            throw new InvalidOperationException("BlobClient is not configured for SAS generation. Ensure a StorageSharedKeyCredential is used.");

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = ContainerName,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = linkExpirationUtc
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return Task.FromResult(blobClient.GenerateSasUri(sasBuilder).ToString());
    }

    public async Task<FileMetadata?> GetFileMetadataAsync(string fileId)
    {
        return await _db.FileMetadatas.FindAsync(fileId);
    }

    public async Task<List<FileMetadata>> GetFilesByUserAsync(string userId)
    {
        return await _db.FileMetadatas
            .Where(f => f.CreatedBy == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }
}
