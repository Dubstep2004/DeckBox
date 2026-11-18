// DeckBox: «Вышла новая версия» — a card with what is new in the release and two buttons, «Обновить» and «Позже».
// Shared by the panel on the phone and the settings page on the computer (served there as /panel/update-card.js).
//
//   showUpdateCard(update, { apply, versions, onClose })
//     update   — state.update from the agent: { latest, name, notes: [{ title, items }], app, agent, state, error }
//     apply()  — starts the update; may return a promise. Progress comes back through setUpdateProgress().
//     versions — [['Агент', '1.1.2'], ['Приложение', '1.1.2']] shown at the bottom
//
// «Позже» hides the card for this version for 12 hours; the small «⬆ 1.1.3» in the status line opens it again.

const LATER_KEY = 'deckbox-update-later';
const LATER_MS = 12 * 3600 * 1000;
let card = null;

function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

function readLater() {
  try { return JSON.parse(localStorage.getItem(LATER_KEY) || 'null'); } catch (_) { return null; }
}

/** True while «Позже» was pressed for this version less than 12 hours ago. */
export function snoozed(version) {
  const l = readLater();
  return !!l && l.version === version && Date.now() - l.at < LATER_MS;
}

function later(version) {
  try { localStorage.setItem(LATER_KEY, JSON.stringify({ version, at: Date.now() })); } catch (_) {}
}

const STYLE = `
.dbu-back{position:fixed;inset:0;z-index:9000;background:rgba(5,5,7,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:4vmin;animation:dbu-in .25s ease}
.dbu{position:relative;width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(160deg,#1a1814,#0e0e10 60%);border:1px solid rgba(var(--ambient, 212, 175, 55),.45);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(var(--ambient, 212, 175, 55),.08) inset;color:#f1ece1;font-family:inherit;overflow:hidden}
.dbu-head{padding:22px 26px 14px;border-bottom:1px solid rgba(var(--ambient, 212, 175, 55),.18)}
.dbu-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#17130a;background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));padding:4px 10px;border-radius:999px;font-weight:700}
.dbu-title{margin:12px 0 2px;font-size:26px;font-weight:800;letter-spacing:-.01em}
.dbu-title b{background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));-webkit-background-clip:text;background-clip:text;color:transparent}
.dbu-name{color:#c9bfa6;font-size:16px}
.dbu-body{padding:6px 26px 8px;overflow:auto;flex:1}
.dbu-sec{margin:14px 0 4px;font-size:15px;font-weight:700;color:var(--gold-hi, #f2d675)}
.dbu-body ul{margin:0;padding-left:20px}
.dbu-body li{margin:5px 0;font-size:14.5px;line-height:1.4;color:#e6dfcf}
.dbu-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 26px 20px;border-top:1px solid rgba(var(--ambient, 212, 175, 55),.18)}
.dbu-btn{appearance:none;border:1px solid rgba(var(--ambient, 212, 175, 55),.5);background:transparent;color:#f1ece1;font:inherit;font-size:16px;font-weight:700;padding:12px 22px;border-radius:14px;cursor:pointer}
.dbu-btn.go{background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));color:#17130a;border-color:transparent;box-shadow:0 6px 20px rgba(var(--ambient, 212, 175, 55),.3)}
.dbu-btn:disabled{opacity:.55;cursor:default}
.dbu-ver{margin-left:auto;font-size:12.5px;color:#9d9686;text-align:right}
.dbu-bar{height:4px;background:rgba(var(--ambient, 212, 175, 55),.15);border-radius:4px;overflow:hidden;flex-basis:100%;display:none}
.dbu-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));transition:width .3s}
.dbu-msg{flex-basis:100%;font-size:13.5px;color:#c9bfa6}
.dbu-msg:empty{display:none}
.dbu-msg.err{color:#f87171}
@keyframes dbu-in{from{opacity:0;transform:scale(.97)}to{opacity:1}}
`;

function ensureStyle() {
  if (document.getElementById('dbu-style')) return;
  const s = document.createElement('style');
  s.id = 'dbu-style';
  s.textContent = STYLE;
  document.head.append(s);
}

