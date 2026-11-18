using DeckBox.Agent;
using Xunit;

/// <summary>The old PhoneBox does not get in DeckBox's way: its autostart goes, its app can be uninstalled from the panel.</summary>
public class LegacyPhoneBoxTests
{
    [Fact]
    public void RemovesTheOldAutostartAndLeavesOtherShortcuts()
    {
        var dir = Path.Combine(Path.GetTempPath(), "deckbox-legacy-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            File.WriteAllText(Path.Combine(dir, "PhoneBox.lnk"), "");
            File.WriteAllText(Path.Combine(dir, "DeckBox.lnk"), "");
            var done = LegacyPhoneBox.StopOnPc(dir);
            Assert.False(File.Exists(Path.Combine(dir, "PhoneBox.lnk")));
            Assert.True(File.Exists(Path.Combine(dir, "DeckBox.lnk")));
            Assert.Contains(done, d => d.Contains("PhoneBox.lnk"));
        }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public void NeverStopsDeckBoxItself() => Assert.DoesNotContain(LegacyPhoneBox.ProcessNames, n => n.Contains("DeckBox", StringComparison.OrdinalIgnoreCase));

    [Fact]
    public void ThePanelMayAskForTheUninstallOverWiFi() => Assert.True(Lan.AllowedOverLan("/api/legacy/uninstall"));
}
