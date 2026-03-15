namespace ArGo.Api.Interfaces;

public interface ICleanupService
{
    Task ProcessExpiredFilesAsync();
}
