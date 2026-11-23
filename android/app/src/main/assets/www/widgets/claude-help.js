// How to connect Claude Code (DeckBox PRO): the «Сеансы» and «Квоты ИИ» widgets show it when Claude Code is not installed
// or not signed in on the computer. Two buttons do the computer's part from the phone: install it with Anthropic's
// official installer, and open a window with `claude` on the computer to sign in.
import { D, api, h, haptic, toast } from '../main.js';
import { fmtSpeed } from '../update-card.js';

/** «скорость 2,1 МБ/с · идёт 2 мин» while the computer installs, updates or removes something. */
export function jobLine(s, what) {
  const min = s?.since ? Math.floor((Date.now() - s.since) / 60000) : 0;
  const speed = s?.busy !== 'remove' ? fmtSpeed(D.state?.pc?.netDownBps) : '';
  return [what, speed && 'скорость ' + speed, min < 1 ? 'идёт меньше минуты' : `идёт ${min} мин`].filter(Boolean).join(' · ');
}
const BUSY = { install: 'Устанавливаю… обычно 1–2 мин', update: 'Обновляю…', remove: 'Удаляю…' };
const DONE = { installed: 'Claude Code установлен', updated: 'Claude Code обновлён', removed: 'Claude Code удалён с компьютера' };

let state = null;
let at = 0;
let loading = null;

/** GET /api/claude-code, cached for 30 seconds: { installed, signedIn, installing, error, canInstall } or null. */
export function claudeCodeStatus(force = false) {
  if (!force && state && Date.now() - at < 30_000) return Promise.resolve(state);
  if (loading) return loading;
  loading = api('/claude-code')
    .then((s) => { state = s && typeof s === 'object' ? s : null; at = Date.now(); return state; })
    .catch(() => state)
    .finally(() => { loading = null; });
  return loading;
}
export const claudeCodeKnown = () => state;
export const claudeCodeReady = (s) => !!(s && s.installed && s.signedIn);

/** The short note inside a widget: what is missing and a button that opens the steps. */
export function claudeHelpNote(s) {
  const btn = h('button', 'cc-open', 'Как подключить ›');
  btn.type = 'button';
  btn.addEventListener('click', (e) => { e.stopPropagation(); openClaudeHelp(); });
  return h('div', 'cc-note',
    h('span', 'cc-ico', '✳'),
    h('span', 'cc-txt', h('b', null, !s || !s.installed ? 'Claude Code не установлен на компьютере' : 'Claude Code: нужно войти в аккаунт'),
      h('small', null, 'Тогда здесь появятся сеансы и лимиты Claude')),
    btn);
}

