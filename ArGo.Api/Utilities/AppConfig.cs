
namespace ArGo.Utilities
{
    public class AppConfig
    {
        public string CosmosEndpoint { get; set; } = string.Empty;
        public string CosmosKey { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string AzureStorage { get; set; } = string.Empty;
        public string AuthUrl { get; set; } = string.Empty;

        public JwtConfiguration ArAuthConfig { get; set; } = new();
    }
    public class JwtConfiguration
    {
        public string Authority { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
    }

}