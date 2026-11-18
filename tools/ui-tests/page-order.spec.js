// «Порядок страниц» (DeckBox PRO): reorder and hide pages from the panel's page overview.
const { test, expect } = require('@playwright/test');

async function show(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('pb-demo-config')) return;
    const w = [{ id: 'c', type: 'clock', x: 0, y: 0, w: 12, h: 6 }];
    localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [], pages: [
      { id: 'a', title: 'Альфа', icon: '🅰️', enabled: true, widgets: w }, { id: 'b', title: 'Бета', icon: '🅱️', enabled: true, widgets: w },
      { id: 'c', title: 'Гамма', icon: '🌀', enabled: false, widgets: w }] }));
  });
  await page.goto('/panel/');
  await page.evaluate(() => window.openOverview());
}
const names = (page) => page.locator('#ovGrid .ov-name').allInnerTexts();

test('pages are reordered and hidden from the overview and stay so', async ({ page }) => {
  await show(page);
  expect(await names(page)).toEqual(['1 🅰️ Альфа', '2 🅱️ Бета']); // the hidden page is not in the overview
  await page.locator('#ovSort').click();
  const tiles = page.locator('#ovGrid .ov-tile.sort');
  await expect(tiles).toHaveCount(3); // in sorting mode the hidden page is there too, greyed out
  await expect(tiles.nth(2)).toHaveClass(/off/);
  await tiles.nth(1).getByRole('button', { name: 'Раньше' }).click(); // Бета first
  await tiles.nth(2).getByRole('button', { name: 'Показать страницу' }).click(); // Гамма shown
  await tiles.nth(1).getByRole('button', { name: 'Скрыть страницу' }).click(); // Альфа hidden
  await page.locator('#ovSort').click(); // ✓ Готово
  await expect(page.locator('#toast')).toContainText('Порядок страниц сохранён');
  await expect(page.locator('#overview')).toBeHidden();
  await page.reload();
  await page.evaluate(() => window.openOverview());
  await expect.poll(() => names(page)).toEqual(['1 🅱️ Бета', '2 🌀 Гамма']);
});

test('the last visible page cannot be hidden', async ({ page }) => {
  await show(page);
  await page.locator('#ovSort').click();
  const tiles = page.locator('#ovGrid .ov-tile.sort');
  await tiles.nth(0).getByRole('button', { name: 'Скрыть страницу' }).click();
  await tiles.nth(1).getByRole('button', { name: 'Скрыть страницу' }).click();
  await expect(page.locator('#toast')).toContainText('Хотя бы одна страница должна остаться');
  await expect(tiles.nth(1)).not.toHaveClass(/off/);
});

test('closing the overview while sorting changes nothing', async ({ page }) => {
  await show(page);
  await page.locator('#ovSort').click();
  await page.locator('#ovGrid .ov-tile.sort').nth(1).getByRole('button', { name: 'Раньше' }).click();
  await page.locator('#overview').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#overview')).toBeHidden();
  await page.evaluate(() => window.openOverview());
  expect(await names(page)).toEqual(['1 🅰️ Альфа', '2 🅱️ Бета']);
  await expect(page.locator('#ovSort')).toHaveText('⇅ Порядок');
});
