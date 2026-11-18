using System.Text.Json;

namespace DeckBox.Agent;

/// <summary>
/// «Не беспокоить»: one button on the phone mutes the computer and turns off Windows notification banners; the second
/// press puts back exactly what was there before (a computer that was already muted stays muted). The state lives in
/// quiet.json next to config.json, so a restart of the agent in between still restores it.
/// </summary>
public static class QuietMode
{
    public sealed record State(bool On, long? Since);
    private sealed record Saved(bool WasMuted, int? Toasts, long Since);

    private const string NotificationsKey = @"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings";
    private const string ToastsValue = "NOC_GLOBAL_SETTING_TOASTS_ENABLED";
    private static readonly Lock Gate = new();

    /// <summary>Overridable for tests.</summary>
    internal static string FilePath = Path.Combine(AppPaths.ConfigDir, "quiet.json");

    public static State Snapshot()
    {
        var s = Read();
        return new State(s is not null, s?.Since);
    }

    public static State Set(bool on, AudioControl? audio)
    {
        lock (Gate)
        {
            var saved = Read();
            if (on && saved is null)
            {
                var wasMuted = audio?.Snapshot()?.Muted ?? false;
                var toasts = ReadToasts();
                saved = new Saved(wasMuted, toasts, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
                Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
                File.WriteAllText(FilePath, JsonSerializer.Serialize(saved));
                audio?.SetMute(true);
                WriteToasts(0);
            }
            else if (!on && saved is not null)
            {
                if (!saved.WasMuted) audio?.SetMute(false);
                WriteToasts(saved.Toasts);
                try { File.Delete(FilePath); } catch (IOException) { }
            }
            return Snapshot();
        }
    }

    public static State Toggle(AudioControl? audio) => Set(!Snapshot().On, audio);

    private static Saved? Read()
    {
        try { return File.Exists(FilePath) ? JsonSerializer.Deserialize<Saved>(File.ReadAllText(FilePath)) : null; }
        catch (Exception ex) when (ex is IOException or JsonException) { return null; }
    }

    private static int? ReadToasts()
    {
        if (!OperatingSystem.IsWindows()) return null;
        try
        {
            using var k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(NotificationsKey);
            return k?.GetValue(ToastsValue) is int v ? v : null;
        }
        catch (Exception) { return null; }
    }

    /// <summary>null deletes the value: Windows then shows notifications again (its default).</summary>
    private static void WriteToasts(int? value)
    {
        if (!OperatingSystem.IsWindows()) return;
        try
        {
            using var k = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(NotificationsKey);
            if (value is { } v) k.SetValue(ToastsValue, v, Microsoft.Win32.RegistryValueKind.DWord);
            else k.DeleteValue(ToastsValue, throwOnMissingValue: false);
        }
        catch (Exception) { }
    }
}
