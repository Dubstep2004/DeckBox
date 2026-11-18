using DeckBox.Agent;
using Xunit;

namespace DeckBox.Agent.Tests;

/// <summary>The «Сеансы» / «Квоты ИИ» instructions: is Claude Code on this computer, and is it signed in.</summary>
public class ClaudeCodeTests
{
    private static string TempHome()
    {
        var d = Path.Combine(Path.GetTempPath(), "deckbox-cc-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        return d;
    }

    [Fact]
    public void FindsTheNativeInstallOrClaudeOnPath()
    {
        var home = TempHome();
        var pathDir = TempHome();
        try
        {
            Assert.Null(ClaudeCode.Find(home, pathDir, windows: true));
            File.WriteAllText(Path.Combine(pathDir, "claude.cmd"), ""); // npm's shim on Windows
            Assert.Equal(Path.Combine(pathDir, "claude.cmd"), ClaudeCode.Find(home, $"\"{pathDir}\"{Path.PathSeparator}", windows: true));
            Assert.Null(ClaudeCode.Find(home, pathDir, windows: false)); // no claude.cmd outside Windows
            var bin = Path.Combine(home, ".local", "bin");
            Directory.CreateDirectory(bin);
            File.WriteAllText(Path.Combine(bin, "claude.exe"), "");
            Assert.Equal(Path.Combine(bin, "claude.exe"), ClaudeCode.Find(home, "", windows: true)); // the native installer's place first
        }
        finally { Directory.Delete(home, true); Directory.Delete(pathDir, true); }
    }

    [Fact]
    public void SignedInOnlyWithClaudeCodesOwnCredentials()
    {
        var home = TempHome();
        try
        {
            Assert.False(ClaudeCode.HasSignIn(home));
            Directory.CreateDirectory(Path.Combine(home, ".claude", "sessions")); // installed and started, never signed in
            Assert.False(ClaudeCode.HasSignIn(home));
            File.WriteAllText(Path.Combine(home, ".claude", ".credentials.json"), "{}");
            Assert.True(ClaudeCode.HasSignIn(home));
            Assert.False(ClaudeCode.Status(null, home, pathVar: "").SignedIn); // not installed: nothing to sign in with
        }
        finally { Directory.Delete(home, true); }
    }

    [Fact]
    public void ThePhoneCanReachTheButtonsOverWiFi()
    {
        Assert.True(Lan.AllowedOverLan("/api/claude-code"));
        Assert.True(Lan.AllowedOverLan("/api/claude-code/install"));
        Assert.True(Lan.AllowedOverLan("/api/claude-code/signin"));
    }
}

/// <summary>«Время и дата» and the weather units: only values the panel understands are kept.</summary>
public class TimeWeatherSettingsTests
{
    [Theory]
    [InlineData("Asia/Yekaterinburg", "Asia/Yekaterinburg")]
    [InlineData("Europe/Moscow", "Europe/Moscow")]
    [InlineData("UTC", "UTC")]
    [InlineData("", "")]
    [InlineData(null, "")]
    [InlineData("Mars/Olympus", "")]
    [InlineData("../../etc/passwd", "")]
    [InlineData("Asia/Yekaterinburg; rm", "")]
    public void TheTimeZoneIsAKnownZoneOrThePhones(string? input, string expected) =>
        Assert.Equal(expected, ConfigStore.ValidTimeZone(input));

    [Fact]
    public void UnknownUnitsAndFormatsFallBackToTheDefaults()
    {
        var dir = Path.Combine(Path.GetTempPath(), "deckbox-tw-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var path = Path.Combine(dir, "config.json");
            File.WriteAllText(path, """{"weather":{"city":"X","lat":1,"lon":2,"tempUnit":"kelvin","windUnit":"knots"},"display":{"dateFormat":"weird","timeZone":"Nowhere/Land"}}""");
            var c = new ConfigStore(path).Get();
            Assert.Equal("c", c.Weather.TempUnit);
            Assert.Equal("ms", c.Weather.WindUnit);
            Assert.Equal("long", c.Display.DateFormat);
            Assert.Equal("", c.Display.TimeZone);
            File.WriteAllText(path, """{"weather":{"city":"X","lat":1,"lon":2,"tempUnit":"f","windUnit":"kmh"},"display":{"dateFormat":"numeric","timeZone":"Asia/Yekaterinburg"}}""");
            c = new ConfigStore(path).Get();
            Assert.Equal(("f", "kmh", "numeric", "Asia/Yekaterinburg"), (c.Weather.TempUnit, c.Weather.WindUnit, c.Display.DateFormat, c.Display.TimeZone));
        }
        finally { Directory.Delete(dir, true); }
    }
}