/** The dialog with the steps; it follows the computer's progress while it is open. */
export function openClaudeHelp() {
  haptic();
  document.querySelector('.cc-backdrop')?.remove();
  const backdrop = h('div', 'session-backdrop cc-backdrop');
  const panel = h('div', 'session-panel cc-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const close = h('button', 'session-close', '✕');
  close.setAttribute('aria-label', 'Закрыть');
  const steps = h('ol', 'cc-steps');
  const tools = h('div', 'cc-tools');
  let timer = 0;
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  const dismiss = () => { clearInterval(timer); backdrop.remove(); document.removeEventListener('keydown', onKey); };
  close.addEventListener('click', dismiss);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) dismiss(); });

  const button = (label, onClick, primary = true) => {
    const b = h('button', 'cc-btn' + (primary ? ' primary' : ''), label);
    b.type = 'button';
    b.addEventListener('click', async () => { haptic(); b.disabled = true; try { await onClick(); } finally { b.disabled = false; } });
    return b;
  };
  const install = async () => {
    try { render(await api('/claude-code/install', 'POST', 8000)); toast('Устанавливаю Claude Code на компьютер…', 'ok'); }
    catch (_) { toast('Компьютер не ответил', 'err'); }
  };
  const update = async () => {
    try { render(await api('/claude-code/update', 'POST', 8000)); toast('Обновляю Claude Code на компьютере…', 'ok'); }
    catch (_) { toast('Компьютер не ответил', 'err'); }
  };
  let confirmRemove = false;
  let signOut = false;
  const remove = async () => {
    try { render(await api('/claude-code/remove' + (signOut ? '?signout=1' : ''), 'POST', 8000)); confirmRemove = false; }
    catch (_) { toast('Компьютер не ответил', 'err'); }
  };
  let lastDone = null;
  const signIn = async () => {
    try {
      await api('/claude-code/signin', 'POST', 8000);
      toast('На компьютере открылось окно: войдите в аккаунт Claude', 'ok', '', 5);
    } catch (_) { toast('Не удалось открыть окно на компьютере. Откройте PowerShell и введите claude', 'err', '', 5); }
  };

  const render = (s) => {
    if (s) { state = s; at = Date.now(); }
    s = state;
    if (s?.done && s.done !== lastDone && lastDone !== null) toast(DONE[s.done] || 'Готово', 'ok');
    if (s) lastDone = s.done || '';
    const installed = !!s?.installed, signed = !!s?.signedIn;
    // the program on the computer: its version, «Обновить», «Удалить с ПК» (with a confirmation)
    if (installed || s?.busy === 'remove') {
      const check = h('input');
      check.type = 'checkbox'; check.checked = signOut;
      check.addEventListener('change', () => { signOut = check.checked; });
      tools.replaceChildren(
        h('p', 'cc-ver', '✳ Claude Code на компьютере' + (s?.version ? ` · версия ${s.version}` : '')),
        s?.busy ? h('p', 'cc-busy', jobLine(s, BUSY[s.busy])) : null,
        s?.error && s?.busy == null && installed ? h('p', 'cc-err', s.error) : null,
        s?.busy ? null : confirmRemove
          ? h('div', 'cc-confirm', h('p', null, 'Удалить Claude Code с компьютера? Проекты и настройки останутся.'),
            h('label', 'cc-check', check, ' и выйти из аккаунта Claude на этом ПК'),
            h('div', 'cc-row', button('🗑 Да, удалить', remove), button('Отмена', async () => { confirmRemove = false; render(null); }, false)))
          : h('div', 'cc-row', button('⬆ Обновить Claude Code', update, false), button('🗑 Удалить с ПК', async () => { confirmRemove = true; render(null); }, false)));
    } else tools.replaceChildren();
    const step = (done, title, ...body) => h('li', 'cc-step' + (done ? ' done' : ''), h('b', null, (done ? '✓ ' : '') + title), ...body);
    steps.replaceChildren(
      step(installed, 'Установить на компьютер',
        installed ? h('p', null, 'Claude Code установлен.')
          : s?.busy === 'install' || s?.installing ? h('p', 'cc-busy', jobLine(s, 'Устанавливаю…'))
            : h('div', null,
              h('p', null, 'Нажмите кнопку: компьютер сам скачает Claude Code с официального сайта.'),
              s?.error ? h('p', 'cc-err', s.error) : null,
              s?.canInstall === false ? null : button('⬇ Установить на ПК', install))),
      step(signed, 'Войти в аккаунт',
        signed ? h('p', null, 'Вход выполнен.')
          : h('div', null,
            h('p', null, 'На компьютере откроется окно. Выбирайте стрелками и Enter, способ входа — «Claude account with subscription». Браузер откроется сам: войдите тем же аккаунтом, что в приложении Claude, и нажмите «Authorize».'),
            installed ? button('🔑 Открыть окно входа на ПК', signIn) : null)),
      step(false, 'Работайте как обычно',
        h('p', null, '«Квоты ИИ» покажут, сколько лимита потрачено, в том числе в приложении Claude: лимиты общие. Сеансы появятся, когда вы запустите claude в папке проекта на компьютере.')));
  };

  const manual = h('details', 'cc-manual',
    h('summary', null, 'Сделать вручную на компьютере'),
    h('ol', null,
      h('li', null, 'Пуск → наберите PowerShell → Enter.'),
      h('li', null, 'Вставьте и нажмите Enter: ', h('code', null, 'irm https://claude.ai/install.ps1 | iex')),
      h('li', null, 'Закройте окно, откройте PowerShell снова и введите ', h('code', null, 'claude'), '.'),
      h('li', null, 'Войдите в аккаунт, потом закройте окно.')));

  panel.append(h('div', 'session-panel-head', h('span', null, '✳ Claude Code'), close),
    h('h2', null, 'Claude Code на компьютере'),
    h('p', 'cc-lead', 'ИИ-помощник для программирования от Anthropic. Нужна платная подписка Claude (Pro или Max).'),
    tools, steps, manual,
    h('p', 'session-note', 'Claude официально доступен не во всех странах (например, недоступен в России): установка или вход могут не пройти.'));
  backdrop.append(panel);
  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);
  render(null);
  claudeCodeStatus(true).then((s) => render(s));
  timer = setInterval(() => { if (!backdrop.isConnected) return clearInterval(timer); claudeCodeStatus(true).then((s) => backdrop.isConnected && render(s)); }, 3000);
  close.focus();
}
