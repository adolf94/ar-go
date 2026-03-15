using ArGo.Api.Entities;

namespace ArGo.Api.Entities;

public class DeletedLinkHistory
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ShortCode { get; set; } = string.Empty;
    public LinkType Type { get; set; }
    public string? LongUrl { get; set; }
    public string? FileId { get; set; }
    public string DeletedBy { get; set; } = "CleanupService";
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
    public string Reason { get; set; } = "Expired";
    public string? OriginalCreatedBy { get; set; }
}
