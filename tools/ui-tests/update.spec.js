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
