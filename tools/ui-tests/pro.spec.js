// DeckBox PRO: «Не беспокоить», «Курс ЦБ РФ», «Игровой режим», «Статистика за неделю», «Утренний брифинг», «Голос»,
// gestures and the PRO section of the settings (store, wizard).
const { test, expect } = require('@playwright/test');

const CBR = { Date: '2026-11-18T11:30:00+03:00', Valute: {
  USD: { Nominal: 1, Name: 'Доллар США', Value: 81.25, Previous: 80.75 },
  EUR: { Nominal: 1, Name: 'Евро', Value: 94.1, Previous: 94.6 },
  CNY: { Nominal: 1, Name: 'Юань', Value: 11.2, Previous: 11.2 },
  JPY: { Nominal: 100, Name: 'Иен', Value: 52.4, Previous: 52.0 } } };

async function show(page, widgets, query = '') {
  await page.addInitScript((widgets) => {
    const cfg = { night: { enabled: false }, rules: [], shortcuts: [], pages: [{ id: 'pro', title: 'PRO', icon: '⭐', enabled: true, widgets }] };
    localStorage.setItem('pb-demo-config', JSON.stringify(cfg));
  }, widgets);
  await page.route('https://www.cbr-xml-daily.ru/**', (r) => r.fulfill({ json: CBR }));
  await page.goto('/panel/' + query);
}

test('«Не беспокоить» turns on with one tap and shows the pill until it is turned off', async ({ page }) => {
  await show(page, [{ id: 'q', type: 'quiet', x: 0, y: 0, w: 4, h: 3 }]);
  const btn = page.locator('.w-quiet .q-btn');
  await expect(btn).toContainText('Тихий режим');
  await btn.click();
  await expect(page.locator('.w-quiet')).toHaveClass(/on/);
  await expect(page.locator('.pro-dnd')).toContainText('Не беспокоить');
  await page.locator('.pro-dnd').click();
  await expect(page.locator('.pro-dnd')).toHaveCount(0);
  await expect(page.locator('.w-quiet')).not.toHaveClass(/on/);
});

test('«Курс ЦБ РФ» shows the rates per one unit with the change of the day', async ({ page }) => {
  await show(page, [{ id: 'c', type: 'cbr', x: 0, y: 0, w: 6, h: 6, options: { codes: 'USD, EUR, CNY, JPY' } }]);
  const w = page.locator('.cbr');
  await expect(w.locator('.cbr-row')).toHaveCount(4);
  await expect(w.locator('.cbr-row').nth(0)).toContainText('81,25');
  await expect(w.locator('.cbr-d').nth(0)).toHaveClass(/up/);
  await expect(w.locator('.cbr-d').nth(1)).toHaveClass(/down/);
  await expect(w.locator('.cbr-d').nth(2)).toHaveText('без изменений');
  await expect(w.locator('.cbr-row').nth(3)).toContainText('0,524'); // 100 yen → one yen
  await expect(w.locator('.cbr-foot')).toContainText('18 ноября');
});

test('«Игровой режим» shows the game, FPS, temperatures and opens its page by itself', async ({ page }) => {
  await page.addInitScript(() => {
    const cfg = { night: { enabled: false }, rules: [], shortcuts: [], pages: [
      { id: 'home', title: 'Дом', icon: '🏠', enabled: true, widgets: [{ id: 'k', type: 'clock', x: 0, y: 0, w: 6, h: 4 }] },
      { id: 'gm', title: 'Игры', icon: '🎮', enabled: true, widgets: [{ id: 'g', type: 'game', x: 0, y: 0, w: 12, h: 6 }] }] };
    localStorage.setItem('pb-demo-config', JSON.stringify(cfg));
  });
  await page.goto('/panel/?game=1');
  const g = page.locator('.gm');
  await expect(g).toBeInViewport();
  await expect(g.locator('.gm-head')).toContainText('Cyberpunk 2077');
  await expect(g.locator('.gm-head')).toContainText('в игре 47 мин');
  await expect(g.locator('.gm-fps b')).toHaveText(/^\d+$/);
  await expect(g.locator('.gm-card').first()).toContainText('Процессор');
});

test('«Статистика за неделю» draws seven days, the totals and the top apps', async ({ page }) => {
  await show(page, [{ id: 's', type: 'weekstats', x: 0, y: 0, w: 8, h: 6 }]);
  await expect(page.locator('.ws-bar')).toHaveCount(7);
  await expect(page.locator('.ws-top')).toContainText('за 7 дней');
  await expect(page.locator('.ws-apps span')).toHaveCount(5);
});

