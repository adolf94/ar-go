namespace ArGo.Api.Interfaces;

public record UrlMetadata(string? Title, string? Description, string? IconUrl, string? ImageUrl, string? SiteName, string? ThemeColor);

public interface IMetadataService
{
    Task<UrlMetadata> ExtractMetadataAsync(string url);
}
