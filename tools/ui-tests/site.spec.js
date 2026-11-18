// The landing page (GitHub Pages): download buttons, QR code, PRO themes, «Что нового», screenshots, FAQ, phone layout.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VERSION = fs.readFileSync(path.join(__dirname, '../../agent/DeckBox.Agent/DeckBox.Agent.csproj'), 'utf8').match(/<Version>([^<]+)<\/Version>/)[1];
const LATEST = {
  tag_name: 'v9.9.9',
  assets: [
    { name: 'DeckBox-9.9.9.apk', size: 1468006, browser_download_url: 'https://github.com/Dubstep2004/DeckBox/releases/download/v9.9.9/DeckBox-9.9.9.apk' },
    { name: 'DeckBox-Setup-9.9.9.exe', size: 52428800, browser_download_url: 'https://github.com/Dubstep2004/DeckBox/releases/download/v9.9.9/DeckBox-Setup-9.9.9.exe' },
    { name: 'DeckBoxAgent-9.9.9-win-x64.zip', size: 70000000, browser_download_url: 'https://example.invalid/zip' },
  ],
};
const mockLatest = (page, body = LATEST, status = 200) =>
  page.route('https://api.github.com/repos/Dubstep2004/DeckBox/releases/latest', (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));

test('the download buttons start with this version and follow the newest release', async ({ page }) => {
  let release;
  const gate = new Promise((res) => (release = res));
  await page.route('https://api.github.com/repos/Dubstep2004/DeckBox/releases/latest', async (r) => {
    await gate;
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(LATEST) });
  });
  await page.goto('/');
  await expect(page.locator('#dlWin')).toHaveAttribute('href', `https://github.com/Dubstep2004/DeckBox/releases/download/v${VERSION}/DeckBox-Setup-${VERSION}.exe`);
  await expect(page.locator('#dlApk')).toHaveAttribute('href', `https://github.com/Dubstep2004/DeckBox/releases/download/v${VERSION}/DeckBox-${VERSION}.apk`);
  release();
  await expect(page.locator('#dlWin')).toHaveAttribute('href', LATEST.assets[1].browser_download_url);
  await expect(page.locator('#dlWinMeta')).toHaveText('DeckBox-Setup 9.9.9 · 50 МБ · Windows 10/11');
  await expect(page.locator('#dlApk')).toHaveAttribute('href', LATEST.assets[0].browser_download_url);
  await expect(page.locator('#dlApkMeta')).toHaveText('DeckBox 9.9.9 · 1,4 МБ · Android 5+');
  await expect(page.locator('#reqApk')).toHaveText('1,4 МБ');
});

test('the download buttons keep their links when GitHub does not answer', async ({ page }) => {
  await mockLatest(page, { message: 'rate limited' }, 403);
  await page.goto('/');
  await page.waitForTimeout(300);
  await expect(page.locator('#dlApk')).toHaveAttribute('href', new RegExp(`DeckBox-${VERSION.replace(/\./g, '\\.')}\\.apk$`));
  await expect(page.locator('#dlApkMeta')).toContainText('Android 5+');
});

test('the QR code, the preview picture and the screenshots are on the site', async ({ page, request }) => {
  await mockLatest(page);
  await page.goto('/');
  const qr = page.locator('.qr img');
  await expect(qr).toBeVisible();
  expect(await qr.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://dubstep2004.github.io/DeckBox/og.png');
  expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toContain('DeckBox PRO');
  expect((await request.get('/og.png')).ok()).toBe(true);
  const shots = await page.locator('.shots img').evaluateAll((l) => l.map((i) => i.getAttribute('src')));
  expect(shots.length).toBeGreaterThanOrEqual(8);
  for (const s of shots) expect((await request.get('/' + s)).ok(), s).toBe(true);
});

test('«Что нового» shows the newest changelog items with their place labels', async ({ page }) => {
  await mockLatest(page);
  await page.goto('/');
  const changelog = fs.readFileSync(path.join(__dirname, '../../CHANGELOG.md'), 'utf8');
  const newest = changelog.match(/^## (\S+) — (.+)$/m);
  await expect(page.locator('#news')).toContainText(`Что нового в ${newest[1]}`);
  await expect(page.locator('#news')).toContainText(newest[2].trim());
  const items = page.locator('.news li');
  expect(await items.count()).toBeGreaterThan(0);
  expect(await items.count()).toBeLessThanOrEqual(5);
  await expect(items.first().locator('.tag').first()).toBeVisible();
  expect(await page.locator('.news').innerHTML()).not.toContain('`');
  expect(await page.locator('.news').innerHTML()).not.toContain('**');
});

test('the PRO theme buttons repaint the demo panel', async ({ page }) => {
  await mockLatest(page);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/');
  const body = page.frameLocator('#panel').locator('body');
  await expect(page.frameLocator('#panel').locator('.w').first()).toBeVisible();
  await page.getByRole('button', { name: 'Изумруд' }).click();
  await expect(body).toHaveAttribute('data-theme', 'emerald');
  await expect(page.getByRole('button', { name: 'Изумруд' })).toHaveClass(/on/);
  await page.getByRole('button', { name: 'Рубин' }).click();
  await expect(body).toHaveAttribute('data-theme', 'ruby');
  await page.reload();
  await expect(body).toHaveAttribute('data-theme', 'ruby');
  await expect(page.getByRole('button', { name: 'Рубин' })).toHaveClass(/on/);
  await page.getByRole('button', { name: 'Золото' }).click();
  await expect(body).toHaveAttribute('data-theme', 'pro');
});

test('the site has the steps, PRO, requirements and FAQ, and no PhoneBox', async ({ page }) => {
  await mockLatest(page);
  await page.goto('/');
  await expect(page.locator('.step')).toHaveCount(3);
  await expect(page.locator('#pro')).toBeVisible();
  await expect(page.locator('.pro .card')).toHaveCount(6);
  await expect(page.locator('.req')).toContainText('Android 5.0');
  const faq = page.locator('.faq details').first();
  await faq.locator('summary').click();
  await expect(faq.locator('p')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/phonebox/i);
  expect(await page.locator('footer').innerHTML()).not.toMatch(/phonebox|ersinkoc/i);
});

test('on a phone the site fits the screen and offers the panel on the whole screen', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await mockLatest(page);
  await page.goto('/');
  await expect(page.locator('.full a')).toBeVisible();
  expect(await page.locator('.full a').getAttribute('href')).toBe('panel/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const [a, b] = await Promise.all([page.locator('#dlWin').boundingBox(), page.locator('#dlApk').boundingBox()]);
  expect(b.y).toBeGreaterThan(a.y); // one button under the other
  await expect(page.locator('.qr')).toBeHidden(); // the phone downloads with the button itself
  await ctx.close();
});

test('the QR page starts the newest APK download', async ({ page }) => {
  await mockLatest(page);
  let asked = null;
  await page.route('https://github.com/**', (r) => { asked = r.request().url(); r.fulfill({ status: 200, contentType: 'text/plain', body: 'apk' }); });
  await page.goto('/apk/');
  await expect.poll(() => asked).toBe(LATEST.assets[0].browser_download_url);
});

test('the QR page falls back to the release page when GitHub does not answer', async ({ page }) => {
  await mockLatest(page, {}, 500);
  await page.goto('/apk/');
  await expect(page.locator('#state')).toHaveText('Откройте страницу релиза и скачайте файл .apk.');
  await expect(page.locator('#get')).toHaveAttribute('href', 'https://github.com/Dubstep2004/DeckBox/releases/latest');
});
