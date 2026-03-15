using System.Text.Json.Serialization;

namespace ArGo.Api.Entities;

public enum LinkType
{
    UrlRedirect,
    FileAccess
}

public class LinkMetadata
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ShortCode { get; set; } = string.Empty;
    public LinkType Type { get; set; }

    // For UrlRedirect
    public string? LongUrl { get; set; }

    // For FileAccess
    public string? FileId { get; set; }
    [JsonIgnore]
    public FileMetadata? File { get; set; }

    // Metadata
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? SiteName { get; set; }
    public string? ThemeColor { get; set; }
    public bool MetadataFetched { get; set; }

    public DateTime? ExpirationUtc { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
}
