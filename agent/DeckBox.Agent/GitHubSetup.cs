using System.Diagnostics;

namespace DeckBox.Agent;

/// <param name="Installed">GitHub CLI (gh) is on this computer</param>
/// <param name="SignedIn">the GitHub widget gets data, so gh is signed in</param>
/// <param name="Installing">the installer runs now (started from the panel)</param>
/// <param name="Error">why the last install failed, in Russian</param>
public sealed record GitHubSetupStatus(bool Installed, bool SignedIn, bool Installing, string? Error, bool CanInstall,
    string? Busy = null, long? Since = null, string? Done = null);

/// <summary>
/// The GitHub widget for people who never used a terminal: what is missing (GitHub CLI, or its sign-in), a button that
/// installs it with winget, and one that opens a window on the computer for «gh auth login». Nothing runs unless tapped.
/// </summary>
public static class GitHubSetup
{
    public const string WingetArgs = "install --id GitHub.cli -e --source winget --silent --accept-source-agreements --accept-package-agreements";
    private static int _installing;
    private static string? _error;
    private static string? _busy;
    private static long _since;
    private static string? _done;

    /// <summary>A failed gh run → what is missing ("install" or "login", null for other errors) and a message in Russian.</summary>
    public static (string? Setup, string Message) Explain(Exception ex)
    {
        var m = ex.Message;
        if (ex is System.ComponentModel.Win32Exception || m.Contains("start process", StringComparison.OrdinalIgnoreCase) || m.Contains("No such file", StringComparison.OrdinalIgnoreCase))
            return ("install", "GitHub CLI не установлен на компьютере");
        if (m.Contains("auth login", StringComparison.OrdinalIgnoreCase) || m.Contains("not logged", StringComparison.OrdinalIgnoreCase)
            || m.Contains("authentication", StringComparison.OrdinalIgnoreCase) || m.Contains("Bad credentials", StringComparison.OrdinalIgnoreCase))
            return ("login", "Нужно войти в GitHub на компьютере");
        return (null, m);
    }

    public static GitHubSetupStatus Status(GitHubMonitor gh) =>
        new(ToolProcess.Find("gh") is not null, gh.Snapshot() is { User: not null, Setup: null }, Volatile.Read(ref _installing) == 1, _error, OperatingSystem.IsWindows(),
            _busy, _busy is null ? null : _since, _done);

    /// <summary>Removes GitHub CLI with winget (Windows); the GitHub widget then shows how to connect it again.</summary>
    public static bool StartRemove(ILogger log)
    {
        if (!OperatingSystem.IsWindows() || Interlocked.CompareExchange(ref _installing, 1, 0) != 0) return false;
        (_error, _busy, _since, _done) = (null, "remove", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), null);
        _ = Task.Run(async () =>
        {
            try
            {
                var r = await ToolProcess.RunAsync(new ProcessStartInfo(ToolProcess.Find("winget") ?? "winget", "uninstall --id GitHub.cli -e --silent --accept-source-agreements"),
                    TimeSpan.FromMinutes(10), CancellationToken.None);
                log.LogInformation("GitHub CLI remove: winget exited {Code}", r.ExitCode);
                if (ToolProcess.Find("gh") is not null) _error = "Не получилось удалить GitHub CLI. Удалите его в «Параметры › Приложения».";
                else _done = "removed";
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or IOException or InvalidOperationException or OperationCanceledException)
            {
                log.LogWarning("GitHub CLI remove: {Msg}", ex.Message);
                _error = "Не получилось удалить GitHub CLI. Удалите его в «Параметры › Приложения».";
            }
            finally { _busy = null; Volatile.Write(ref _installing, 0); Wake.Now(); }
        });
        return true;
    }

    /// <summary>Installs GitHub CLI with winget in the background (Windows); one at a time.</summary>
    public static bool StartInstall(ILogger log)
    {
        if (!OperatingSystem.IsWindows() || Interlocked.CompareExchange(ref _installing, 1, 0) != 0) return false;
        (_error, _busy, _since, _done) = (null, "install", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), null);
        _ = Task.Run(async () =>
        {
            try
            {
                var winget = ToolProcess.Find("winget") ?? "winget";
                var psi = new ProcessStartInfo(winget, WingetArgs);
                var r = await ToolProcess.RunAsync(psi, TimeSpan.FromMinutes(10), CancellationToken.None);
                log.LogInformation("GitHub CLI install: winget exited {Code}", r.ExitCode);
                if (ToolProcess.Find("gh") is null)
                    _error = "Не получилось установить GitHub CLI. Скачайте его с cli.github.com и установите вручную.";
                else _done = "installed";
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or IOException or InvalidOperationException or OperationCanceledException)
            {
                log.LogWarning("GitHub CLI install: {Msg}", ex.Message);
                _error = "На компьютере нет winget. Скачайте GitHub CLI с cli.github.com и установите вручную.";
            }
            finally { _busy = null; Volatile.Write(ref _installing, 0); Wake.Now(); }
        });
        return true;
    }

    /// <summary>Opens a window on the computer with «gh auth login» (the browser does the rest).</summary>
    public static string? OpenSignIn()
    {
        var gh = ToolProcess.Find("gh");
        if (gh is null) return "GitHub CLI ещё не установлен";
        if (!OperatingSystem.IsWindows()) return "Откройте терминал на компьютере и введите gh auth login";
        try
        {
            Process.Start(new ProcessStartInfo("powershell.exe")
            {
                ArgumentList = { "-NoExit", "-NoProfile", "-Command",
                    ClaudeCode.RefreshPath + $"Write-Host 'Вход в GitHub: нажмите Enter, скопируйте код, вставьте его в открывшемся браузере.'; & '{gh.Replace("'", "''")}' auth login --hostname github.com --git-protocol https --web" },
                UseShellExecute = false, CreateNoWindow = false,
                WorkingDirectory = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            });
            return null;
        }
        catch (System.ComponentModel.Win32Exception ex) { return "Не удалось открыть окно: " + ex.Message; }
    }
}
