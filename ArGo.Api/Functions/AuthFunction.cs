using ArGo.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Net.Http;

namespace ArGo.Api.Functions
{
    public class AuthFunction
    {
        private readonly AppConfig _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AuthFunction> _logger;

        public AuthFunction(AppConfig config, IHttpClientFactory httpClientFactory, ILogger<AuthFunction> logger)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        [Function(nameof(ProxyLogin))]
        public async Task<IActionResult> ProxyLogin([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/google_credential")] HttpRequest req)
        {
            if (string.IsNullOrEmpty(_config.AuthUrl)) return new NotFoundResult();
            
            var client = _httpClientFactory.CreateClient();
            var targetUrl = $"{_config.AuthUrl.TrimEnd('/')}/api/auth/google_credential";

            _logger.LogInformation("Proxying Login to: {TargetUrl}", targetUrl);

            // 1. Read the incoming body as a string (or stream)
            using var reader = new StreamReader(req.Body);
            var bodyContent = await reader.ReadToEndAsync();

            // 2. Create the content with the specific Media Type
            var content = new StringContent(bodyContent, System.Text.Encoding.UTF8, "application/json");

            // 3. Send only the body to the destination
            var response = await client.PostAsync(targetUrl, content);

            // 4. Return the result to your frontend
            var result = await response.Content.ReadAsStringAsync();
            
            return new ContentResult()
            {
                Content = result,
                ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json",
                StatusCode = (int)response.StatusCode
            };
        }

        [Function(nameof(ProxyRefresh))]
        public async Task<IActionResult> ProxyRefresh([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/refresh")] HttpRequest req)
        {
            if (string.IsNullOrEmpty(_config.AuthUrl)) return new NotFoundResult();

            var client = _httpClientFactory.CreateClient();
            var targetUrl = $"{_config.AuthUrl.TrimEnd('/')}/api/auth/refresh";

            _logger.LogInformation("Proxying Token Refresh to: {TargetUrl}", targetUrl);

            // 1. Read the incoming body as a string (or stream)
            using var reader = new StreamReader(req.Body);
            var bodyContent = await reader.ReadToEndAsync();

            // 2. Create the content with the specific Media Type
            var content = new StringContent(bodyContent, System.Text.Encoding.UTF8, "application/json");

            // 3. Send only the body to the destination
            var response = await client.PostAsync(targetUrl, content);

            // 4. Return the result to your frontend
            var result = await response.Content.ReadAsStringAsync();

            if (response.StatusCode != System.Net.HttpStatusCode.OK) return new StatusCodeResult((int)response.StatusCode);

            return new ContentResult()
            {
                Content = result,
                ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json",
                StatusCode = (int)response.StatusCode
            };
        }
    }
}
