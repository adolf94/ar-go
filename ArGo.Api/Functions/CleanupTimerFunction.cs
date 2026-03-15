using ArGo.Api.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.Timer;
using Microsoft.Extensions.Logging;


namespace ArGo.Api.Functions;

public class CleanupTimerFunction
{
    private readonly ICleanupService _cleanupService;
    private readonly ILogger<CleanupTimerFunction> _logger;

    public CleanupTimerFunction(ICleanupService cleanupService, ILogger<CleanupTimerFunction> logger)
    {
        _cleanupService = cleanupService;
        _logger = logger;
    }

    // Runs every 30 minutes
    [Function(nameof(CleanupTimerFunction))]
    public async Task Run([TimerTrigger("0 */30 * * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("Cleanup timer triggered at: {Time}", DateTime.UtcNow);
        await _cleanupService.ProcessExpiredFilesAsync();
        _logger.LogInformation("Cleanup run complete.");
    }
}
