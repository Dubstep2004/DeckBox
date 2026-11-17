using System.Text.Json;
using DeckBox.Agent;
using Xunit;

/// <summary>DeckBox was renamed from PhoneBox: settings carry over and never point back at the original project.</summary>
public class RenameMigrationTests
{
    private static AgentConfig Load(string json)
    {
        var path = Path.Combine(Path.GetTempPath(), $"deckbox-cfg-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, json);
        try { return new ConfigStore(path).Get(); }
        finally { File.Delete(path); }
    }

    [Fact]
    public void UpstreamUpdateRepoIsReplacedWithDeckBoxReleases()
    {
        var c = Load("""{"updates":{"auto":false,"repo":"ersinkoc/phonebox"}}""");
        Assert.Equal("Dubstep2004/DeckBox", c.Updates.Repo);
        Assert.True(c.Updates.Auto);
    }

    [Fact]
    public void OwnRepoKeepsTheChosenAutoUpdateSetting()
    {
        var c = Load("""{"updates":{"auto":false,"repo":"Dubstep2004/DeckBox"}}""");
        Assert.Equal("Dubstep2004/DeckBox", c.Updates.Repo);
        Assert.False(c.Updates.Auto);
    }

    [Fact]
    public void NewInstallsUpdateFromDeckBoxAutomatically()
    {
        var c = Load("{}");
        Assert.Equal("Dubstep2004/DeckBox", c.Updates.Repo);
        Assert.True(c.Updates.Auto);
    }

    [Fact]
    public void LegacySettingsFolderIsCopiedWithSubfolders()
    {
        var root = Path.Combine(Path.GetTempPath(), $"deckbox-mig-{Guid.NewGuid():N}");
        var from = Path.Combine(root, "PhoneBox");
        var to = Path.Combine(root, "DeckBox");
        try
        {
            Directory.CreateDirectory(Path.Combine(from, "icons"));
            File.WriteAllText(Path.Combine(from, "config.json"), "{\"a\":1}");
            File.WriteAllText(Path.Combine(from, "icons", "k1.png"), "png");

            Assert.True(AppPaths.MigrateConfigFolder(from, to));
            Assert.Equal("{\"a\":1}", File.ReadAllText(Path.Combine(to, "config.json")));
            Assert.Equal("png", File.ReadAllText(Path.Combine(to, "icons", "k1.png")));
            Assert.True(File.Exists(Path.Combine(from, "config.json"))); // the old folder is left as it was
        }
        finally { Directory.Delete(root, true); }
    }

    [Fact]
    public void ExistingDeckBoxSettingsAreNeverOverwritten()
    {
        var root = Path.Combine(Path.GetTempPath(), $"deckbox-mig-{Guid.NewGuid():N}");
        var from = Path.Combine(root, "PhoneBox");
        var to = Path.Combine(root, "DeckBox");
        try
        {
            Directory.CreateDirectory(from);
            Directory.CreateDirectory(to);
            File.WriteAllText(Path.Combine(from, "config.json"), "old");
            File.WriteAllText(Path.Combine(to, "config.json"), "new");

            Assert.False(AppPaths.MigrateConfigFolder(from, to));
            Assert.Equal("new", File.ReadAllText(Path.Combine(to, "config.json")));
        }
        finally { Directory.Delete(root, true); }
    }

    [Fact]
    public void TheUpdaterFindsTheFilesThatTheDeckBoxReleasePublishes()
    {
        static string Asset(string name) =>
            "{\"name\":\"" + name + "\",\"browser_download_url\":\"https://github.com/Dubstep2004/DeckBox/releases/download/v1.0.0/" + name + "\"}";
        var assets = string.Join(",", new[] { "DeckBox-Setup-1.0.0.exe", "DeckBox-1.0.0.apk", "DeckBoxAgent-1.0.0-win-x64.zip", "SHA256SUMS-1.0.0.txt" }.Select(Asset));
        var json = "{\"tag_name\":\"v1.0.0\",\"html_url\":\"https://github.com/Dubstep2004/DeckBox/releases/tag/v1.0.0\",\"assets\":[" + assets + "]}";
        using var doc = JsonDocument.Parse(json);
        var r = UpdateService.SelectAssets(doc.RootElement, "win-x64");
        Assert.Equal("1.0.0", r.Version);
        Assert.EndsWith("/DeckBox-1.0.0.apk", r.Apk);
        Assert.EndsWith("/DeckBoxAgent-1.0.0-win-x64.zip", r.AgentZip);
        Assert.EndsWith("/SHA256SUMS-1.0.0.txt", r.Sums);
    }

    [Fact]
    public void NothingToMigrateWithoutALegacyConfig()
    {
        var root = Path.Combine(Path.GetTempPath(), $"deckbox-mig-{Guid.NewGuid():N}");
        Assert.False(AppPaths.MigrateConfigFolder(Path.Combine(root, "PhoneBox"), Path.Combine(root, "DeckBox")));
        Assert.False(Directory.Exists(root));
    }
}
