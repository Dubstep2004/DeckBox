using System.Text.Json;
using DeckBox.Agent;
using Xunit;

/// <summary>«⚙ Настройки» on the phone: only theme, weather, time and briefing change, and only to valid values.</summary>
public class QuickSettingsTests
{
    private static (ConfigStore, string) Make()
    {
        var path = Path.Combine(Path.GetTempPath(), $"deckbox-quick-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, """{"weather":{"city":"Москва","lat":55.75,"lon":37.62},"pages":[{"id":"a","title":"A","widgets":[{"id":"n","type":"note","options":{"text":"keep"}}]}]}""");
        return (new ConfigStore(path), path);
    }
    private static void Clean(string p) { File.Delete(p); File.Delete(p + ".bak"); }
    private static JsonElement J(string s) => JsonDocument.Parse(s).RootElement;

    [Fact]
    public void SavesTheChosenSettingsAndNothingElse()
    {
        var (cfg, path) = Make();
        try
        {
            var r = QuickSettings.Apply(cfg, new("emerald", new("Екатеринбург", 56.8389, 60.6057, "f", "kmh"),
                new(J("true"), false, "numeric", "Asia/Yekaterinburg"), new(true, ["Почта", "  ", "Зарядка"])));
            Assert.Equal(200, r.Status);
            var c = cfg.Get();
            Assert.Equal("emerald", c.Display.Theme);
            Assert.Equal(("Екатеринбург", 56.8389, 60.6057, "f", "kmh"), (c.Weather.City, c.Weather.Lat, c.Weather.Lon, c.Weather.TempUnit, c.Weather.WindUnit));
            Assert.Equal(("true", false, "numeric", "Asia/Yekaterinburg"), (c.Display.Hour12, c.Display.ShowSeconds, c.Display.DateFormat, c.Display.TimeZone));
            Assert.Equal(["Почта", "Зарядка"], c.Briefing.Tasks);
            Assert.Equal("keep", c.Pages[0].Widgets![0].Options!["text"].GetString());
        }
        finally { Clean(path); }
    }

    [Theory]
    [InlineData("{\"theme\":\"pink\"}")]
    [InlineData("{\"weather\":{\"lat\":95,\"lon\":10}}")]
    [InlineData("{\"weather\":{\"tempUnit\":\"k\"}}")]
    [InlineData("{\"time\":{\"timeZone\":\"Mars/Base\"}}")]
    [InlineData("{\"time\":{\"dateFormat\":\"weird\"}}")]
    public void RefusesWhatThePanelCannotShow(string json)
    {
        var (cfg, path) = Make();
        try
        {
            var patch = JsonSerializer.Deserialize<QuickSettings.Patch>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            Assert.Equal(400, QuickSettings.Apply(cfg, patch).Status);
            Assert.Equal("pro", cfg.Get().Display.Theme);
        }
        finally { Clean(path); }
    }

    [Fact]
    public void AnOlderVersionIsAConflict()
    {
        var (cfg, path) = Make();
        try
        {
            var v = cfg.Version;
            Assert.Equal(200, QuickSettings.Apply(cfg, new("ruby", null, null, null), v).Status);
            Assert.Equal(409, QuickSettings.Apply(cfg, new("silver", null, null, null), v).Status);
        }
        finally { Clean(path); }
    }

    [Fact]
    public void ThePhoneMayUseItOverWiFi() => Assert.True(Lan.AllowedOverLan("/api/settings/quick"));
}
