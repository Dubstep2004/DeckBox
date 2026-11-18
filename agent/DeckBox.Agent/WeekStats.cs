using System.Text.Json;

namespace DeckBox.Agent;

/// <summary>One day of the weekly statistics: minutes on, the CPU load summed per minute, minutes per app and in games.</summary>
public sealed class StatsDay
{
    public string Date { get; set; } = "";
    public int Minutes { get; set; }
    public double CpuSum { get; set; }
    public int CpuSamples { get; set; }
    public int GameMinutes { get; set; }
    public Dictionary<string, int> Apps { get; set; } = [];
}

/// <summary>
/// «Статистика за неделю»: once a minute adds the minute to today (the computer is on, the CPU load, the app in front,
/// whether a game runs). Keeps the last 8 days in stats.json next to config.json; nothing leaves the computer.
/// </summary>
public sealed class WeekStats(SystemMonitor system, ILogger<WeekStats> log) : BackgroundService
{
    internal static string FilePath = Path.Combine(AppPaths.ConfigDir, "stats.json");
    private readonly Lock _gate = new();
    private List<StatsDay>? _days;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(30), ct);
        while (!ct.IsCancellationRequested)
        {
            try { Add(DateTime.Now, system.Snapshot()?.Cpu, GameMonitor.Front?.Process, GameMonitor.Current is not null); }
            catch (Exception ex) { log.LogDebug("stats: {Msg}", ex.Message); }
            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }

    internal void Add(DateTime now, double? cpu, string? app, bool game)
    {
        lock (_gate)
        {
            var days = Load();
            var date = Day(now);
            var day = days.FirstOrDefault(d => d.Date == date);
            if (day is null) { day = new StatsDay { Date = date }; days.Add(day); }
            day.Minutes++;
            if (cpu is { } c) { day.CpuSum += c; day.CpuSamples++; }
            if (game) day.GameMinutes++;
            if (!string.IsNullOrWhiteSpace(app) && !app.Equals("deckboxagent", StringComparison.OrdinalIgnoreCase))
                day.Apps[app] = day.Apps.GetValueOrDefault(app) + 1;
            // the 40 busiest apps of a day are plenty for the top 5 of a week
            if (day.Apps.Count > 60) day.Apps = day.Apps.OrderByDescending(a => a.Value).Take(40).ToDictionary();
            days.RemoveAll(d => string.CompareOrdinal(d.Date, Day(now.AddDays(-7))) < 0);
            Save(days);
        }
    }

    /// <summary>The last 7 days for the panel: per day hours on and average CPU, totals and the top apps.</summary>
    public object Summary(DateTime? today = null)
    {
        lock (_gate)
        {
            var now = today ?? DateTime.Now;
            var days = Load();
            var week = Enumerable.Range(0, 7).Select(i => now.Date.AddDays(i - 6)).Select(d =>
            {
                var s = days.FirstOrDefault(x => x.Date == Day(d));
                return new
                {
                    date = Day(d),
                    minutes = s?.Minutes ?? 0,
                    cpu = s is { CpuSamples: > 0 } ? Math.Round(s.CpuSum / s.CpuSamples, 1) : (double?)null,
                    game = s?.GameMinutes ?? 0,
                };
            }).ToList();
            var inWeek = days.Where(d => week.Any(w => w.date == d.Date)).ToList();
            var samples = inWeek.Sum(d => d.CpuSamples);
            return new
            {
                days = week,
                totalMinutes = week.Sum(d => d.minutes),
                gameMinutes = week.Sum(d => d.game),
                avgCpu = samples > 0 ? Math.Round(inWeek.Sum(d => d.CpuSum) / samples, 1) : (double?)null,
                apps = inWeek.SelectMany(d => d.Apps).GroupBy(a => a.Key, StringComparer.OrdinalIgnoreCase)
                    .Select(g => new { name = g.Key, minutes = g.Sum(a => a.Value) })
                    .OrderByDescending(a => a.minutes).Take(5).ToList(),
            };
        }
    }

    /// <summary>"2026-11-18" in the Gregorian calendar whatever the culture (th-TH would give 2569, ar-SA the Hijri year).</summary>
    internal static string Day(DateTime d) => d.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

    private List<StatsDay> Load()
    {
        if (_days is not null) return _days;
        try { _days = File.Exists(FilePath) ? JsonSerializer.Deserialize<List<StatsDay>>(File.ReadAllText(FilePath)) : null; }
        catch (Exception ex) when (ex is IOException or JsonException) { }
        return _days ??= [];
    }

    private static void Save(List<StatsDay> days)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            var tmp = FilePath + ".tmp";
            File.WriteAllText(tmp, JsonSerializer.Serialize(days));
            File.Move(tmp, FilePath, overwrite: true);
        }
        catch (IOException) { }
    }
}
