// «Вышла новая версия»: the card with what is new, «Обновить» and «Позже».
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/panel/');
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
});

test('a new release shows the card with its notes, «Позже» hides it until reopened', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/panel/?update=1');
  const card = page.locator('.dbu');
  await expect(card).toBeVisible();
  await expect(card.locator('.dbu-title')).toContainText('9.9.9');
  await expect(card.locator('.dbu-sec')).toHaveCount(2);
  await expect(card.getByRole('button', { name: 'Обновить' })).toBeVisible();
  await card.getByRole('button', { name: 'Позже' }).click();
  await expect(card).toHaveCount(0);
  // stays hidden after a reload («Позже» lasts 12 hours) …
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('.dbu')).toHaveCount(0);
  // … and the status line opens it again
  await page.locator('.status .upd').first().click();
  await expect(page.locator('.dbu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('without a new release there is no card', async ({ page }) => {
  await page.goto('/panel/');
  await page.waitForTimeout(1500);
  await expect(page.locator('.dbu')).toHaveCount(0);
});

test('«Обновить» shows the steps for each part, «Не напоминать» hides the card until the next version', async ({ page }) => {
  await page.goto('/panel/?update=1');
  const card = page.locator('.dbu');
  await expect(card.locator('.dbu-row')).toHaveCount(2); // the phone and the computer get the new version
  await card.getByRole('button', { name: 'Обновить' }).click();
  await expect(card.locator('.dbu-steps')).toBeVisible();
  await expect(card.locator('.dbu-chips span')).toHaveCount(0); // no row of step names, one bar per part
  await expect(card.locator('.dbu-prog em').first()).toContainText(/скачивает|ставит|проверяет/);
  await page.reload();
  await page.locator('.dbu').getByRole('button', { name: 'Не напоминать' }).click();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('.dbu')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('deckbox-update-skip'))).toBe('"9.9.9"');
});

test('after an update the panel says once what is new in it', async ({ page }) => {
  await page.goto('/panel/');
  await page.evaluate(() => localStorage.setItem('seen-versions', JSON.stringify({ app: null, agent: '1.3.1' })));
  await page.reload();
  const card = page.locator('.dbu');
  await expect(card).toBeVisible();
  await expect(card.locator('.dbu-tag')).toContainText('Обновлено ночью');
  await expect(card.locator('.dbu-name')).toContainText('было 1.3.1');
  await card.getByRole('button', { name: 'Отлично' }).click();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('.dbu')).toHaveCount(0);
});

test('«Все обновления» lists every release, marks the installed one and offers the new one', async ({ page }) => {
  await page.goto('/panel/?update=1');
  await page.locator('.dbu').getByRole('button', { name: 'Позже' }).click();
  await page.evaluate(async () => (await import('/panel/main.js')).openHistory());
  const card = page.locator('.dbu');
  await expect(card.locator('.dbu-rel')).toHaveCount(3);
  await expect(card.getByRole('button', { name: 'Обновить до 9.9.9' })).toBeVisible();
  await card.getByRole('button', { name: 'Обновить до 9.9.9' }).click();
  await expect(page.locator('.dbu .dbu-tag')).toContainText('Вышла новая версия');
});

test('a release description becomes the card\'s sections', async ({ page }) => {
  await page.goto('/panel/');
  const notes = await page.evaluate(async () => (await import('/panel/update-card.js')).parseNotes(
    '![b](x)\n\n### ✨ Новое\n- `📱 Панель` `💻 Компьютер` **Плашка**: что [нового](https://x).\n- Вторая\n  строка.\n\n### 🛠 Исправлено\n- `adb`\n\n---\n\n### ⬇ Что скачать\n- нет'));
  expect(notes).toEqual([{ title: '✨ Новое', items: ['📱 Панель · 💻 Компьютер — Плашка: что нового.', 'Вторая строка.'] }, { title: '🛠 Исправлено', items: ['adb'] }]);
});

test('the card shows how much each part downloads, and the speed and time left while the computer downloads', async ({ page }) => {
  await page.goto('/panel/?update=1');
  const card = page.locator('.dbu');
  await expect(card.locator('.dbu-row').nth(0)).toBeVisible(); // what downloads and how much, before «Обновить»
  await expect(card.locator('.dbu-row').nth(0)).toContainText('1,3 МБ');
  await expect(card.locator('.dbu-row').nth(1)).toContainText('48 МБ');
  await card.getByRole('button', { name: 'Обновить' }).click();
  await expect(card.locator('.dbu-msg')).toContainText('Компьютер скачивает новую версию', { timeout: 8000 });
  await expect(card.locator('.dbu-msg')).toContainText('2,1 МБ/с · осталось ');
});

test('a release of the panel alone downloads only the phone app', async ({ page }) => {
  await page.goto('/panel/?update=app');
  const card = page.locator('.dbu');
  await expect(card.locator('.dbu-row')).toHaveCount(1);
  await expect(card.locator('.dbu-row')).toContainText('Телефон');
  await expect(card.locator('.dbu-row')).toContainText('1,3 МБ');
});

test('on a phone on its side the card text scrolls and says there is more', async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 });
  await page.goto('/panel/?update=1');
  await page.evaluate(() => import('/panel/update-card.js').then((m) => m.showUpdateCard({ latest: '9.9.9', name: 'Длинные заметки', app: true, agent: true,
    notes: [{ title: '✨ Новое', items: Array.from({ length: 12 }, (_, i) => `Пункт ${i + 1}: длинное описание изменения, чтобы текст точно не поместился на экране телефона.`) }] },
  { parts: ['phone', 'pc'], sizes: { phone: 1400000, pc: 50000000 } })));
  const body = page.locator('.dbu-body');
  await expect(page.locator('.dbu-more')).toBeVisible();
  const box = await page.locator('.dbu').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(361); // the card fits the screen, buttons included
  await expect(page.locator('.dbu').getByRole('button', { name: 'Обновить' })).toBeInViewport();
  await body.evaluate((b) => { b.scrollTop = b.scrollHeight; });
  await expect(body).toContainText('Пункт 12');
  await expect(page.locator('.dbu-more')).toHaveClass(/off/);
  expect(await body.evaluate((b) => b.scrollTop)).toBeGreaterThan(0);
});
