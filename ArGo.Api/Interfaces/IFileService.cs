using ArGo.Api.Entities;

namespace ArGo.Api.Interfaces;

public interface IFileService
{
    Task<FileMetadata> UploadFileAsync(Stream fileStream, string fileName, DateTime storageExpirationUtc, string createdBy);
    Task<string> GenerateSasTokenAsync(string blobName, DateTime linkExpirationUtc);
    Task<FileMetadata?> GetFileMetadataAsync(string fileId);
    Task<List<FileMetadata>> GetFilesByUserAsync(string userId);
}
