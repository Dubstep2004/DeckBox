// DeckBox PRO: «Как подключить Claude Code» in the «Сеансы» and «Квоты ИИ» widgets, with the install / sign-in buttons.
const { test, expect } = require('@playwright/test');

async function show(page, widgets, query = '') {
  await page.addInitScript((widgets) => {
    const cfg = { night: { enabled: false }, rules: [], shortcuts: [], pages: [{ id: 'ai', title: 'AI', icon: '✳', enabled: true, widgets }] };
    localStorage.setItem('pb-demo-config', JSON.stringify(cfg));
  }, widgets);
  await page.goto('/panel/' + query);
}
const SESSIONS = [{ id: 's', type: 'sessions', x: 0, y: 0, w: 7, h: 6 }];
const QUOTAS = [{ id: 'q', type: 'quotas', x: 0, y: 0, w: 12, h: 6, options: { providers: ['claude'], rotate: false } }];

test('without Claude Code the sessions widget says how to connect it, and the buttons install it and open the sign-in', async ({ page }) => {
  await show(page, SESSIONS, '?nocc=1');
  const note = page.locator('.w .cc-note');
  await expect(note).toContainText('Claude Code не установлен на компьютере');
  await note.getByRole('button', { name: 'Как подключить ›' }).click();
  const dlg = page.locator('.cc-panel');
  await expect(dlg).toContainText('Claude Code на компьютере');
  await expect(dlg).toContainText('irm https://claude.ai/install.ps1 | iex');
  await expect(dlg.getByRole('button', { name: /Открыть окно входа/ })).toHaveCount(0); // nothing to sign in with yet
  await dlg.getByRole('button', { name: /Установить на ПК/ }).click();
  await expect(dlg.locator('.cc-busy')).toBeVisible();
  await expect(dlg.locator('.cc-step').first()).toHaveClass(/done/, { timeout: 8000 });
  await dlg.getByRole('button', { name: /Открыть окно входа на ПК/ }).click();
  await expect(page.locator('#toast')).toContainText('войдите в аккаунт Claude');
  await expect(dlg.locator('.cc-step').nth(1)).toHaveClass(/done/, { timeout: 8000 });
  await dlg.locator('.session-close').click();
  await expect(dlg).toHaveCount(0);
});

test('with Claude Code connected the sessions widget lists the sessions and shows no instructions', async ({ page }) => {
  await show(page, SESSIONS);
  await expect(page.locator('.w .sess').first()).toBeVisible();
  await expect(page.locator('.cc-note')).toHaveCount(0);
});

test('the quota card for Claude without a sign-in offers the same steps', async ({ page }) => {
  await show(page, QUOTAS, '?nocc=1');
  const note = page.locator('.q-card .cc-note');
  await expect(note).toBeVisible();
  await note.getByRole('button', { name: 'Как подключить ›' }).click();
  await expect(page.locator('.cc-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cc-panel')).toHaveCount(0);
});

test('with Claude Code installed the ⚙ in «Сеансы» shows its version, updates it and removes it from the computer', async ({ page }) => {
  await show(page, SESSIONS);
  await page.locator('.w .w-gear').click();
  const dlg = page.locator('.cc-panel');
  await expect(dlg.locator('.cc-ver')).toContainText('версия 2.1.40');
  await dlg.getByRole('button', { name: /Обновить Claude Code/ }).click();
  await expect(dlg.locator('.cc-busy')).toContainText('идёт');
  await expect(dlg.locator('.cc-ver')).toContainText('версия 2.1.41', { timeout: 8000 });
  await dlg.getByRole('button', { name: /Удалить с ПК/ }).click();
  await expect(dlg.locator('.cc-confirm')).toContainText('Проекты и настройки останутся');
  await dlg.getByRole('button', { name: /Да, удалить/ }).click();
  await expect(page.locator('#toast')).toContainText('Claude Code удалён с компьютера', { timeout: 8000 });
  await expect(dlg.locator('.cc-step').first()).not.toHaveClass(/done/); // «Установить на компьютер» again
});

test('the PC settings list Claude Code and GitHub CLI with their buttons', async ({ page }) => {
  await page.goto('/settings/#pro');
  const box = page.locator('#aiTools');
  await expect(box.locator('#aiClaude')).toContainText('Claude Code: установлен · версия 2.1.40');
  await expect(box.locator('#aiClaude').getByRole('button', { name: /Обновить/ })).toBeVisible();
  await expect(box.locator('#aiGh')).toContainText('GitHub CLI: установлен');
  page.once('dialog', (d) => d.accept());
  await box.locator('#aiGh').getByRole('button', { name: /Удалить/ }).click();
  await expect(box.locator('#aiGh')).toContainText(/удаляется|не установлен/);
});
