// How to connect the GitHub widget (DeckBox PRO): shown when GitHub CLI is missing on the computer or not signed in.
// Two buttons do the computer's part from the phone: install GitHub CLI (winget) and open «gh auth login» in a window.
import { api, h, haptic, toast } from '../main.js';
import { jobLine } from './claude-help.js';

/** The short note inside the widget: what is missing and a button that opens the steps. */
export function gitHubHelpNote(setup) {
  const btn = h('button', 'cc-open', 'Как подключить ›');
  btn.type = 'button';
  btn.addEventListener('click', (e) => { e.stopPropagation(); openGitHubHelp(); });
  return h('div', 'cc-note gh-note',
    h('span', 'cc-ico', '🐙'),
    h('span', 'cc-txt', h('b', null, setup === 'login' ? 'Нужно войти в GitHub на компьютере' : 'GitHub CLI не установлен на компьютере'),
      h('small', null, 'Тогда здесь появятся ревью, ваши pull request и уведомления')),
    btn);
}

export function openGitHubHelp() {
  haptic();
  document.querySelector('.gh-backdrop')?.remove();
  const backdrop = h('div', 'session-backdrop gh-backdrop');
  const panel = h('div', 'session-panel cc-panel gh-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const close = h('button', 'session-close', '✕');
  close.setAttribute('aria-label', 'Закрыть');
  const steps = h('ol', 'cc-steps');
  const tools = h('div', 'cc-tools');
  let state = null;
  let timer = 0;
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  const dismiss = () => { clearInterval(timer); backdrop.remove(); document.removeEventListener('keydown', onKey); };
  close.addEventListener('click', dismiss);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) dismiss(); });
  const button = (label, onClick) => {
    const b = h('button', 'cc-btn primary', label);
    b.type = 'button';
    b.addEventListener('click', async () => { haptic(); b.disabled = true; try { await onClick(); } finally { b.disabled = false; } });
    return b;
  };
  const install = async () => {
    try { render(await api('/github/install', 'POST', 8000)); toast('Устанавливаю GitHub CLI на компьютер…', 'ok'); }
    catch (_) { toast('Компьютер не ответил', 'err'); }
  };
  let confirmRemove = false;
  const remove = async () => {
    try { render(await api('/github/remove', 'POST', 8000)); confirmRemove = false; toast('Удаляю GitHub CLI с компьютера…', 'ok'); }
    catch (_) { toast('Компьютер не ответил', 'err'); }
  };
  const signIn = async () => {
    try { await api('/github/signin', 'POST', 8000); toast('На компьютере открылось окно входа в GitHub', 'ok', '', 5); }
    catch (_) { toast('Не удалось открыть окно. Откройте PowerShell и введите gh auth login', 'err', '', 5); }
  };
  const render = (s) => {
    if (s) state = s;
    s = state;
    const installed = !!s?.installed, signed = !!s?.signedIn;
    if (installed || s?.busy === 'remove') {
      const plain = (label, fn) => { const b = button(label, fn); b.className = 'cc-btn'; return b; };
      tools.replaceChildren(h('p', 'cc-ver', '🐙 GitHub CLI на компьютере'),
        s?.busy ? h('p', 'cc-busy', jobLine(s, s.busy === 'remove' ? 'Удаляю…' : 'Устанавливаю…')) : null,
        s?.busy ? null : confirmRemove
          ? h('div', 'cc-confirm', h('p', null, 'Удалить GitHub CLI с компьютера? Виджет GitHub перестанет показывать данные.'),
            h('div', 'cc-row', button('🗑 Да, удалить', remove), plain('Отмена', async () => { confirmRemove = false; render(null); })))
          : h('div', 'cc-row', plain('🗑 Удалить с ПК', async () => { confirmRemove = true; render(null); })));
    } else tools.replaceChildren();
    const step = (done, title, ...body) => h('li', 'cc-step' + (done ? ' done' : ''), h('b', null, (done ? '✓ ' : '') + title), ...body);
    steps.replaceChildren(
      step(installed, 'Установить GitHub CLI на компьютер',
        installed ? h('p', null, 'GitHub CLI установлен.')
          : s?.busy === 'install' || s?.installing ? h('p', 'cc-busy', jobLine(s, 'Устанавливаю…'))
            : h('div', null, h('p', null, 'Нажмите кнопку: компьютер сам поставит официальную программу GitHub.'),
              s?.error ? h('p', 'cc-err', s.error) : null, s?.canInstall === false ? null : button('⬇ Установить на ПК', install))),
      step(signed, 'Войти в GitHub',
        signed ? h('p', null, 'Вход выполнен.')
          : h('div', null, h('p', null, 'На компьютере откроется окно: нажмите Enter, скопируйте код из окна, вставьте его в открывшемся браузере и нажмите «Authorize».'),
            installed ? button('🔑 Открыть окно входа на ПК', signIn) : null)),
      step(signed, 'Готово', h('p', null, 'Через минуту виджет покажет запросы на ревью, ваши pull request и уведомления.')));
  };
  const load = () => api('/github/setup').then((s) => backdrop.isConnected && render(s)).catch(() => {});
  const manual = h('details', 'cc-manual', h('summary', null, 'Сделать вручную на компьютере'),
    h('ol', null,
      h('li', null, 'Пуск → наберите PowerShell → Enter.'),
      h('li', null, 'Вставьте и нажмите Enter: ', h('code', null, 'winget install GitHub.cli')),
      h('li', null, 'Закройте окно, откройте PowerShell снова и введите ', h('code', null, 'gh auth login'), '.'),
      h('li', null, 'Выберите GitHub.com → HTTPS → Login with a web browser и войдите в браузере.')));
  panel.append(h('div', 'session-panel-head', h('span', null, '🐙 GitHub'), close), h('h2', null, 'GitHub на компьютере'),
    h('p', 'cc-lead', 'Нужен бесплатный аккаунт GitHub. DeckBox берёт данные через официальную программу GitHub CLI.'), tools, steps, manual);
  backdrop.append(panel);
  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);
  render(null);
  load();
  timer = setInterval(() => { if (!backdrop.isConnected) return clearInterval(timer); load(); }, 3000);
  close.focus();
}
