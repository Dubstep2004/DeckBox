using System.Text.Json;
using DeckBox.Agent;
using Xunit;

namespace DeckBox.Agent.Tests;

/// <summary>1.7.0: only the part a release changes is downloaded; the card shows the sizes and the speed.</summary>
public class UpdatePartsTests
{
    private const string Release = """
    {"tag_name":"v1.8.0","name":"DeckBox PRO 1.8.0 — Панель","html_url":"https://github.com/Dubstep2004/DeckBox/releases/tag/v1.8.0","body":"",
     "assets":[
      {"name":"DeckBox-1.8.0.apk","size":1400000,"browser_download_url":"https://x/DeckBox-1.8.0.apk"},
      {"name":"DeckBox-Setup-1.8.0.exe","size":50000000,"browser_download_url":"https://x/DeckBox-Setup-1.8.0.exe"},
      {"name":"DeckBoxAgent-1.8.0-win-x64.zip","size":68000000,"browser_download_url":"https://x/DeckBoxAgent-1.8.0-win-x64.zip"},
      {"name":"SHA256SUMS-1.8.0.txt","size":300,"browser_download_url":"https://x/SHA256SUMS-1.8.0.txt"},
      {"name":"PARTS-1.8.0.json","size":50,"browser_download_url":"https://x/PARTS-1.8.0.json"}]}
    """;

    [Fact]
    public void TheReleaseKnowsItsPartsFileAndSizes()
    {
        using var doc = JsonDocument.Parse(Release);
        var r = UpdateService.SelectAssets(doc.RootElement, "win-x64");
        Assert.Equal("https://x/PARTS-1.8.0.json", r.Parts);
        Assert.Equal(1400000, r.ApkSize);
        Assert.Equal(50000000, r.SetupSize);
        Assert.Equal(68000000, r.ZipSize);
        // without PARTS read yet, both parts follow the release (the old behaviour)
        Assert.Equal(("1.8.0", "1.8.0"), (r.AgentNeeds, r.AppNeeds));
        var panelOnly = r with { AgentSince = "1.7.0", AppSince = "1.8.0" };
        Assert.Equal(("1.7.0", "1.8.0"), (panelOnly.AgentNeeds, panelOnly.AppNeeds));
    }

    [Theory]
    [InlineData("""{"version":"1.8.0","agent":"1.7.0","app":"1.8.0"}""", "1.7.0", "1.8.0")]
    [InlineData("""{"agent":"1.8.0"}""", "1.8.0", null)]
    [InlineData("""{"agent":"latest","app":"../x"}""", null, null)]
    [InlineData("not json", null, null)]
    [InlineData(null, null, null)]
    public void PartsFileIsReadCarefully(string? json, string? agent, string? app) =>
        Assert.Equal((agent, app), UpdateService.ParseParts(json));

    [Fact]
    public void TheSpeedIsSmoothedPerSecond()
    {
        var m = new UpdateService.SpeedMeter();
        Assert.Equal(0, m.Add(0, 0));
        Assert.Equal(0, m.Add(500_000, 500)); // under a second: nothing yet
        Assert.Equal(2_000_000, m.Add(2_000_000, 1000));
        var next = m.Add(3_000_000, 2000); // 1 MB/s now: smoothed between 2 and 1
        Assert.InRange(next, 1_000_001, 1_999_999);
    }
}
