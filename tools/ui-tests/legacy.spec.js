// The old PhoneBox app on the phone: the panel offers once to uninstall it.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/panel/');
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
});

test('the panel offers to uninstall the old PhoneBox app, and does it', async ({ page }) => {
  await page.goto('/panel/?legacy=1');
  const dlg = page.locator('.legacy-panel');
  await expect(dlg).toContainText('Найден старый PhoneBox');
  await dlg.getByRole('button', { name: /Удалить PhoneBox/ }).click();
  await expect(page.locator('#toast')).toContainText('Старое приложение PhoneBox удалено');
  await expect(dlg).toHaveCount(0);
});

test('«Оставить» is remembered', async ({ page }) => {
  await page.goto('/panel/?legacy=1');
  await page.locator('.legacy-panel').getByRole('button', { name: 'Оставить' }).click();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('.legacy-panel')).toHaveCount(0);
});

test('without the old app nothing is asked', async ({ page }) => {
  await page.goto('/panel/');
  await page.waitForTimeout(1500);
  await expect(page.locator('.legacy-panel')).toHaveCount(0);
});