export function closeUpdateCard() {
  card?.remove();
  card = null;
}

/** Shows the card (replacing an open one). Returns nothing; «Позже» and the backdrop close it. */
export function showUpdateCard(u, { apply, versions = [], onClose } = {}) {
  if (!u?.latest) return;
  ensureStyle();
  closeUpdateCard();
  const notes = Array.isArray(u.notes) ? u.notes : [];
  const body = el('div', 'dbu-body');
  for (const s of notes) {
    body.append(el('div', 'dbu-sec', s.title));
    const ul = el('ul');
    for (const it of s.items || []) ul.append(el('li', null, it));
    body.append(ul);
  }
  if (!notes.length) body.append(el('p', 'dbu-name', 'Исправления и улучшения.'));

  const go = el('button', 'dbu-btn go', 'Обновить');
  const wait = el('button', 'dbu-btn', 'Позже');
  const bar = el('div', 'dbu-bar', el('i'));
  const msg = el('div', 'dbu-msg');
  const ver = el('div', 'dbu-ver', versions.filter((v) => v[1]).map((v) => `${v[0]}: ${v[1]}`).join(' · '));
  const close = () => { closeUpdateCard(); onClose?.(); };
  wait.onclick = () => { later(u.latest); close(); };
  go.onclick = async () => {
    go.disabled = true;
    wait.textContent = 'Скрыть';
    setUpdateProgress({ stage: 'start' });
    try { await apply?.(); } catch (e) { setUpdateProgress({ stage: 'error', error: e?.message || String(e) }); }
  };
  const back = el('div', 'dbu-back',
    el('div', 'dbu',
      el('div', 'dbu-head',
        el('span', 'dbu-tag', '⬆ Вышла новая версия'),
        (() => { const t = el('div', 'dbu-title', 'DeckBox PRO '); t.append(el('b', null, u.latest)); return t; })(),
        u.name ? el('div', 'dbu-name', u.name) : null),
      body,
      el('div', 'dbu-foot', go, wait, ver, bar, msg)));
  back.onclick = (e) => { if (e.target === back) close(); };
  back.addEventListener('pointerdown', (e) => e.stopPropagation());
  card = back;
  card._parts = { go, wait, bar, msg };
  document.body.append(back);
}

const STATES = {
  'checking': 'Проверяю обновления…',
  'updating phone app': 'Ставлю приложение на телефон по USB…',
  'updating agent': 'Обновляю агент на компьютере…',
  'restarting': 'Агент перезапускается…',
  'installing the phone app': 'Ставлю приложение на телефон…',
};

/**
 * Progress on the open card: { stage: 'start' | 'download' | 'install' | 'done' | 'error' | <agent state>, pct, error }.
 */
export function setUpdateProgress(p) {
  if (!card || !p) return;
  const { go, bar, msg } = card._parts;
  msg.classList.remove('err');
  const pct = (n) => { bar.style.display = 'block'; bar.firstChild.style.width = Math.max(0, Math.min(100, n)) + '%'; };
  switch (p.stage) {
    case 'start': msg.textContent = 'Начинаю обновление…'; pct(3); break;
    case 'download': msg.textContent = `Скачиваю новую версию… ${p.pct || 0}%`; pct(p.pct || 0); break;
    case 'install': msg.textContent = 'Устанавливаю… Подтвердите установку на телефоне, если Android спросит.'; pct(100); break;
    case 'done': msg.textContent = p.note || 'Готово! DeckBox обновлён.'; pct(100); go.hidden = true; card._parts.wait.textContent = 'Закрыть'; break;
    case 'error':
      msg.textContent = 'Не получилось: ' + (p.error || 'неизвестная ошибка');
      msg.classList.add('err');
      go.disabled = false;
      go.textContent = 'Повторить';
      break;
    default:
      if (STATES[p.stage]) { msg.textContent = STATES[p.stage]; pct(60); }
  }
}

export function updateCardOpen() { return !!card; }
