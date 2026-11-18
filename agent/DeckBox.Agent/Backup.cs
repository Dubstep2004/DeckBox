using System.IO.Compression;

namespace DeckBox.Agent;

/// <summary>«Резервная копия»: puts back the settings and custom icons of a deckbox-backup-*.zip.</summary>
public static class Backup
{
    public const long MaxBytes = 64L * 1024 * 1024;

    /// <returns>An error in Russian, or null; and how many icons came back.</returns>
    public static async Task<(string? Error, int Icons)> RestoreAsync(Stream body, ConfigStore cfg, string iconsDir)
    {
        var ms = new MemoryStream();
        var buf = new byte[81920];
        int n;
        while ((n = await body.ReadAsync(buf)) > 0)
        {
            ms.Write(buf, 0, n);
            if (ms.Length > MaxBytes) return ("Файл слишком большой для резервной копии", 0);
        }
        ms.Position = 0;
        ZipArchive zip;
        try { zip = new ZipArchive(ms, ZipArchiveMode.Read); }
        catch (InvalidDataException) { return ("Это не резервная копия DeckBox (нужен .zip)", 0); }
        using (zip)
        {
            var config = zip.GetEntry("config.json");
            if (config is null) return ("В архиве нет config.json: это не резервная копия DeckBox", 0);
            string json;
            using (var r = new StreamReader(config.Open())) json = await r.ReadToEndAsync();
            if (cfg.Save(json, null) is { } err) return ("Настройки из копии не подошли: " + err, 0);
            var count = 0;
            Directory.CreateDirectory(iconsDir);
            foreach (var e in zip.Entries)
            {
                if (!e.FullName.StartsWith("icons/", StringComparison.Ordinal)) continue;
                var name = Path.GetFileName(e.FullName);
                // only plain file names: nothing outside the icons folder
                // "icons/C:evil.dll" is rooted on Windows (Path.Combine would drop the icons folder): no drive, no separators
                if (name.Length == 0 || name != e.FullName[6..] || name.StartsWith('.') || name.Contains(':') || Path.IsPathRooted(name)
                    || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || e.Length > 4 * 1024 * 1024) continue;
                var target = Path.GetFullPath(Path.Combine(iconsDir, name));
                if (!target.StartsWith(Path.GetFullPath(iconsDir) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) continue;
                e.ExtractToFile(target, overwrite: true);
                count++;
            }
            return (null, count);
        }
    }
}
