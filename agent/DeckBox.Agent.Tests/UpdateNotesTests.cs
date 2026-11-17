using DeckBox.Agent;
using Xunit;

namespace DeckBox.Agent.Tests;

/// <summary>The «Вышла новая версия» card shows the parts of the release description written by tools/release-notes.py.</summary>
public class UpdateNotesTests
{
    private const string Body =
        "![DeckBox PRO](https://example/banner.png)\n\n" +
        "### ✨ Новое\n" +
        "- **Плашка обновлений**: что нового и кнопки [Обновить](https://x) и «Позже».\n" +
        "- Версия приложения в обзоре страниц.\n\n" +
        "### 🛠 Исправлено\n" +
        "- Ошибка `adb` при проверке\n" +
        "  на старых телефонах.\n\n" +
        "---\n\n" +
        "### ⬇ Что скачать\n" +
        "| Файл | Зачем |\n";

    [Fact]
    public void ReadsTheSectionsUpToTheDownloadTable()
    {
        var notes = UpdateService.ParseNotes(Body);
        Assert.Equal(2, notes.Count);
        Assert.Equal("✨ Новое", notes[0].Title);
        Assert.Equal("Плашка обновлений: что нового и кнопки Обновить и «Позже».", notes[0].Items[0]);
        Assert.Equal("🛠 Исправлено", notes[1].Title);
        Assert.Equal("Ошибка adb при проверке на старых телефонах.", Assert.Single(notes[1].Items));
    }

    [Fact]
    public void AnEmptyDescriptionHasNoSections() => Assert.Empty(UpdateService.ParseNotes(null));
}
