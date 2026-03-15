using ArGo.Api.Interfaces;

namespace ArGo.Api.Services;

public class RetentionService : IRetentionService
{
    public DateTime CalculateLinkExpiration(LinkTier tier) =>
        tier switch
        {
            LinkTier.FifteenMinutes => DateTime.UtcNow.AddMinutes(15),
            LinkTier.OneHour        => DateTime.UtcNow.AddHours(1),
            LinkTier.OneDay         => DateTime.UtcNow.AddDays(1),
            _ => throw new ArgumentOutOfRangeException(nameof(tier))
        };

    public DateTime CalculateStorageExpiration(StorageTier tier) =>
        tier switch
        {
            StorageTier.OneHour      => DateTime.UtcNow.AddHours(1),
            StorageTier.OneDay       => DateTime.UtcNow.AddDays(1),
            StorageTier.ThreeDays    => DateTime.UtcNow.AddDays(3),
            StorageTier.OneWeek      => DateTime.UtcNow.AddDays(7),
            StorageTier.TwoWeeks     => DateTime.UtcNow.AddDays(14),
            StorageTier.OneMonth     => DateTime.UtcNow.AddMonths(1),
            StorageTier.TwoMonths    => DateTime.UtcNow.AddMonths(2),
            StorageTier.ThreeMonths  => DateTime.UtcNow.AddMonths(3),
            _ => throw new ArgumentOutOfRangeException(nameof(tier))
        };
}
