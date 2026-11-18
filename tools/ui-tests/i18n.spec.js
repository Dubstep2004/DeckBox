// Localisation gaps the first i18n pass left behind: literals the dictionary already translates, and one spot
// that compared a localized label against the English word. Against the web demo, in Russian (DeckBox's only language).
const { test, expect } = require('@playwright/test');

async function show(page, widgets) {
  await page.goto('/panel/');
  await page.evaluate((widgets) => {
    localStorage.clear();
    localStorage.setItem('pb-demo-config', JSON.stringify({
      night: { enabled: false }, rules: [], shortcuts: [],
      display: { language: 'ru' },
      pages: [{ id: 'one', title: 'One', widgets }],
    }));
  }, widgets);
  await page.reload();
}

test('a small agenda shows relative times in the panel language', async ({ page }) => {
  await page.addInitScript(() => {
    // pin the run to local noon so "today" cannot roll over mid-test, and answer /api/calendar
    // with the fixture before the demo installs its own fetch mock (the setter keeps it as fallback)
    const noon = new Date(); noon.setHours(12, 0, 0, 0);
    const FIXED = noon.getTime();
    const RealDate = Date;
    window.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [FIXED])); }
      static now() { return FIXED; }
    };
    const cal = JSON.stringify({
      updated: FIXED, errors: [],
      events: [{ title: 'Review', start: FIXED + 35 * 60e3, end: FIXED + 65 * 60e3, allDay: false, calendar: 'Work', color: '#60a5fa' }],
    });
    let inner = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      // the fallback is fixed when the wrapper is handed out: demo.js keeps the first one as its "real" fetch, and a
      // wrapper that looked up the live mock would send the demo's pass-through requests back to the demo forever
      get: () => {
        const fallback = inner;
        return (input, init) => {
          const url = typeof input === 'string' ? input : input.url;
          if (url.includes('/api/calendar')) {
            return Promise.resolve(new Response(cal, { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          return fallback(input, init);
        };
      },
      set: (v) => { inner = v; },
    });
  });
  await show(page, [{ id: 'ag', type: 'agenda', x: 0, y: 0, w: 12, h: 1, options: {} }]);
  await page.evaluate(() => window.DeckBoxDemo.emit('refresh'));
  const sub = page.locator('.ag-big-s').first();
  await expect(sub).toHaveText(/^через \d+/); // "через 35 мин · 12:35", not "Сегодня · 12:35"
  await expect(sub).not.toHaveText(/Сегодня/);
});

test('the breathe widget greets in the panel language before the first tap', async ({ page }) => {
  await show(page, [{ id: 'br', type: 'breathe', x: 0, y: 0, w: 4, h: 2, options: {} }]);
  await expect(page.locator('.br-w')).toHaveText('Нажмите для старта');
});

// DeckBox speaks Russian only: every key has a Russian text, and none of them is English left in place.
test('the Russian dictionary is complete and really translated', async ({ page }) => {
  await page.goto('/panel/');
  const result = await page.evaluate(() => {
    const I18n = window.DeckBoxI18n;
    const S = I18n.STRINGS;
    const gaps = Object.keys(S.en).filter((k) => !(k in S.ru));
    const SAME_IS_FINE = new Set(['s.discord.clientSecret', 'status.wiFi', 'status.usb', 's.cd.clientId']);
    const copied = Object.keys(S.ru)
      .filter((k) => S.ru[k] === S.en[k] && !SAME_IS_FINE.has(k) && S.en[k].length > 12 && /[a-z]{4,} [a-z]{3,}/.test(S.en[k]));
    return { gaps, copied, languages: I18n.LANGUAGES.map((l) => l.code).sort(), dictionaries: Object.keys(S).sort() };
  });
  expect(result.gaps).toEqual([]);
  expect(result.copied).toEqual([]);
  expect(result.languages).toEqual(['en', 'ru']); // English is only the internal fallback
  expect(result.dictionaries).toEqual(['en', 'ru']);
});

test('the widget catalog translates by its English text', async ({ page }) => {
  await page.goto('/panel/');
  const out = await page.evaluate(() => {
    const I18n = window.DeckBoxI18n;
    I18n.setLang('ru');
    return {
      name: I18n.tc('Clock'),
      desc: I18n.tc('Clock, weather, now playing and PC tiles.'),
      category: I18n.tc('Weather & sky'),
      untouched: I18n.tc('not in the catalog'),
    };
  });
  expect(out.name).toBe('Часы');
  expect(out.desc).toContain('Часы');
  expect(out.category).toBe('Погода и небо');
  expect(out.untouched).toBe('not in the catalog');
});

// A JavaScript object literal keeps the last of two equal keys without a warning, so a key defined twice in one
// language silently replaces the first text (s.ha.hint once showed the token setup paragraph in the entity picker).
test('i18n.js defines every key once per language', () => {
  const fs = require('fs');
  const path = require('path');
  const lines = fs.readFileSync(path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'assets', 'www', 'i18n.js'), 'utf8').split('\n');
  // EXTRA is merged into STRINGS with Object.assign, so the two share one key space per language; CATALOG is its own.
  const TABLE = /^ {2}const ([A-Z_]+) = \{\s*$/;
  // A property name as source text: 'single', "double" or bare. name() turns it into the name JavaScript uses, so
  // Time, 'Time' and "Time" (or vi and 'vi') count as the same key.
  const NAME = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*`;
  const BLOCK = new RegExp(String.raw`^ {4}(${NAME}):\s*\{\s*$`);
  const KEY = new RegExp(String.raw`^ {6}(${NAME}):`);
  const name = (token) => (/^['"]/.test(token) ? Function(`"use strict"; return (${token});`)() : token);
  const dupes = [];
  const spaces = new Map();
  let table = null, block = null;
  lines.forEach((line, i) => {
    const tb = TABLE.exec(line);
    if (tb) { table = tb[1] === 'EXTRA' ? 'STRINGS' : tb[1]; block = null; return; }
    const b = BLOCK.exec(line);
    if (b) { block = `${table} ${name(b[1])}`; if (!spaces.has(block)) spaces.set(block, new Map()); return; }
    const k = block && KEY.exec(line);
    if (!k) return;
    const key = name(k[1]);
    const seen = spaces.get(block);
    if (seen.has(key)) dupes.push(`${block} ${k[1]} (lines ${seen.get(key)} and ${i + 1})`);
    else seen.set(key, i + 1);
  });
  expect(spaces.size).toBeGreaterThanOrEqual(13); // the parser still finds the language blocks (12 languages + catalog)
  expect(dupes).toEqual([]);
});
