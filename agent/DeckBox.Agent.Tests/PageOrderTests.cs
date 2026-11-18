using DeckBox.Agent;
using Xunit;

/// <summary>«Порядок страниц»: the phone reorders and hides pages; nothing else of the settings changes.</summary>
public class PageOrderTests
{
    private static (ConfigStore Store, string Path) Make()
    {
        var path = Path.Combine(Path.GetTempPath(), $"deckbox-order-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, """{"pages":[{"id":"a","title":"A","widgets":[{"id":"c","type":"clock"}]},{"id":"b","title":"B","widgets":[{"id":"n","type":"note","options":{"text":"keep"}}]},{"id":"c","title":"C","enabled":false,"widgets":[]},{"id":"d","title":"D","widgets":[]}]}""");
        return (new ConfigStore(path), path);
    }
    private static void Cleanup(string path) { File.Delete(path); File.Delete(path + ".bak"); }
    private static string Ids(ConfigStore c) => string.Join(",", c.Get().Pages.Select(p => p.Id + (p.Enabled ? "" : "-")));

    [Fact]
    public void ReordersShowsAndHidesPages()
    {
        var (cfg, path) = Make();
        try
        {
            var r = PageOrder.Apply(cfg, ["b", "c", "a"], ["a"]);
            Assert.Equal(200, r.Status);
            Assert.Equal("b,c,a-,d", Ids(cfg)); // c shown again, a hidden, d (left out) keeps its place after them
            Assert.Equal("keep", cfg.Get().Pages.First(p => p.Id == "b").Widgets!.First().Options!["text"].GetString());
        }
        finally { Cleanup(path); }
    }

    [Fact]
    public void RefusesUnknownPagesDuplicatesAndHidingEverything()
    {
        var (cfg, path) = Make();
        try
        {
            Assert.Equal(404, PageOrder.Apply(cfg, ["a", "zz"], []).Status);
            Assert.Equal(400, PageOrder.Apply(cfg, ["a", "a"], []).Status);
            Assert.Equal(400, PageOrder.Apply(cfg, ["a", "b", "c", "d"], ["a", "b", "c", "d"]).Status);
            Assert.Equal(400, PageOrder.Apply(cfg, [], []).Status);
            Assert.Equal("a,b,c-,d", Ids(cfg)); // nothing changed
        }
        finally { Cleanup(path); }
    }

    [Fact]
    public void AnOlderVersionIsAConflict()
    {
        var (cfg, path) = Make();
        try
        {
            var old = cfg.Version;
            Assert.Equal(200, PageOrder.Apply(cfg, ["d", "a", "b", "c"], [], old).Status);
            Assert.Equal(409, PageOrder.Apply(cfg, ["a", "b", "c", "d"], [], old).Status);
        }
        finally { Cleanup(path); }
    }

    [Fact]
    public void ThePhoneMayCallItOverWiFi() => Assert.True(Lan.AllowedOverLan("/api/pages/arrange"));
}
