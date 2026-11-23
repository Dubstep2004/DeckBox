using System.Globalization;
using System.Text.Json;

namespace DeckBox.Agent;

/// <summary>
/// «⚙ Настройки» on the phone (DeckBox PRO): the few settings people change most — theme, weather, time and date, the
/// morning briefing — saved from the panel. Only these fields change; everything else stays as the computer has it.
/// </summary>
public static class QuickSettings
{
    public sealed record Patch(string? Theme, WeatherPatch? Weather, TimePatch? Time, BriefingPatch? Briefing);
    public sealed record WeatherPatch(string? City, double? Lat, double? Lon, string? TempUnit, string? WindUnit);
    public sealed record TimePatch(JsonElement? Hour12, bool? ShowSeconds, string? DateFormat, string? TimeZone);
    public sealed record BriefingPatch(bool? Enabled, List<string>? Tasks);
    public sealed record Result(int Status, string? Error = null, string? Version = null);

    public static Result Apply(ConfigStore cfg, Patch patch, long? expectedVersion = null)
    {
        var version = expectedVersion ?? cfg.Version;
        var copy = JsonSerializer.Deserialize<AgentConfig>(JsonSerializer.Serialize(cfg.Get(), ConfigStore.WriteOpts), ConfigStore.WriteOpts)!;

        if (patch.Theme is { } theme)
        {
            if (theme is not ("pro" or "silver" or "emerald" or "ruby")) return new(400, "unknown theme");
            copy.Display.Theme = theme;
        }
        if (patch.Weather is { } w)
        {
            copy.Weather ??= new();
            if (w.Lat is { } lat && w.Lon is { } lon)
            {
                if (lat is < -90 or > 90 || lon is < -180 or > 180) return new(400, "bad coordinates");
                (copy.Weather.Lat, copy.Weather.Lon) = (Math.Round(lat, 4), Math.Round(lon, 4));
                copy.Weather.City = (w.City ?? "").Trim() is { Length: > 0 and <= 80 } city ? city : copy.Weather.City;
            }
            if (w.TempUnit is { } tu) { if (tu is not ("c" or "f")) return new(400, "bad temperature unit"); copy.Weather.TempUnit = tu; }
            if (w.WindUnit is { } wu) { if (wu is not ("ms" or "kmh" or "mph")) return new(400, "bad wind unit"); copy.Weather.WindUnit = wu; }
        }
        if (patch.Time is { } t)
        {
            if (t.Hour12 is { } h12)
                copy.Display.Hour12 = h12.ValueKind switch
                {
                    JsonValueKind.True => "true", JsonValueKind.False => "false",
                    JsonValueKind.String when h12.GetString() is "auto" or "true" or "false" => h12.GetString()!,
                    _ => copy.Display.Hour12,
                };
            if (t.ShowSeconds is { } sec) copy.Display.ShowSeconds = sec;
            if (t.DateFormat is { } df) { if (df is not ("long" or "full" or "short" or "numeric")) return new(400, "bad date format"); copy.Display.DateFormat = df; }
            if (t.TimeZone is { } tz)
            {
                var ok = ConfigStore.ValidTimeZone(tz);
                if (tz.Length > 0 && ok.Length == 0) return new(400, "unknown time zone");
                copy.Display.TimeZone = ok;
            }
        }
        if (patch.Briefing is { } b)
        {
            copy.Briefing ??= new();
            if (b.Enabled is { } en) copy.Briefing.Enabled = en;
            if (b.Tasks is { } tasks)
                copy.Briefing.Tasks = tasks.Select(x => (x ?? "").Trim()).Where(x => x.Length > 0).Select(x => x.Length > 120 ? x[..120] : x).Take(20).ToList();
        }

        var err = cfg.Save(JsonSerializer.Serialize(copy, ConfigStore.WriteOpts), version, out var saved);
        if (err == ConfigStore.Conflict) return new(409, err);
        return err is null ? new(200, null, saved.ToString(CultureInfo.InvariantCulture)) : new(400, err);
    }
}
