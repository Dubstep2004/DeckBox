using System.Reflection;

namespace DeckBox.Agent;

/// <summary>File locations. The install folder is replaced on update; settings and logs are kept.</summary>
public static class AppPaths
{
    public const string AppName = "DeckBox";

    private static string Home => Environment.GetFolderPath(Environment.SpecialFolder.UserProfile, Environment.SpecialFolderOption.DoNotVerify);
    private static string Xdg(string variable, string fallback) =>
        Environment.GetEnvironmentVariable(variable) is { Length: > 0 } v ? v : Path.Combine(Home, fallback);

    /// <summary>%APPDATA%\DeckBox — user settings (config.json).</summary>
    /// <summary>Windows: %APPDATA%\DeckBox. Linux: ~/.config/DeckBox. macOS: ~/Library/Application Support/DeckBox.</summary>
    public static readonly string ConfigDir = Path.Combine(
        OperatingSystem.IsWindows() ? Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData)
        : OperatingSystem.IsMacOS() ? Path.Combine(Home, "Library", "Application Support")
        : Xdg("XDG_CONFIG_HOME", ".config"), AppName);

    /// <summary>%LOCALAPPDATA%\DeckBox — logs and the installed binaries.</summary>
    /// <summary>Windows: %LOCALAPPDATA%\DeckBox. Linux: ~/.local/share/DeckBox. macOS: same folder as the settings.</summary>
    public static readonly string LocalDir = Path.Combine(
        OperatingSystem.IsWindows() ? Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
        : OperatingSystem.IsMacOS() ? Path.Combine(Home, "Library", "Application Support")
        : Xdg("XDG_DATA_HOME", Path.Combine(".local", "share")), AppName);

    public static readonly string ConfigPath = Path.Combine(ConfigDir, "config.json");
    public static readonly string LogPath = Path.Combine(LocalDir, "agent.log");

    /// <summary>Where install scripts put the agent; self-update only works for this copy.</summary>
    public static readonly string InstallDir = Path.Combine(LocalDir, "app");

    /// <summary>"windows", "linux" or "macos".</summary>
    public static string Os => OperatingSystem.IsWindows() ? "windows" : OperatingSystem.IsMacOS() ? "macos" : "linux";

    /// <summary>Release asset suffix for this machine: win-x64, linux-x64, linux-arm64, osx-arm64 or osx-x64.</summary>
    public static string Rid =>
        (OperatingSystem.IsWindows() ? "win" : OperatingSystem.IsMacOS() ? "osx" : "linux") + "-" +
        (System.Runtime.InteropServices.RuntimeInformation.OSArchitecture == System.Runtime.InteropServices.Architecture.Arm64 ? "arm64" : "x64");

    public static readonly string StartupShortcut =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), AppName + ".lnk");

    public static string Version =>
        Assembly.GetExecutingAssembly().GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0]
        ?? "0.0.0";

    /// <summary>Writes the default settings file on first run.</summary>
    public static void EnsureConfig()
    {
        if (File.Exists(ConfigPath)) return;
        if (MigrateLegacyConfig()) return;
        Directory.CreateDirectory(ConfigDir);
        var name = OperatingSystem.IsMacOS() ? "config.default.macos.json" : OperatingSystem.IsLinux() ? "config.default.linux.json" : "config.default.json";
        using var src = Assembly.GetExecutingAssembly().GetManifestResourceStream(name)!;
        using var dst = CreatePrivate(ConfigPath);
        src.CopyTo(dst);
    }

    /// <summary>The settings folder of PhoneBox, the project DeckBox was renamed from (next to <see cref="ConfigDir"/>).</summary>
    public static string LegacyConfigDir => Path.Combine(Path.GetDirectoryName(ConfigDir)!, "PhoneBox");

    /// <summary>
    /// First start after the rename: copies the PhoneBox settings folder (config, pairing key and certificate, icons,
    /// pushed values, logins) into the DeckBox one, so pages and pairings survive. The old folder is left untouched.
    /// </summary>
    public static bool MigrateLegacyConfig() => MigrateConfigFolder(LegacyConfigDir, ConfigDir);

    internal static bool MigrateConfigFolder(string from, string to)
    {
        if (!File.Exists(Path.Combine(from, "config.json")) || File.Exists(Path.Combine(to, "config.json"))) return false;
        try
        {
            foreach (var dir in Directory.GetDirectories(from, "*", SearchOption.AllDirectories))
                Directory.CreateDirectory(Path.Combine(to, Path.GetRelativePath(from, dir)));
            Directory.CreateDirectory(to);
            foreach (var file in Directory.GetFiles(from, "*", SearchOption.AllDirectories))
                File.Copy(file, Path.Combine(to, Path.GetRelativePath(from, file)), overwrite: false);
            return true;
        }
        catch (IOException) { return File.Exists(Path.Combine(to, "config.json")); }
        catch (UnauthorizedAccessException) { return File.Exists(Path.Combine(to, "config.json")); }
    }

    private const UnixFileMode OwnerOnly = UnixFileMode.UserRead | UnixFileMode.UserWrite;

    /// <summary>
    /// Tightens the settings file in use and its backup to owner only on macOS/Linux: older versions wrote them with the
    /// umask (often 0644), and they hold the Wi-Fi, webhook and Home Assistant keys. Also for a <c>--config</c> path.
    /// </summary>
    public static void RestrictConfig(string configPath)
    {
        RestrictToOwner(configPath);
        RestrictToOwner(configPath + ".bak");
    }

    /// <summary>
    /// Creates a file only its owner can read on macOS/Linux (0600), replacing any file at <paramref name="path"/>;
    /// Windows keeps the profile ACLs. On Unix an existing file is removed first and the new one is created exclusively,
    /// so the content never lands in a file with another owner or mode (a leftover or planted .tmp).
    /// </summary>
    public static FileStream CreatePrivate(string path)
    {
        if (OperatingSystem.IsWindows())
            return new FileStream(path, new FileStreamOptions { Mode = FileMode.Create, Access = FileAccess.Write, Share = FileShare.None });
        File.Delete(path);
        return new FileStream(path, new FileStreamOptions
        {
            Mode = FileMode.CreateNew, Access = FileAccess.Write, Share = FileShare.None, UnixCreateMode = OwnerOnly,
        });
    }

    /// <summary>Copies a file into a new owner-only file (see <see cref="CreatePrivate"/>), unlike File.Copy, which keeps the source's mode.</summary>
    public static void CopyPrivate(string source, string destination)
    {
        using var src = File.OpenRead(source);
        using var dst = CreatePrivate(destination);
        src.CopyTo(dst);
    }

    /// <summary><see cref="File.WriteAllText(string, string?)"/> into a file only its owner can read (see <see cref="CreatePrivate"/>).</summary>
    public static void WriteAllTextPrivate(string path, string text)
    {
        using var stream = CreatePrivate(path);
        using var writer = new StreamWriter(stream, new System.Text.UTF8Encoding(false));
        writer.Write(text);
    }

    /// <summary>Sets an existing file to 0600 on macOS/Linux; no-op on Windows or when the file is missing.</summary>
    public static void RestrictToOwner(string path)
    {
        if (OperatingSystem.IsWindows() || !File.Exists(path)) return;
        try { if (File.GetUnixFileMode(path) != OwnerOnly) File.SetUnixFileMode(path, OwnerOnly); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
    }

    public static Stream? Resource(string name) => Assembly.GetExecutingAssembly().GetManifestResourceStream(name);

    /// <summary>Neutral working directory for child processes, so they never lock the install folder.</summary>
    public static string NeutralCwd => Path.GetTempPath();
}
