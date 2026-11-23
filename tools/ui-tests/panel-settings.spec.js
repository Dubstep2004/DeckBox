// «⚙ Настройки» on the phone: theme, weather, time and date, morning briefing — saved without the computer's page.
const { test, expect } = require('@playwright/test');

test('the settings open from «Все страницы» and save theme, weather, time and the morning tasks', async ({ page }) => {
  await page.route('https://geocoding-api.open-meteo.com/**', (r) => r.fulfill({ json: { results: [{ name: 'Екатеринбург', admin1: 'Свердловская область', country: 'Россия', latitude: 56.8389, longitude: 60.6057 }] } }));
  await page.goto('/panel/');
  await page.evaluate(() => window.openOverview());
  await page.locator('#ovSettings').click();
  const dlg = page.locator('.ps-panel');
  await expect(dlg).toContainText('⚙ Настройки');
  await dlg.getByRole('button', { name: 'Изумруд' }).click();
  await dlg.getByRole('searchbox', { name: 'Город для погоды' }).fill('Екатер');
  await dlg.getByRole('button', { name: /Екатеринбург, Свердловская/ }).click();
  await expect(dlg.locator('.ps-city')).toHaveText('Екатеринбург');
  await dlg.getByRole('button', { name: '°F' }).click();
  await dlg.getByRole('button', { name: 'км/ч' }).click();
  await dlg.getByRole('button', { name: '12 ч' }).click();
  await dlg.locator('.ps-sel').first().selectOption('numeric');
  await dlg.locator('.ps-sel').nth(1).selectOption('Asia/Yekaterinburg');
  await dlg.locator('.ps-tasks').fill('Проверить почту\n\nСделать зарядку');
  await dlg.getByRole('button', { name: '✓ Сохранить' }).click();
  await expect(page.locator('#toast')).toContainText('Настройки сохранены');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'emerald');
  const c = await page.evaluate(() => JSON.parse(localStorage.getItem('pb-demo-config')));
  expect([c.display.theme, c.weather.city, c.weather.tempUnit, c.weather.windUnit, c.display.hour12, c.display.dateFormat, c.display.timeZone])
    .toEqual(['emerald', 'Екатеринбург', 'f', 'kmh', 'true', 'numeric', 'Asia/Yekaterinburg']);
  expect(c.briefing.tasks).toEqual(['Проверить почту', 'Сделать зарядку']);
});

test('«Отмена» changes nothing', async ({ page }) => {
  await page.goto('/panel/');
  await page.evaluate(() => window.openOverview());
  await page.locator('#ovSettings').click();
  await page.locator('.ps-panel').getByRole('button', { name: 'Рубин' }).click();
  await page.locator('.ps-panel').getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.ps-panel')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute('data-theme', 'ruby');
});

test('on a phone on its side the settings fit and scroll', async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 });
  await page.goto('/panel/');
  await page.evaluate(() => window.openPanelSettings ? window.openPanelSettings() : window.openOverview());
  if (!(await page.locator('.ps-panel').count())) await page.locator('#ovSettings').click();
  const box = await page.locator('.ps-panel').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(361);
  await expect(page.getByRole('button', { name: '✓ Сохранить' })).toBeInViewport();
  const body = page.locator('.ps-body');
  expect(await body.evaluate((b) => b.scrollHeight > b.clientHeight)).toBe(true);
});
