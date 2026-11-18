using System.Text.Json;

namespace DeckBox.Agent;

/// <summary>
/// «Магазин шаблонов»: page sets from store/store.json on GitHub (new sets appear without an update of DeckBox);
/// the copy shipped with the agent is used when GitHub cannot be reached.
/// </summary>
public static class TemplateStore
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(8) };
    private static string? _cached;
    private static DateTime _at;

    public static string Bundled => Catalog.StoreJson;

    public static async Task<string> GetAsync(string repo, CancellationToken ct)
    {
        if (_cached is not null && DateTime.UtcNow - _at < TimeSpan.FromHours(1)) return _cached;
        try
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(repo, @"^[\w.-]+/[\w.-]+$")) repo = "Dubstep2004/DeckBox";
            var json = await Http.GetStringAsync($"https://raw.githubusercontent.com/{repo}/main/store/store.json", ct);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("packs", out var packs) && packs.ValueKind == JsonValueKind.Array)
            {
                _cached = json; _at = DateTime.UtcNow;
                return json;
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException) { }
        return Bundled;
    }
}
