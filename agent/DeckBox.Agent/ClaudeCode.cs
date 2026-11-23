using System.Diagnostics;

namespace DeckBox.Agent;

/// <param name="Installed">claude is on this computer (the native installer's ~/.local/bin, or anywhere on PATH)</param>
/// <param name="SignedIn">Claude Code has its sign-in on this computer (~/.claude/.credentials.json), or the quota check works</param>
/// <param name="Installing">the installer runs now (started from the panel or the settings page)</param>
/// <param name="Error">why the last install failed, in Russian</param>
/// <param name="Busy">"install", "update" or "remove" while that runs; <paramref name="Since"/> = when it started (ms)</param>
public sealed record ClaudeCodeStatus(bool Installed, bool SignedIn, bool Installing, string? Error, bool CanInstall,
    string? Version = null, string? Busy = null, long? Since = null, string? Done = null);

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
    private static string? _busy;
    private static long _since;
    private static string? _done; // what the last job did, for the panel's message ("removed", "updated")
    private static (string Exe, DateTime Stamp, string? Version) _ver;

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

    /// <summary>
    /// PowerShell: reloads PATH from what Windows saved, so a program installed a moment ago is found in this window
    /// too (the same as closing and opening the window).
    /// </summary>
    public const string RefreshPath = "$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User'); ";

    /// <summary>
    /// Puts the folder of the native install (~/.local/bin) on the user's PATH when claude.exe is there and the folder is
    /// not, so «claude» works in a new window. The installer sometimes leaves it out. Windows only; returns true if added.
    /// </summary>
    public static bool EnsureOnPath(string? home = null, Func<string?>? read = null, Action<string>? write = null)
    {
        if (!OperatingSystem.IsWindows() && read is null) return false;
        var dir = Path.Combine(home ?? Home, ".local", "bin");
        if (!File.Exists(Path.Combine(dir, "claude.exe"))) return false;
        read ??= () => Environment.GetEnvironmentVariable("Path", EnvironmentVariableTarget.User);
        write ??= v => Environment.SetEnvironmentVariable("Path", v, EnvironmentVariableTarget.User); // also tells Windows (WM_SETTINGCHANGE)
        var current = read() ?? "";
        var parts = current.Split(';', StringSplitOptions.RemoveEmptyEntries).Select(p => Environment.ExpandEnvironmentVariables(p.Trim().Trim('"')).TrimEnd('\\'));
        if (parts.Any(p => string.Equals(p, dir.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))) return false;
        write(current.Length == 0 ? dir : current.TrimEnd(';') + ";" + dir);
        return true;
    }

    internal static bool HasSignIn(string? home = null) => File.Exists(Path.Combine(home ?? Home, ".claude", ".credentials.json"));

    public static ClaudeCodeStatus Status(QuotaMonitor? quotas = null, string? home = null, string? pathVar = null)
    {
        var quotaWorks = quotas?.Snapshot().Any(p => p.Id == "claude" && p.Limits.Count > 0) == true;
        var installed = Find(home, pathVar) is not null;
        return new ClaudeCodeStatus(installed, (installed || quotaWorks) && (HasSignIn(home) || quotaWorks),
            Volatile.Read(ref _installing) == 1, _error, OperatingSystem.IsWindows() || OperatingSystem.IsLinux() || OperatingSystem.IsMacOS(),
            installed && home is null ? CachedVersion() : null, _busy, _busy is null ? null : _since, _done);
    }

    /// <summary>«claude --version» → "2.1.40", cached until claude.exe changes; read in the background.</summary>
    private static string? CachedVersion()
    {
        var exe = Find();
        if (exe is null) return null;
        DateTime stamp;
        try { stamp = File.GetLastWriteTimeUtc(exe); } catch (IOException) { return _ver.Version; }
        if (_ver.Exe == exe && _ver.Stamp == stamp) return _ver.Version;
        _ver = (exe, stamp, _ver.Exe == exe ? _ver.Version : null);
        _ = Task.Run(async () =>
        {
            try
            {
                var r = await ToolProcess.RunAsync(new ProcessStartInfo(exe, "--version"), TimeSpan.FromSeconds(15), CancellationToken.None);
                var m = System.Text.RegularExpressions.Regex.Match(r.Output, @"\d+\.\d+\.\d+");
                if (m.Success) _ver = (exe, stamp, m.Value);
            }
            catch (Exception e) when (e is System.ComponentModel.Win32Exception or IOException or InvalidOperationException or OperationCanceledException) { }
        });
        return _ver.Version;
    }

    /// <summary>Runs a job in the background, one at a time: "install", "update" or "remove".</summary>
    private static bool Run(string what, ILogger log, Func<Task> job)
    {
        if (Interlocked.CompareExchange(ref _installing, 1, 0) != 0) return false;
        (_error, _busy, _since, _done) = (null, what, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), null);
        _ = Task.Run(async () =>
        {
            try { await job(); }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException or IOException or UnauthorizedAccessException or OperationCanceledException)
            {
                log.LogWarning("claude code {What}: {Msg}", what, ex.Message);
                _error ??= what == "remove" ? "Не получилось удалить Claude Code. Закройте все окна Claude Code и попробуйте ещё раз." : "Не получилось: " + ex.Message;
            }
            finally { _busy = null; _ver = default; Volatile.Write(ref _installing, 0); }
        });
        return true;
    }

    /// <summary>«claude update»: the newest Claude Code.</summary>
    public static bool StartUpdate(ILogger log) => Find() is { } exe && Run("update", log, async () =>
    {
        var r = await ToolProcess.RunAsync(new ProcessStartInfo(exe, "update"), TimeSpan.FromMinutes(10), CancellationToken.None);
        log.LogInformation("claude update exited {Code}", r.ExitCode);
        if (r.ExitCode != 0) _error = "Не получилось обновить Claude Code. Проверьте интернет и попробуйте ещё раз.";
        else _done = "updated";
    });

    /// <summary>
    /// Removes Claude Code from this computer (the program and its downloaded versions). signOut also removes its sign-in;
    /// projects and the other settings in ~/.claude stay.
    /// </summary>
    public static bool StartRemove(ILogger log, bool signOut, string? home = null) => Run("remove", log, () =>
    {
        Remove(home ?? Home, signOut);
        _done = "removed";
        return Task.CompletedTask;
    });

    internal static void Remove(string home, bool signOut)
    {
        foreach (var name in new[] { "claude.exe", "claude" })
        {
            var f = Path.Combine(home, ".local", "bin", name);
            if (File.Exists(f)) File.Delete(f); // in use: IOException → «закройте все окна Claude Code»
        }
        var versions = Path.Combine(home, ".local", "share", "claude");
        if (Directory.Exists(versions)) Directory.Delete(versions, true);
        if (signOut) { var cred = Path.Combine(home, ".claude", ".credentials.json"); if (File.Exists(cred)) File.Delete(cred); }
    }

    /// <summary>Runs the official installer in the background; one at a time. Returns false when one already runs.</summary>
    public static bool StartInstall(ILogger log) => Run("install", log, async () =>
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
        catch (OperationCanceledException)
        {
            try { p.Kill(true); } catch (InvalidOperationException) { }
            _error = "Установка идёт слишком долго. Проверьте интернет и попробуйте ещё раз.";
            return;
        }
        var output = (await outTask) + (await errTask);
        log.LogInformation("claude code installer exited {Code}", p.ExitCode);
        if (OperatingSystem.IsWindows() && EnsureOnPath()) log.LogInformation("claude code: added ~/.local/bin to the user PATH");
        if (Find() is null)
            _error = output.Contains("403") || output.Contains("not available", StringComparison.OrdinalIgnoreCase)
                ? "Сервер Claude не дал скачать установщик: Claude недоступен в вашей стране или сети."
                : "Не получилось установить Claude Code. Проверьте интернет и попробуйте ещё раз.";
        else _done = "installed";
    });

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
                ArgumentList = { "-NoExit", "-NoProfile", "-Command", RefreshPath + $"Write-Host 'Вход в Claude Code: следуйте подсказкам, браузер откроется сам.'; & '{exe.Replace("'", "''")}'" },
                UseShellExecute = false, CreateNoWindow = false, WorkingDirectory = Home, // a console program from the tray agent gets its own window
            });
            return null;
        }
        catch (System.ComponentModel.Win32Exception ex) { return "Не удалось открыть окно: " + ex.Message; }
    }
}
