using System.Globalization;
using System.Text.Json;

namespace DeckBox.Agent;

/// <summary>
/// «Порядок страниц» on the phone (DeckBox PRO): the order of the pages and which ones are shown, set from the panel's
/// page overview. Only the order and the Enabled flags change; nothing else of the settings is touched.
/// </summary>
public static class PageOrder
{
    public sealed record Result(int Status, string? Error = null, string? Version = null);

    /// <param name="order">page ids in the new order; pages left out keep their place after them</param>
    /// <param name="hidden">page ids to hide; every other page in <paramref name="order"/> is shown</param>
    public static Result Apply(ConfigStore cfg, IReadOnlyList<string> order, IReadOnlyList<string> hidden, long? expectedVersion = null)
    {
        if (order.Count == 0) return new(400, "order expected");
        var version = expectedVersion ?? cfg.Version;
        var json = JsonSerializer.Serialize(cfg.Get(), ConfigStore.WriteOpts);
        var copy = JsonSerializer.Deserialize<AgentConfig>(json, ConfigStore.WriteOpts)!;
        var pages = copy.Pages ?? [];
        var byId = pages.GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First());
        if (order.Any(id => !byId.ContainsKey(id)) || hidden.Any(id => !byId.ContainsKey(id))) return new(404, "page not found");
        if (order.Distinct().Count() != order.Count) return new(400, "a page is listed twice");

        var arranged = order.Select(id => byId[id]).Concat(pages.Where(p => !order.Contains(p.Id))).ToList();
        foreach (var p in arranged)
            if (hidden.Contains(p.Id)) p.Enabled = false;
            else if (order.Contains(p.Id)) p.Enabled = true;
        if (!arranged.Any(p => p.Enabled)) return new(400, "at least one page must stay visible");
        copy.Pages = arranged;

        var err = cfg.Save(JsonSerializer.Serialize(copy, ConfigStore.WriteOpts), version, out var savedVersion);
        if (err == ConfigStore.Conflict) return new(409, err);
        return err is null ? new(200, null, savedVersion.ToString(CultureInfo.InvariantCulture)) : new(400, err);
    }

    internal static string[] Ids(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Take(200).ToArray();
}
