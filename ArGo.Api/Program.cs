using ArGo.Api.Data;
using ArGo.Api.Interfaces;
using ArGo.Api.Services;
using ArGo.Utilities;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Azure.Identity;


var builder = FunctionsApplication.CreateBuilder(args);

var webapp = builder.ConfigureFunctionsWebApplication();
var config = builder.Configuration;

builder.Services.AddAuthentication();


var appConfig = config.GetRequiredSection("AppConfig").Get<AppConfig>()!;
builder.Services.AddSingleton<AppConfig>(appConfig);

builder.Services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
});
// Cosmos DB via EF Core 9
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (string.IsNullOrWhiteSpace(appConfig.CosmosKey))
    {
        options.UseCosmos(
            appConfig.CosmosEndpoint,
            new DefaultAzureCredential(),
            appConfig.DatabaseName
        );
    }
    else
    {
        options.UseCosmos(
            appConfig.CosmosEndpoint,
            appConfig.CosmosKey,
            appConfig.DatabaseName
        );
    }
});

// Azure Blob Storage
builder.Services.AddSingleton(_ =>
{
    if (Uri.TryCreate(appConfig.AzureStorage, UriKind.Absolute, out var blobUri) &&
        (blobUri.Scheme == Uri.UriSchemeHttp || blobUri.Scheme == Uri.UriSchemeHttps))
    {
        return new BlobServiceClient(blobUri, new DefaultAzureCredential());
    }

    return new BlobServiceClient(appConfig.AzureStorage);
});



// Application Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IRetentionService, RetentionService>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<ICleanupService, CleanupService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<ILinkService, LinkService>();
builder.Services.AddScoped<IMetadataService, MetadataService>();

webapp.UseMiddleware<AppMiddleware>();

builder.Build().Run();
