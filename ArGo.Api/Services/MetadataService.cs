using ArGo.Api.Interfaces;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ArGo.Api.Services;

public class MetadataService : IMetadataService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MetadataService> _logger;

    public MetadataService(HttpClient httpClient, ILogger<MetadataService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        _httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
        _httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
    }

    public async Task<UrlMetadata> ExtractMetadataAsync(string url)
    {
        // 1. Try manual scraping first
        var metadata = await ScrapeMetadataManualAsync(url);

        // 2. If manual scraping failed or returned very little info, fallback to JsonLink
        if (metadata == null || string.IsNullOrEmpty(metadata.Title))
        {
            _logger.LogInformation("Manual scraping failed or returned no title for {Url}. Falling back to JsonLink.", url);
            var fallback = await FetchMetadataFromJsonLinkAsync(url);
            
            // If JsonLink worked, use it. Otherwise return the (possibly empty) manual result
            if (!string.IsNullOrEmpty(fallback.Title))
            {
                return fallback;
            }
        }

        return metadata ?? new UrlMetadata(null, null, null, null, null, null);
    }

    private async Task<UrlMetadata?> ScrapeMetadataManualAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetAsync(url);
            
            // Check for success or common bot-blocking codes (like 999)
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Manual scrape returned {StatusCode} for {Url}", response.StatusCode, url);
                return null;
            }

            var html = await response.Content.ReadAsStringAsync();
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var title = doc.DocumentNode.SelectSingleNode("//title")?.InnerText?.Trim()
                        ?? doc.DocumentNode.SelectSingleNode("//meta[@property='og:title']")?.GetAttributeValue("content", "")
                        ?? doc.DocumentNode.SelectSingleNode("//meta[@name='twitter:title']")?.GetAttributeValue("content", "");

            var description = doc.DocumentNode.SelectSingleNode("//meta[@name='description']")?.GetAttributeValue("content", "")
                              ?? doc.DocumentNode.SelectSingleNode("//meta[@property='og:description']")?.GetAttributeValue("content", "")
                              ?? doc.DocumentNode.SelectSingleNode("//meta[@name='twitter:description']")?.GetAttributeValue("content", "");

            var iconUrl = doc.DocumentNode.SelectSingleNode("//link[@rel='icon']")?.GetAttributeValue("href", "")
                          ?? doc.DocumentNode.SelectSingleNode("//link[@rel='shortcut icon']")?.GetAttributeValue("href", "")
                          ?? doc.DocumentNode.SelectSingleNode("//link[@rel='apple-touch-icon']")?.GetAttributeValue("href", "");

            var imageUrl = doc.DocumentNode.SelectSingleNode("//meta[@property='og:image']")?.GetAttributeValue("content", "")
                           ?? doc.DocumentNode.SelectSingleNode("//meta[@name='twitter:image']")?.GetAttributeValue("content", "");

            var siteName = doc.DocumentNode.SelectSingleNode("//meta[@property='og:site_name']")?.GetAttributeValue("content", "");

            var themeColor = doc.DocumentNode.SelectSingleNode("//meta[@name='theme-color']")?.GetAttributeValue("content", "");

            // Handle relative URLs for icon/image
            if (!string.IsNullOrEmpty(iconUrl) && !iconUrl.StartsWith("http"))
            {
                iconUrl = new Uri(new Uri(url), iconUrl).ToString();
            }
            if (!string.IsNullOrEmpty(imageUrl) && !imageUrl.StartsWith("http"))
            {
                imageUrl = new Uri(new Uri(url), imageUrl).ToString();
            }

            return new UrlMetadata(
                WebUtility.HtmlDecode(title ?? ""),
                WebUtility.HtmlDecode(description ?? ""),
                iconUrl,
                imageUrl,
                siteName,
                themeColor
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception during manual scrape for {Url}", url);
            return null;
        }
    }

    private async Task<UrlMetadata> FetchMetadataFromJsonLinkAsync(string url)
    {
        try
        {
            var jsonLinkUrl = $"https://jsonlink.io/api/extract?url={Uri.EscapeDataString(url)}";
            var response = await _httpClient.GetAsync(jsonLinkUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                return new UrlMetadata(null, null, null, null, null, null);
            }

            var json = await response.Content.ReadAsStringAsync();
            using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
            var root = jsonDoc.RootElement;

            var title = root.TryGetProperty("title", out var t) ? t.GetString() : null;
            var description = root.TryGetProperty("description", out var d) ? d.GetString() : null;
            var imageUrl = root.TryGetProperty("image", out var img) ? img.GetString() : null;
            var siteName = root.TryGetProperty("sitename", out var sn) ? sn.GetString() : null;
            var iconUrl = root.TryGetProperty("favicon", out var fav) ? fav.GetString() : null;

            return new UrlMetadata(title, description, iconUrl, imageUrl, siteName, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch from JsonLink for {Url}", url);
            return new UrlMetadata(null, null, null, null, null, null);
        }
    }
}
