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
    OneDay
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
