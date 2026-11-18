using System.Diagnostics;

namespace DeckBox.Agent;

/// <summary>
/// The old PhoneBox (DeckBox's predecessor) must not get in the way: on the computer its agent takes the same port
/// (8765) and its own autostart brings it back at every sign-in; on the phone its app is a second panel. DeckBox stops
/// the old agent and removes its autostart at every start, and the panel offers to uninstall the old app.
/// </summary>
public static class LegacyPhoneBox
{
    public const string AppPackage = "net.oxog.phonebox";
    internal static readonly string[] ProcessNames = ["PhoneBoxAgent", "PhoneBox"];

    /// <summary>Stops the old agent and removes its autostart (Windows; elsewhere only the process). Returns what it did.</summary>
    public static List<string> StopOnPc(string? startupDir = null)
    {
        var done = new List<string>();
        foreach (var name in ProcessNames)
        {
            Process[] procs;
            try { procs = Process.GetProcessesByName(name); } catch (InvalidOperationException) { continue; }
            foreach (var p in procs)
            {
                using (p)
                {
                    if (p.Id == Environment.ProcessId) continue;
                    try { p.Kill(true); p.WaitForExit(3000); done.Add($"остановлен {name} (pid {p.Id})"); }
                    catch (Exception e) when (e is InvalidOperationException or System.ComponentModel.Win32Exception or NotSupportedException) { }
                }
            }
        }
        var startup = startupDir ?? Environment.GetFolderPath(Environment.SpecialFolder.Startup);
        if (!string.IsNullOrEmpty(startup))
            foreach (var lnk in new[] { "PhoneBox.lnk", "PhoneBox Agent.lnk", "PhoneBoxAgent.lnk" })
            {
                var f = Path.Combine(startup, lnk);
                try { if (File.Exists(f)) { File.Delete(f); done.Add("убран автозапуск " + lnk); } }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
            }
#if WINDOWS
        try
        {
            using var run = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", writable: true);
            foreach (var v in run?.GetValueNames() ?? [])
                if (v.StartsWith("PhoneBox", StringComparison.OrdinalIgnoreCase)) { run!.DeleteValue(v, false); done.Add("убран автозапуск " + v); }
        }
        catch (Exception e) when (e is System.Security.SecurityException or UnauthorizedAccessException or IOException) { }
#endif
        return done;
    }
}
