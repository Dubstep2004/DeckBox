using System.Diagnostics;
#if WINDOWS
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
#endif

namespace DeckBox.Agent;

/// <summary>A game in front: its name, when it started and its frame rate (from RivaTuner, when it runs).</summary>
public sealed record GameSnapshot(string Name, string Process, long Since, double? Fps);

/// <summary>The app in front, sampled every 2 seconds (also feeds the weekly statistics).</summary>
public sealed record FrontApp(string Process, string? Path, bool Fullscreen);

/// <summary>
/// «Игровой режим»: notices a game in front — from a game library folder (Steam, Epic, GOG, Battle.net, Riot, EA,
/// Ubisoft, Xbox), a process listed in Settings › Игровой режим, or any other app in exclusive full screen that is not a
/// browser or a video player — and reports its session time and FPS. The panel switches to the «Игровой режим» page
/// (a rule with the "game-running" condition) and back when the game closes.
/// </summary>
public sealed class GameMonitor(ConfigStore config, ILogger<GameMonitor> log) : BackgroundService
{
    private static readonly string[] Libraries =
    [
        @"\steamapps\common\", @"\epic games\", @"\gog galaxy\games\", @"\gog games\", @"\riot games\", @"\battle.net\",
        @"\ea games\", @"\electronic arts\", @"\ubisoft game launcher\games\", @"\xboxgames\", @"\windowsapps\microsoft.minecraft",
        @"\wargaming.net\", @"\games\",
    ];

    /// <summary>Full-screen apps that are not games.</summary>
    private static readonly HashSet<string> NotGames = new(StringComparer.OrdinalIgnoreCase)
    {
        "chrome", "msedge", "firefox", "opera", "brave", "vivaldi", "yandex", "browser", "vlc", "mpc-hc64", "mpc-be64", "potplayer",
        "potplayermini64", "wmplayer", "video.ui", "microsoft.media.player", "explorer", "applicationframehost", "powerpnt",
        "obs64", "discord", "telegram", "zoom", "teams", "ms-teams", "steamwebhelper", "steam", "epicgameslauncher", "devenv",
        "code", "rider64", "lockapp", "searchhost", "shellexperiencehost", "startmenuexperiencehost", "textinputhost",
        "deckboxagent", "mstsc", "vmconnect", "kmplayer", "aimp", "spotify",
    };

    private static volatile GameSnapshot? _game;
    private static volatile FrontApp? _front;

    public static GameSnapshot? Current => _game;
    public static FrontApp? Front => _front;

    /// <summary>For tests: whether an app in front counts as a game.</summary>
    internal static bool IsGame(FrontApp app, IReadOnlyCollection<string> extra)
    {
        var name = app.Process;
        if (extra.Any(e => string.Equals(Trim(e), name, StringComparison.OrdinalIgnoreCase))) return true;
        if (NotGames.Contains(name)) return false;
        var path = (app.Path ?? "").ToLowerInvariant();
        if (path.Length > 0 && Libraries.Any(path.Contains)) return true;
        return app.Fullscreen && path.Length > 0 && !path.Contains(@"\windows\");
    }

    private static string Trim(string s) => s.Trim().EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? s.Trim()[..^4] : s.Trim();

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        string? key = null;
        long since = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var front = Probe(out var pid);
                _front = front;
                var g = config.Get().Game;
                if (front is not null && g.Enabled && IsGame(front, g.Processes))
                {
                    if (key != front.Process) { key = front.Process; since = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); log.LogInformation("game: {Name}", front.Process); }
                    _game = new GameSnapshot(Pretty(front), front.Process, since, Fps(pid));
                    _lastGameSeen = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                }
                else if (_game is not null)
                {
                    // a game that loses focus for a moment (alt-tab) keeps its session for 20 seconds
                    if (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _lastGameSeen > 20_000) { _game = null; key = null; }
                }
            }
            catch (Exception ex) { log.LogDebug("game probe: {Msg}", ex.Message); }
            await Task.Delay(2000, ct);
        }
    }

    private long _lastGameSeen;

    private static readonly Dictionary<string, string> Names = [];

    /// <summary>"Cyberpunk 2077" from the game's file, not "Cyberpunk2077".</summary>
    internal static string Pretty(FrontApp f)
    {
        lock (Names)
        {
            if (Names.TryGetValue(f.Path ?? f.Process, out var known)) return known;
            return Names[f.Path ?? f.Process] = ReadName(f);
        }
    }

    private static string ReadName(FrontApp f)
    {
        try
        {
            if (f.Path is { } p && FileVersionInfo.GetVersionInfo(p) is { } v)
            {
                var name = string.IsNullOrWhiteSpace(v.ProductName) ? v.FileDescription : v.ProductName;
                if (!string.IsNullOrWhiteSpace(name) && name.Length <= 48) return name.Trim();
            }
        }
        catch (Exception) { }
        return f.Process;
    }

