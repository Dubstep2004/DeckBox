using DeckBox.Agent;
using Xunit;

namespace DeckBox.Agent.Tests;

/// <summary>1.5.0: the night update, «Все обновления», the checksum the phone checks after a resumed download.</summary>
public class UpdateExtrasTests
{
    [Fact]
    public void TheNightUpdateRunsOncePerNightAtItsHourAndNotDuringAGame()
    {
        var u = new UpdateConfig { Night = true, NightHour = 4 };
        var at4 = new DateTime(2026, 11, 19, 4, 10, 0);
        Assert.True(UpdateService.NightDue(u, at4, null, pending: true, gameRunning: false));
        Assert.False(UpdateService.NightDue(u, at4, "2026-11-19", pending: true, gameRunning: false)); // done tonight
        Assert.True(UpdateService.NightDue(u, at4.AddDays(1), "2026-11-19", pending: true, gameRunning: false));
        Assert.False(UpdateService.NightDue(u, at4.AddHours(1), null, pending: true, gameRunning: false)); // not its hour
        Assert.False(UpdateService.NightDue(u, at4, null, pending: false, gameRunning: false)); // nothing new
        Assert.False(UpdateService.NightDue(u, at4, null, pending: true, gameRunning: true)); // a game runs
        Assert.False(UpdateService.NightDue(new UpdateConfig { Night = false }, at4, null, pending: true, gameRunning: false));
    }

    [Fact]
    public void TheHistoryHasEveryPublishedReleaseWithItsNotes()
    {
        const string json = """
            [
              {"tag_name":"v1.5.0","name":"DeckBox PRO 1.5.0 — Обновления","published_at":"2026-11-19T10:00:00Z","draft":false,
               "body":"### ✨ Новое\n- Шаги обновления.\n\n---\n### ⬇ Что скачать\n| a |"},
              {"tag_name":"v1.4.9","name":"draft","draft":true,"body":""},
              {"tag_name":"v1.4.0","name":"DeckBox PRO 1.4.0","published_at":"2026-11-18T10:00:00Z","body":null}
            ]
            """;
        var list = UpdateService.ParseHistory(json);
        Assert.Equal(["1.5.0", "1.4.0"], list.Select(r => r.Version));
        Assert.Equal("Обновления", list[0].Name);
        Assert.Equal("Шаги обновления.", Assert.Single(Assert.Single(list[0].Notes).Items));
        Assert.Null(list[1].Name);
        Assert.Empty(list[1].Notes);
    }

    [Fact]
    public async Task TheChecksumIsTheFilesSha256()
    {
        var f = Path.GetTempFileName();
        try
        {
            await File.WriteAllTextAsync(f, "abc");
            Assert.Equal("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", await UpdateService.Sha256Async(f));
            await File.WriteAllTextAsync(f, "abcd"); // a new file under the same name is hashed again
            File.SetLastWriteTimeUtc(f, DateTime.UtcNow.AddMinutes(1));
            Assert.Equal("88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589", await UpdateService.Sha256Async(f));
        }
        finally { File.Delete(f); }
    }

    [Fact]
    public void ANightHourOutOfRangeIsClamped()
    {
        var store = new ConfigStore(Path.Combine(Path.GetTempPath(), "deckbox-night-" + Guid.NewGuid().ToString("N"), "config.json"));
        Assert.Null(store.Save("""{"updates":{"night":true,"nightHour":30}}""", null));
        Assert.Equal(23, store.Get().Updates.NightHour);
        Assert.True(store.Get().Updates.Night);
    }
}
