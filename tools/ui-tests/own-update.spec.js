// The app looks for its own update on GitHub (DeckBox-x.y.z.apk), with the computer on or off.
const { test, expect } = require('@playwright/test');

const RELEASE = {
  tag_name: 'v99.0.0', name: 'DeckBox PRO 99.0.0 — Тест', html_url: 'https://github.com/Dubstep2004/DeckBox/releases/tag/v99.0.0', body: '### ✨ Новое\n- `📱 Панель` **Проверка.** Текст.',
  assets: [
    { name: 'DeckBox-99.0.0.apk', size: 1400000, browser_download_url: 'https://github.com/Dubstep2004/DeckBox/releases/download/v99.0.0/DeckBox-99.0.0.apk' },
    { name: 'SHA256SUMS-99.0.0.txt', size: 300, browser_download_url: 'https://github.com/Dubstep2004/DeckBox/releases/download/v99.0.0/SHA256SUMS-99.0.0.txt' },
  ],
};

async function phone(page, appVersion) {
  await page.addInitScript((v) => {
    window.__installed = [];
    window.Android = {
      version: (key) => v, installUpdate: () => {}, updateBadge: () => {},
      installUpdateFrom: (key, apk, sums) => window.__installed.push([apk, sums]),
    };
  }, appVersion);
  await page.route('https://api.github.com/repos/Dubstep2004/DeckBox/releases/latest', (r) => r.fulfill({ json: RELEASE }));
  await page.route('https://api.github.com/repos/Dubstep2004/DeckBox/releases?**', (r) => r.fulfill({ json: [RELEASE] }));
  await page.clock.install();
  await page.goto('/panel/');
  await page.clock.runFor(21_000);
}

test('the app finds DeckBox-99.0.0.apk on GitHub by itself and installs it from there', async ({ page }) => {
  await phone(page, '1.0.0');
  const card = page.locator('.dbu');
  await expect(card).toContainText('99.0.0');
  await expect(card.locator('.dbu-row').first()).toContainText('Телефон');
  await expect(card.locator('.dbu-row').first()).toContainText('1,3 МБ');
  await card.getByRole('button', { name: 'Обновить' }).click();
  await expect.poll(() => page.evaluate(() => window.__installed)).toEqual([[RELEASE.assets[0].browser_download_url, RELEASE.assets[1].browser_download_url]]);
});

test('an app that is already the newest finds nothing', async ({ page }) => {
  await phone(page, '99.0.0');
  await page.clock.runFor(2_000);
  await expect(page.locator('.dbu')).toHaveCount(0);
});