#if WINDOWS
    private static FrontApp? Probe(out uint pid)
    {
        pid = 0;
        var hwnd = GetForegroundWindow();
        if (hwnd == 0 || GetWindowThreadProcessId(hwnd, out pid) == 0) return null;
        string name, path = "";
        try
        {
            using var p = Process.GetProcessById((int)pid);
            name = p.ProcessName;
            try { path = p.MainModule?.FileName ?? ""; } catch (Exception) { path = QueryPath(pid) ?? ""; }
        }
        catch (Exception) { return null; }
        var full = false;
        if (GetWindowRect(hwnd, out var r))
        {
            var mon = MonitorFromWindow(hwnd, 2);
            var mi = new MONITORINFO { cbSize = Marshal.SizeOf<MONITORINFO>() };
            if (mon != 0 && GetMonitorInfo(mon, ref mi))
                full = r.Left <= mi.rcMonitor.Left && r.Top <= mi.rcMonitor.Top && r.Right >= mi.rcMonitor.Right && r.Bottom >= mi.rcMonitor.Bottom;
        }
        return new FrontApp(name, path, full);
    }

    private static string? QueryPath(uint pid)
    {
        var h = OpenProcess(0x1000, false, pid);
        if (h == 0) return null;
        try
        {
            var sb = new char[1024];
            var len = sb.Length;
            return QueryFullProcessImageName(h, 0, sb, ref len) ? new string(sb, 0, len) : null;
        }
        finally { CloseHandle(h); }
    }

    /// <summary>
    /// FPS of the game from RivaTuner Statistics Server (comes with MSI Afterburner): its shared memory
    /// "RTSSSharedMemoryV2" has one entry per 3D app with the frames counted between two times.
    /// </summary>
    private static double? Fps(uint pid)
    {
        try
        {
            using var mmf = MemoryMappedFile.OpenExisting("RTSSSharedMemoryV2", MemoryMappedFileRights.Read);
            using var v = mmf.CreateViewAccessor(0, 0, MemoryMappedFileAccess.Read);
            if (v.ReadUInt32(0) != 0x52545353) return null; // 'RTSS'
            var entrySize = v.ReadUInt32(8);
            var arrOffset = v.ReadUInt32(12);
            var count = v.ReadUInt32(16);
            for (uint i = 0; i < Math.Min(count, 256u); i++)
            {
                long e = arrOffset + i * entrySize;
                if (v.ReadUInt32(e) != pid) continue;
                var t0 = v.ReadUInt32(e + 268);
                var t1 = v.ReadUInt32(e + 272);
                var frames = v.ReadUInt32(e + 276);
                if (t1 > t0 && frames > 0) return Math.Round(1000.0 * frames / (t1 - t0));
            }
        }
        catch (Exception) { }
        return null;
    }

    [StructLayout(LayoutKind.Sequential)] private struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MONITORINFO { public int cbSize; public RECT rcMonitor, rcWork; public uint dwFlags; }
    [DllImport("user32.dll")] private static extern nint GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(nint hwnd, out uint processId);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(nint hwnd, out RECT rect);
    [DllImport("user32.dll")] private static extern nint MonitorFromWindow(nint hwnd, uint flags);
    [DllImport("user32.dll")] private static extern bool GetMonitorInfo(nint mon, ref MONITORINFO mi);
    [DllImport("kernel32.dll")] private static extern nint OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(nint h);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern bool QueryFullProcessImageName(nint h, int flags, char[] name, ref int size);
#else
    private static FrontApp? Probe(out uint pid) { pid = 0; return null; }
    private static double? Fps(uint pid) => null;
#endif
}
