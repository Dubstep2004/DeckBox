using System.Diagnostics;

namespace DeckBox.Agent;

/// <summary>Bounded execution for optional tools. Cancellation also reaps the process tree.</summary>
internal static class ToolProcess
{
    public static string? Find(string tool)
    {
        var names = OperatingSystem.IsWindows() ? new[] { tool + ".exe", tool } : [tool];
        var dirs = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Concat(OperatingSystem.IsWindows() ? WindowsExtraDirs() : new[] { "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin" });
        return dirs.SelectMany(d => names.Select(n => Path.Combine(d.Trim('"', ' '), n))).FirstOrDefault(File.Exists);
    }

    /// <summary>
    /// Windows: the PATH as it is saved now (a program installed after DeckBox started is not on DeckBox's own PATH yet)
    /// and the usual install folders of winget, Scoop, GitHub CLI and Claude Code.
    /// </summary>
    private static IEnumerable<string> WindowsExtraDirs()
    {
        var saved = new[] { EnvironmentVariableTarget.User, EnvironmentVariableTarget.Machine }
            .SelectMany(t => { try { return (Environment.GetEnvironmentVariable("Path", t) ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries); } catch (System.Security.SecurityException) { return []; } })
            .Select(Environment.ExpandEnvironmentVariables);
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        return saved.Concat([Path.Combine(pf, "GitHub CLI"), Path.Combine(local, "Programs", "GitHub CLI"), Path.Combine(local, "Microsoft", "WinGet", "Links"),
            Path.Combine(home, "scoop", "shims"), Path.Combine(home, ".local", "bin")]);
    }

    internal sealed record Result(int ExitCode, string Output, string Error);

    public static async Task<Result> RunAsync(ProcessStartInfo start, TimeSpan timeout, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        start.UseShellExecute = false;
        start.CreateNoWindow = true;
        start.RedirectStandardOutput = start.RedirectStandardError = true;
        start.WorkingDirectory = AppPaths.NeutralCwd;
        using var process = Process.Start(start) ?? throw new IOException("Could not start " + start.FileName);
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(timeout);
        var output = process.StandardOutput.ReadToEndAsync(deadline.Token);
        var error = process.StandardError.ReadToEndAsync(deadline.Token);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
            await Task.WhenAll(output, error).WaitAsync(deadline.Token);
            return new Result(process.ExitCode, await output, await error);
        }
        catch (OperationCanceledException)
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch (InvalidOperationException) { }
            await process.WaitForExitAsync(CancellationToken.None).WaitAsync(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(output, error); } catch (OperationCanceledException) { }
            ct.ThrowIfCancellationRequested();
            throw new TimeoutException(Path.GetFileName(start.FileName) + " timed out");
        }
    }
}
