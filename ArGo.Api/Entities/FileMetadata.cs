using System.Text.Json.Serialization;

namespace ArGo.Api.Entities;

public class FileMetadata
{
    public string Id { get; set; } = Guid.CreateVersion7().ToString();
    public string FileName { get; set; } = string.Empty;
    public string BlobName { get; set; } = string.Empty;
    public DateTime StorageExpirationUtc { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public List<LinkMetadata> Links { get; set; } = new();
}
