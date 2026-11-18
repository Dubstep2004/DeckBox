#!/usr/bin/env python3
"""Builds the GitHub release description of one DeckBox version from CHANGELOG.md.

    python tools/release-notes.py 1.1.2 > notes.md

The version's section (## <version> — <title>) with its ✨ / ⚡ / 🛠 / 🗑 parts, framed by a short header and the
download table. Exits with 1 when CHANGELOG.md has no section for the version.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'https://github.com/Dubstep2004/DeckBox'


def section(version):
    text = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    m = re.search(rf'^## {re.escape(version)}(?: — ([^\n]+))?\n(.*?)(?=^## |\Z)', text, re.M | re.S)
    if not m:
        return None, None
    return (m.group(1) or '').strip(), m.group(2).strip()


def notes(version):
    title, body = section(version)
    if body is None:
        return None
    body = re.sub(r'^### ', '### ', body, flags=re.M)
    head = f'<h2 align="center">DeckBox PRO {version}{" — " + title if title else ""}</h2>\n'
    return f'''{head}
<p align="center">
  <img src="https://raw.githubusercontent.com/Dubstep2004/DeckBox/main/docs/brand/banner.png" width="720" alt="DeckBox PRO">
</p>

> Где изменение: `📱 Панель` — экран на телефоне · `🤖 Приложение` — само приложение Android ·
> `💻 Компьютер` — программа и настройки на ПК · `🌐 Сайт` — страницы на GitHub

{body}

---

### ⬇ Установка

| Файл | Для чего |
|---|---|
| **DeckBox-Setup-{version}.exe** | Установщик для Windows 10/11: агент, adb и приложение на телефон. Ставится поверх старой версии |
| DeckBox-{version}.apk | Приложение для телефона отдельно (Android 5+) |
| DeckBoxAgent-{version}-win-x64.zip | Агент для встроенного обновления |
| SHA256SUMS-{version}.txt | Контрольные суммы файлов |

Уже установленный DeckBox обновится сам: **Настройки › Общие › Обновления**.
Windows SmartScreen может предупредить о неподписанной программе: «Подробнее» → «Выполнить в любом случае».

[Все изменения]({REPO}/blob/main/CHANGELOG.md) · [Руководство]({REPO}/blob/main/docs/GUIDE.md) · [Живое демо](https://dubstep2004.github.io/DeckBox/)
'''


def versions():
    text = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    return re.findall(r'^## (\d+\.\d+\.\d+)', text, re.M)


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        print('\n'.join(versions()))
        sys.exit(0)
    if len(sys.argv) != 2:
        sys.exit('usage: release-notes.py <version> | --list')
    out = notes(sys.argv[1])
    if out is None:
        sys.exit(f'CHANGELOG.md has no section for {sys.argv[1]}')
    sys.stdout.reconfigure(encoding='utf-8')
    print(out)
