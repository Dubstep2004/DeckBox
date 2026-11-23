// «Сеансы»: how much of Claude's limits is left (5 hours, week) and when they reset, under the sessions.
const { test, expect } = require('@playwright/test');

test('the sessions widget shows what is left of the 5-hour and weekly limits, and the summary is in Russian', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [],
    pages: [{ id: 's', title: 'S', icon: '🤖', enabled: true, widgets: [{ id: 's', type: 'sessions', x: 0, y: 0, w: 12, h: 6 }] }] })));
  await page.goto('/panel/');
  const lims = page.locator('.s-limits .s-lim');
  await expect(lims.first()).toBeVisible();
  await expect(lims.nth(0)).toContainText('5 часов');
  await expect(lims.nth(0)).toContainText('осталось 66%'); // 34 % used
  await expect(lims.nth(0)).toContainText('сброс');
  await expect(lims.nth(1)).toContainText('Неделя');
  await expect(lims.nth(1)).toContainText('осталось 48%');
  await expect(page.locator('.w-sum').first()).toContainText('работают: ');
  await expect(page.locator('.w-sum').first()).not.toContainText('idle');
});

test('without Claude limits there is no strip', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [],
    pages: [{ id: 's', title: 'S', icon: '🤖', enabled: true, widgets: [{ id: 's', type: 'sessions', x: 0, y: 0, w: 12, h: 6 }] }] })));
  await page.goto('/panel/?nocc=1');
  await expect(page.locator('.cc-note')).toBeVisible();
  await expect(page.locator('.s-limits')).toBeHidden();
});
