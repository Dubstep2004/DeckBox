#!/usr/bin/env python3
"""Assembles the static web demo (GitHub Pages) from the real panel and settings page:  python tools/pages/build.py _site"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WWW = ROOT / 'android' / 'app' / 'src' / 'main' / 'assets' / 'www'
AGENT = ROOT / 'agent' / 'DeckBox.Agent'
PAGES = Path(__file__).resolve().parent


def version():
    """The agent's version: the demo reports it as the installed one, and the landing page shows it."""
    return re.search(r'<Version>([^<]+)</Version>', (AGENT / 'DeckBox.Agent.csproj').read_text(encoding='utf-8'))[1]


def demo_tag(panel=False, relay=False):
    return f'<script src="../demo.js" data-version="{version()}"{" data-panel" if panel else ""}{" data-relay" if relay else ""}></script>\n'


# the screenshots the landing page shows (docs/screenshots), with their captions
SHOTS = [('home', 'Главная'), ('dashboard', 'Дашборд'), ('ai', 'ИИ-программирование'), ('deck', 'Пульт управления'), ('music', 'Музыка'),
         ('system', 'Система'), ('planner', 'Планировщик'), ('overview', 'Все страницы'), ('settings-editor', 'Редактор страниц на ПК')]


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def inline(md):
    """One changelog item as HTML: place labels as tags, **bold**, `code` and [links](url)."""
    out = esc(md)
    out = re.sub(r'`([^\x00-\x7F`][^`]*)`\s*', r'<span class="tag">\1</span>', out)
    out = re.sub(r'`([^`]+)`', r'<code>\1</code>', out)
    out = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', out)
    return re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2">\1</a>', out)


def news(limit=5):
    """The newest CHANGELOG section: its version, title and first items, for «Что нового»."""
    text = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    m = re.search(r'^## (\S+) — (.+)$', text, re.M)
    assert m, 'CHANGELOG.md has no version section'
    body = text[m.end():]
    nxt = re.search(r'^## ', body, re.M)
    body = body[:nxt.start()] if nxt else body
    items = []
    for line in body.splitlines():
        if line.startswith('- '): items.append(line[2:].strip())
        elif items and line.startswith('  ') and line.strip(): items[-1] += ' ' + line.strip()
        elif line.startswith('#'): pass
    assert items, 'the newest CHANGELOG section has no items'
    li = '\n'.join(f'      <li>{inline(i)}</li>' for i in items[:limit])
    return m[1], m[2].strip(), li


def shots_html():
    return '\n'.join(f'    <a href="shots/{n}.png" target="_blank" rel="noopener"><img src="shots/{n}.png" alt="{c}" loading="lazy"><span>{c}</span></a>'
                     for n, c in SHOTS)


def landing_html():
    """The landing page with the catalog counts, the version and the newest changes taken from the sources."""
    import json
    count = lambda name: len(json.loads((AGENT / name).read_text(encoding='utf-8')))
    html = (PAGES / 'index.html').read_text(encoding='utf-8')
    nv, nt, ni = news()
    for key, value in (('widgets', count('widgets.json')), ('templates', count('templates.json')), ('version', version()),
                       ('newsVersion', nv), ('newsTitle', esc(nt)), ('news', ni), ('shots', shots_html())):
        assert '{{' + key + '}}' in html, key
        html = html.replace('{{' + key + '}}', str(value))
    assert '{{' not in html
    return html


def panel_html(relay=False):
    """The panel's index.html with the demo API loaded first (a classic script, before the ES modules)."""
    html = (WWW / 'index.html').read_text(encoding='utf-8')
    tag = '<script type="module" src="main.js"></script>'
    assert tag in html
    return html.replace(tag, demo_tag(panel=True, relay=relay) + tag)


def settings_html(relay=False):
    """The real settings page with the demo API loaded before its script."""
    html = (AGENT / 'settings.html').read_text(encoding='utf-8')
    assert '<script>' in html
    return (html.replace('<script>', demo_tag(relay=relay) + '<script>', 1)
            .replace('href="/favicon.ico"', 'href="../favicon.ico"').replace('src="/favicon.ico"', 'src="../favicon.ico"'))


def build(out):
    if out.exists(): shutil.rmtree(out)
    (out / 'panel').mkdir(parents=True)
    (out / 'settings').mkdir()
    shutil.copy(PAGES / 'demo.js', out / 'demo.js')
    (out / 'index.html').write_text(landing_html(), encoding='utf-8')
    for name in ('widgets.json', 'templates.json'): shutil.copy(AGENT / name, out / name)
    shutil.copy(AGENT.parent.parent / 'store' / 'store.json', out / 'store.json')
    shutil.copy(AGENT / 'deckbox.ico', out / 'favicon.ico')
    shutil.copytree(WWW, out / 'panel', dirs_exist_ok=True, ignore=shutil.ignore_patterns('index.html'))
    (out / 'panel' / 'index.html').write_text(panel_html(), encoding='utf-8')
    (out / 'settings' / 'index.html').write_text(settings_html(), encoding='utf-8')
    # the target of the pairing QR code (Settings › Wi-Fi › Pair a phone over Wi-Fi): hands the link to the app
    (out / 'pair').mkdir()
    shutil.copy(PAGES / 'pair.html', out / 'pair' / 'index.html')
    # the target of the landing page's QR code: starts the newest APK's download on the phone
    (out / 'apk').mkdir()
    shutil.copy(PAGES / 'apk.html', out / 'apk' / 'index.html')
    shutil.copy(PAGES / 'apk-qr.svg', out / 'apk-qr.svg')
    # the picture a link to the site shows in messengers (og:image) and the screenshots
    shutil.copy(ROOT / 'docs' / 'brand' / 'banner.png', out / 'og.png')
    shutil.copy(ROOT / 'docs' / 'brand' / 'deckbox-icon-1024.png', out / 'icon.png')
    (out / 'shots').mkdir()
    for n, _ in SHOTS: shutil.copy(ROOT / 'docs' / 'screenshots' / f'{n}.png', out / 'shots' / f'{n}.png')
    print(f'web demo written to {out}')


if __name__ == '__main__':
    build(Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve())
