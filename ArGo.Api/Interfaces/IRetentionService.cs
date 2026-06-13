namespace ArGo.Api.Interfaces;

public interface IRetentionService
{
    DateTime CalculateLinkExpiration(LinkTier tier);
    DateTime CalculateStorageExpiration(StorageTier tier);
}

public enum LinkTier
{
    FifteenMinutes,
    OneHour,
    SixHours,
    OneDay,
    SevenDays,
    OneMonth,
    Permanent
}

public enum StorageTier
{
    OneHour,
    OneDay,
    ThreeDays,
    OneWeek,
    TwoWeeks,
    OneMonth,
    TwoMonths,
    ThreeMonths
}