test('«Утренний брифинг» widget shows weather, events, tasks and the rates', async ({ page }) => {
  await show(page, [{ id: 'b', type: 'briefing', x: 0, y: 0, w: 12, h: 6 }]);
  const cards = page.locator('.w-briefing .bf-card, .bf-grid .bf-card');
  await expect(cards).toHaveCount(4);
  await expect(page.locator('.bf-hello')).toContainText(/Доброе утро|Добрый день|Добрый вечер|Доброй ночи/);
  await expect(cards.nth(3)).toContainText('USD');
});

test('voice commands explain themselves outside the phone app', async ({ page }) => {
  await show(page, [{ id: 'v', type: 'voice', x: 0, y: 0, w: 4, h: 4 }]);
  await page.locator('.vc-mic').click();
  await expect(page.locator('.vc-said')).toContainText('приложении DeckBox');
});

test('the PRO settings list the template store and open the wizard', async ({ page }) => {
  await page.goto('/settings/#pro');
  await expect(page.locator('#storeList .tpl')).toHaveCount(6);
  await expect(page.locator('#storeList')).toContainText('Геймер');
  await page.locator('#wizardOpen').click();
  await expect(page.locator('#modalBody')).toContainText('Шаг 1 из 3');
  await page.locator('#modalBody').getByRole('button', { name: 'Дальше' }).click();
  await expect(page.locator('#modalBody')).toContainText('Шаг 2 из 3');
  await page.locator('#modalBody .tpl', { hasText: 'Геймер' }).click();
  await expect(page.locator('#modalBody')).toContainText('Готово');
  await expect(page.locator('#save')).toBeEnabled();
});

test('the PRO themes repaint the panel, and a hand-picked accent stays', async ({ page }) => {
  for (const [theme, rgb] of [['ruby', '224, 69, 95'], ['emerald', '47, 191, 138'], ['silver', '195, 202, 213']]) {
    await page.addInitScript(([theme]) => {
      localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [], display: { theme, accent: '#d4af37' },
        pages: [{ id: 'p', title: 'P', enabled: true, widgets: [{ id: 'q', type: 'quiet', x: 0, y: 0, w: 4, h: 3 }] }] }));
    }, [theme]);
    await page.goto('/panel/');
    await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe(`rgb(${rgb})`);
  }
  await page.addInitScript(() => {
    localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [], display: { theme: 'ruby', accent: '#3366ff' }, pages: [] }));
  });
  await page.goto('/panel/');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('rgb(51, 102, 255)');
});

test('a PIN locks the panel: taps do nothing until the right code', async ({ page }) => {
  // SHA-256 of "deckbox-pin:2580"
  const hash = require('crypto').createHash('sha256').update('deckbox-pin:2580').digest('hex');
  await page.addInitScript((hash) => {
    localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [], lock: { pinHash: hash, afterMin: 5 },
      pages: [{ id: 'p', title: 'P', enabled: true, widgets: [{ id: 'q', type: 'quiet', x: 0, y: 0, w: 4, h: 3 }] }] }));
  }, hash);
  await page.goto('/panel/');
  const lock = page.locator('.pinlock');
  await expect(lock).toBeVisible();
  await page.mouse.click(100, 100); // a tap on the panel opens the keypad instead of pressing the button
  await expect(page.locator('.pl-keys')).toBeVisible();
  await expect(page.locator('.pro-dnd')).toHaveCount(0);
  for (const k of '1111') await page.locator('.pl-keys button', { hasText: new RegExp(`^${k}$`) }).click();
  await page.getByRole('button', { name: 'Открыть' }).click();
  await expect(page.locator('.pl-msg')).toHaveText('Неверный код');
  for (const k of '2580') await page.locator('.pl-keys button', { hasText: new RegExp(`^${k}$`) }).click();
  await expect(lock).toHaveCount(0);
  await page.locator('.w-quiet .q-btn').click();
  await expect(page.locator('.pro-dnd')).toBeVisible();
});

test('voice commands match whole words: «плейлисты» opens the page, it does not toggle playback', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [], pages: [
      { id: 'a', title: 'Дом', enabled: true, widgets: [] }, { id: 'b', title: 'Плейлисты', enabled: true, widgets: [] }] }));
  });
  await page.goto('/panel/');
  const said = (t) => page.evaluate(async (t) => (await import('/panel/widgets/pro.js')).runVoice(t), t);
  expect(await said('покажи плейлисты')).toBe('Страница «Плейлисты»');
  expect(await said('пауза')).toBe('Пауза / воспроизведение');
  expect(await said('выключи звук')).toBe('Звук переключён');
});
