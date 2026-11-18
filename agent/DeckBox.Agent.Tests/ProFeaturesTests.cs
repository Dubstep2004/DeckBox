using System.IO.Compression;
using System.Text.Json;
using DeckBox.Agent;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DeckBox.Agent.Tests;

/// <summary>DeckBox PRO on the computer: «Не беспокоить», «Статистика за неделю», «Резервная копия», «Игровой режим».</summary>
public class ProFeaturesTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "deckbox-pro-" + Guid.NewGuid().ToString("N"));

    public ProFeaturesTests() => Directory.CreateDirectory(_dir);
    public void Dispose() { try { Directory.Delete(_dir, true); } catch (IOException) { } }

    [Fact]
    public void QuietModeRemembersItsStartAndEndsCleanly()
    {
        QuietMode.FilePath = Path.Combine(_dir, "quiet.json");
        Assert.False(QuietMode.Snapshot().On);
        var on = QuietMode.Set(true, null);
        Assert.True(on.On);
        Assert.NotNull(on.Since);
        // a second "on" keeps the first start (and what was saved before it)
        Assert.Equal(on.Since, QuietMode.Set(true, null).Since);
        Assert.False(QuietMode.Toggle(null).On);
        Assert.False(File.Exists(QuietMode.FilePath));
    }

    [Fact]
    public void WeekStatsSumTheMinutesOfTheLastSevenDays()
    {
        WeekStats.FilePath = Path.Combine(_dir, "stats.json");
        var stats = new WeekStats(null!, NullLogger<WeekStats>.Instance);
        var today = new DateTime(2026, 11, 18, 12, 0, 0);
        for (var i = 0; i < 30; i++) stats.Add(today.AddMinutes(i), 20, "Code", false);
        for (var i = 0; i < 10; i++) stats.Add(today.AddDays(-1).AddMinutes(i), 60, "Cyberpunk2077", true);
        stats.Add(today.AddDays(-9), 99, "old", false); // older than a week: dropped
        var json = JsonSerializer.Serialize(stats.Summary(today));
        using var doc = JsonDocument.Parse(json);
        var r = doc.RootElement;
        Assert.Equal(7, r.GetProperty("days").GetArrayLength());
        Assert.Equal(40, r.GetProperty("totalMinutes").GetInt32());
        Assert.Equal(10, r.GetProperty("gameMinutes").GetInt32());
        Assert.Equal(30.0, r.GetProperty("avgCpu").GetDouble());
        Assert.Equal("Code", r.GetProperty("apps")[0].GetProperty("name").GetString());
        Assert.DoesNotContain("old", json);
    }

    [Fact]
    public async Task ABackupPutsBackTheSettingsAndOnlyPlainIconFiles()
    {
        var store = new ConfigStore(Path.Combine(_dir, "config.json"));
        var icons = Path.Combine(_dir, "icons");
        var cfg = store.Get();
        var json = JsonSerializer.Serialize(new { pages = new[] { new { id = "restored", title = "Из копии", widgets = Array.Empty<object>() } } });
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            using (var w = new StreamWriter(zip.CreateEntry("config.json").Open())) w.Write(json);
            using (var w = zip.CreateEntry("icons/terminal.png").Open()) w.Write([1, 2, 3]);
            using (var w = zip.CreateEntry("icons/../../evil.txt").Open()) w.Write([1]);
            using (var w = zip.CreateEntry("icons/C:evil.dll").Open()) w.Write([1]); // rooted on Windows
        }
        ms.Position = 0;
        var (error, count) = await Backup.RestoreAsync(ms, store, icons);
        Assert.Null(error);
        Assert.Equal(1, count);
        Assert.True(File.Exists(Path.Combine(icons, "terminal.png")));
        Assert.False(File.Exists(Path.Combine(_dir, "evil.txt")));
        Assert.Contains(store.Get().Pages, p => p.Title == "Из копии");
        Assert.NotNull(cfg);
    }

    [Fact]
    public void StatsDaysAreGregorianInAnyCulture()
    {
        var before = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = new System.Globalization.CultureInfo("th-TH");
            Assert.Equal("2026-11-18", WeekStats.Day(new DateTime(2026, 11, 18)));
        }
        finally { System.Globalization.CultureInfo.CurrentCulture = before; }
    }

    [Fact]
    public async Task SomethingElseIsNotABackup()
    {
        var store = new ConfigStore(Path.Combine(_dir, "config.json"));
        var (error, _) = await Backup.RestoreAsync(new MemoryStream([1, 2, 3, 4]), store, Path.Combine(_dir, "icons"));
        Assert.Contains("не резервная копия", error);
    }

    [Fact]
    public void AGameRunningRuleSurvivesSaving()
    {
        var store = new ConfigStore(Path.Combine(_dir, "config.json"));
        var json = """{"rules":[{"when":"game-running","then":"goto","page":"game"}]}""";
        Assert.Null(store.Save(json, null));
        Assert.Contains(store.Get().Rules, r => r.When == "game-running");
    }

    [Theory]
    [InlineData("Cyberpunk2077", @"D:\SteamLibrary\steamapps\common\Cyberpunk 2077\bin\x64\Cyberpunk2077.exe", false, true)]
    [InlineData("chrome", @"C:\Program Files\Google\Chrome\Application\chrome.exe", true, false)]
    [InlineData("vlc", @"C:\Program Files\VideoLAN\VLC\vlc.exe", true, false)]
    [InlineData("SomeIndie", @"C:\Indie\SomeIndie.exe", true, true)]
    [InlineData("SomeIndie", @"C:\Indie\SomeIndie.exe", false, false)]
    [InlineData("eldenring", @"E:\Elden\eldenring.exe", false, true)] // listed in the settings
    [InlineData("Battle.net", @"C:\Program Files (x86)\Battle.net\Battle.net.exe", false, false)] // launchers are not games
    [InlineData("RiotClientServices", @"C:\Riot Games\Riot Client\RiotClientServices.exe", false, false)]
    [InlineData("EADesktop", @"C:\Program Files\Electronic Arts\EA Desktop\EA Desktop\EADesktop.exe", false, false)]
    [InlineData("VALORANT-Win64-Shipping", @"C:\Riot Games\VALORANT\live\ShooterGame\Binaries\Win64\VALORANT-Win64-Shipping.exe", false, true)]
    public void GamesAreRecognised(string process, string path, bool fullscreen, bool game) =>
        Assert.Equal(game, GameMonitor.IsGame(new FrontApp(process, path, fullscreen), ["eldenring.exe"]));
}
