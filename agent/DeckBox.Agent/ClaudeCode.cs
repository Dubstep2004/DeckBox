using System.Diagnostics;

namespace DeckBox.Agent;

/// <param name="Installed">claude is on this computer (the native installer's ~/.local/bin, or anywhere on PATH)</param>
/// <param name="SignedIn">Claude Code has its sign-in on this computer (~/.claude/.credentials.json), or the quota check works</param>
/// <param name="Installing">the installer runs now (started from the panel or the settings page)</param>
/// <param name="Error">why the last install failed, in Russian</param>
public sealed record ClaudeCodeStatus(bool Installed, bool SignedIn, bool Installing, string? Error, bool CanInstall);

/// <summary>
/// Claude Code on this computer, for the «Сеансы» and «Квоты ИИ» widgets: whether it is installed and signed in, and two
/// buttons for people who never used a terminal — install it with Anthropic's official installer, and open a terminal
/// window with <c>claude</c> so they can sign in. Nothing runs unless someone taps a button.
/// </summary>
public static class ClaudeCode
{
    public const string WindowsInstall = "irm https://claude.ai/install.ps1 | iex";
    public const string UnixInstall = "curl -fsSL https://claude.ai/install.sh | bash";

    private static readonly string Home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    private static int _installing;
    private static string? _error;

    /// <summary>Where the native installer puts claude, or the first claude on PATH; null when there is none.</summary>
    internal static string? Find(string? home = null, string? pathVar = null, bool? windows = null)
    {
        home ??= Home;
        var win = windows ?? OperatingSystem.IsWindows();
        var name = win ? "claude.exe" : "claude";
        var native = Path.Combine(home, ".local", "bin", name);
        if (File.Exists(native)) return native;
        foreach (var dir in (pathVar ?? Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            string[] names = win ? [name, "claude.cmd"] : [name];
            foreach (var n in names)
            {
                try { var p = Path.Combine(dir.Trim('"'), n); if (File.Exists(p)) return p; }
                catch (ArgumentException) { } // a malformed PATH entry
            }
        }
        return null;
    }

    internal static bool HasSignIn(string? home = null) => File.Exists(Path.Combine(home ?? Home, ".claude", ".credentials.json"));

    public static ClaudeCodeStatus Status(QuotaMonitor? quotas = null, string? home = null, string? pathVar = null)
    {
        var quotaWorks = quotas?.Snapshot().Any(p => p.Id == "claude" && p.Limits.Count > 0) == true;
        var installed = Find(home, pathVar) is not null;
        return new ClaudeCodeStatus(installed, (installed || quotaWorks) && (HasSignIn(home) || quotaWorks),
            Volatile.Read(ref _installing) == 1, _error, OperatingSystem.IsWindows() || OperatingSystem.IsLinux() || OperatingSystem.IsMacOS());
    }

    /// <summary>Runs the official installer in the background; one at a time. Returns false when one already runs.</summary>
    public static bool StartInstall(ILogger log)
    {
        if (Interlocked.CompareExchange(ref _installing, 1, 0) != 0) return false;
        _error = null;
        _ = Task.Run(async () =>
        {
            try
            {
                var psi = OperatingSystem.IsWindows()
                    ? new ProcessStartInfo("powershell.exe") { ArgumentList = { "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", WindowsInstall } }
                    : new ProcessStartInfo("/bin/bash") { ArgumentList = { "-c", UnixInstall } };
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.WorkingDirectory = Home;
                using var p = Process.Start(psi) ?? throw new InvalidOperationException("installer did not start");
                var outTask = p.StandardOutput.ReadToEndAsync();
                var errTask = p.StandardError.ReadToEndAsync();
                using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(10));
                try { await p.WaitForExitAsync(cts.Token); }
                catch (OperationCanceledException) { try { p.Kill(true); } catch (InvalidOperationException) { } throw new TimeoutException(); }
                var output = (await outTask) + (await errTask);
                log.LogInformation("claude code installer exited {Code}", p.ExitCode);
                if (Find() is null)
                    _error = output.Contains("403") || output.Contains("not available", StringComparison.OrdinalIgnoreCase)
                        ? "Сервер Claude не дал скачать установщик: Claude недоступен в вашей стране или сети."
                        : "Не получилось установить Claude Code. Проверьте интернет и попробуйте ещё раз.";
            }
            catch (TimeoutException) { _error = "Установка идёт слишком долго. Проверьте интернет и попробуйте ещё раз."; }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException or IOException)
            {
                log.LogWarning("claude code install: {Msg}", ex.Message);
                _error = "Не получилось запустить установщик Claude Code.";
            }
            finally { Volatile.Write(ref _installing, 0); }
        });
        return true;
    }

    /// <summary>Opens a terminal window on the computer with claude in the home folder: the first start signs in.</summary>
    public static string? OpenSignIn()
    {
        var exe = Find();
        if (exe is null) return "Claude Code ещё не установлен";
        if (!OperatingSystem.IsWindows()) return "Откройте терминал на компьютере и введите claude";
        try
        {
            Process.Start(new ProcessStartInfo("powershell.exe")
            {
                ArgumentList = { "-NoExit", "-NoProfile", "-Command", $"Write-Host 'Вход в Claude Code: следуйте подсказкам, браузер откроется сам.'; & '{exe.Replace("'", "''")}'" },
                UseShellExecute = false, CreateNoWindow = false, WorkingDirectory = Home, // a console program from the tray agent gets its own window
            });
            return null;
        }
        catch (System.ComponentModel.Win32Exception ex) { return "Не удалось открыть окно: " + ex.Message; }
    }
}
