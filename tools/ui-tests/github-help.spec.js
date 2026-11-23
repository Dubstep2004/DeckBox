// The GitHub widget without GitHub CLI: «Как подключить GitHub» with the install and sign-in buttons.
const { test, expect } = require('@playwright/test');

async function show(page, query = '') {
  await page.addInitScript(() => localStorage.setItem('pb-demo-config', JSON.stringify({ night: { enabled: false }, rules: [], shortcuts: [],
    pages: [{ id: 'g', title: 'G', icon: '🐙', enabled: true, widgets: [{ id: 'gh', type: 'github', x: 0, y: 0, w: 6, h: 6 }] }] })));
  await page.goto('/panel/' + query);
}

test('without GitHub CLI the widget says how to connect it instead of the raw error, and the buttons do it', async ({ page }) => {
  await show(page, '?nogh=1');
  const note = page.locator('.gh-note');
  await expect(note).toContainText('GitHub CLI не установлен на компьютере');
  await expect(page.locator('.gh-sec').first()).toBeHidden(); // no empty «Нет открытых PR» under it
  await expect(page.locator('.w')).not.toContainText('start process');
  await note.getByRole('button', { name: 'Как подключить ›' }).click();
  const dlg = page.locator('.gh-panel');
  await expect(dlg).toContainText('GitHub на компьютере');
  await expect(dlg).toContainText('winget install GitHub.cli');
  await dlg.getByRole('button', { name: /Установить на ПК/ }).click();
  await expect(dlg.locator('.cc-step').first()).toHaveClass(/done/, { timeout: 8000 });
  await dlg.getByRole('button', { name: /Открыть окно входа на ПК/ }).click();
  await expect(page.locator('#toast')).toContainText('окно входа в GitHub');
  await expect(dlg.locator('.cc-step').nth(1)).toHaveClass(/done/, { timeout: 8000 });
});

test('with GitHub connected there are no instructions', async ({ page }) => {
  await show(page);
  await expect(page.locator('.gh-list').first()).toBeVisible();
  await expect(page.locator('.gh-note')).toHaveCount(0);
});

test('the ⚙ in the GitHub widget removes GitHub CLI from the computer after a confirmation', async ({ page }) => {
  await show(page, '?nogh=1');
  await page.locator('.gh-note').getByRole('button', { name: 'Как подключить ›' }).click();
  const dlg = page.locator('.gh-panel');
  await dlg.getByRole('button', { name: /Установить на ПК/ }).click();
  await expect(dlg.locator('.cc-busy').first()).toContainText('идёт');
  await expect(dlg.getByRole('button', { name: /Удалить с ПК/ })).toBeVisible({ timeout: 8000 });
  await dlg.getByRole('button', { name: /Удалить с ПК/ }).click();
  await dlg.getByRole('button', { name: /Да, удалить/ }).click();
  await expect(dlg.getByRole('button', { name: /Установить на ПК/ })).toBeVisible({ timeout: 8000 });
});
