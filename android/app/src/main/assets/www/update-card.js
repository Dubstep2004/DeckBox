// DeckBox: everything about updates that the person sees. Shared by the panel on the phone and the settings page on
// the computer (served there as /panel/update-card.js).
//
//   showUpdateCard(update, { apply, versions, parts, onClose })
//     update   — { latest, name, notes: [{ title, items }], app, agent }
//     apply()  — starts the update; may return a promise. Progress comes back through setUpdateProgress().
//     versions — [['Компьютер', '1.4.0'], ['Приложение', '1.4.0']] shown at the bottom
//     parts    — which parts get updated: ['phone', 'pc'] (a row of steps each)
//   showWhatsNew(info)        — «Обновлено до 1.5.0» once after an update, with what is new
//   showHistory(list, opts)   — «Все обновления»: every release with what was new in it
//   parseNotes(markdown)      — the ✨ / ⚡ / 🛠 / 🗑 sections of a release description
//
// «Позже» hides the card for 12 hours, «Не напоминать» until the next version; «⬆ 1.5.0» in the status line opens it.

const LATER_KEY = 'deckbox-update-later';
const SKIP_KEY = 'deckbox-update-skip';
const LATER_MS = 12 * 3600 * 1000;
let card = null;

function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };

/** «Не напоминать» was pressed for exactly this version. */
export function skipped(version) { return read(SKIP_KEY) === version; }

/** True while «Позже» was pressed for this version less than 12 hours ago, or «Не напоминать» for it. */
export function snoozed(version) {
  const l = read(LATER_KEY);
  return skipped(version) || (!!l && l.version === version && Date.now() - l.at < LATER_MS);
}

/** Splits a release description into its sections, up to the download table (as the agent's ParseNotes does). */
export function parseNotes(md) {
  const out = [];
  let cur = null, last = null;
  for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (/^---\s*$/.test(line) || /^###\s*⬇/.test(line)) break;
    const h = line.match(/^###\s+(.+)$/);
    if (h) { cur = { title: h[1].trim(), items: [] }; out.push(cur); last = null; continue; }
    if (!cur) continue;
    const li = line.match(/^\s*[-*]\s+(.+)$/);
    const clean = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
    // the place labels at the start, `📱 Панель` `💻 Компьютер`, become "📱 Панель · 💻 Компьютер — "
    const labels = (s) => s.replace(/^((?:`[^\x00-\x7F`][^`]*`\s*)+)(?=\S)/, (m) => [...m.matchAll(/`([^`]+)`/g)].map((x) => x[1]).join(' · ') + ' — ');
    if (li) { cur.items.push(clean(labels(li[1]))); last = cur.items.length - 1; } else if (line.trim() && last != null) {
      cur.items[last] = (cur.items[last] + ' ' + clean(line)).trim();
    } else last = null;
  }
  return out.filter((s) => s.items.length);
}

const STYLE = `
.dbu-back{position:fixed;inset:0;z-index:9000;background:rgba(5,5,7,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:4vmin;animation:dbu-in .25s ease}
.dbu{position:relative;width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(160deg,#1a1814,#0e0e10 60%);border:1px solid rgba(var(--ambient, 212, 175, 55),.45);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(var(--ambient, 212, 175, 55),.08) inset;color:#f1ece1;font-family:inherit;overflow:hidden}
.dbu-head{padding:20px 26px 12px;border-bottom:1px solid rgba(var(--ambient, 212, 175, 55),.18)}
.dbu-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#17130a;background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));padding:4px 10px;border-radius:999px;font-weight:700}
.dbu-title{margin:10px 0 2px;font-size:26px;font-weight:800;letter-spacing:-.01em}
.dbu-title b{background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));-webkit-background-clip:text;background-clip:text;color:transparent}
.dbu-name{color:#c9bfa6;font-size:16px}
.dbu-body{padding:6px 26px 8px;overflow:auto;flex:1}
.dbu-sec{margin:14px 0 4px;font-size:15px;font-weight:700;color:var(--gold-hi, #f2d675)}
.dbu-body ul{margin:0;padding-left:20px}
.dbu-body li{margin:5px 0;font-size:14.5px;line-height:1.4;color:#e6dfcf}
.dbu-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 26px 18px;border-top:1px solid rgba(var(--ambient, 212, 175, 55),.18)}
.dbu-btn{appearance:none;border:1px solid rgba(var(--ambient, 212, 175, 55),.5);background:transparent;color:#f1ece1;font:inherit;font-size:16px;font-weight:700;padding:11px 20px;border-radius:14px;cursor:pointer}
.dbu-btn.go{background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));color:#17130a;border-color:transparent;box-shadow:0 6px 20px rgba(var(--ambient, 212, 175, 55),.3)}
.dbu-btn.link{border-color:transparent;font-weight:600;font-size:14px;color:#9d9686;padding:11px 6px}
.dbu-btn:disabled{opacity:.55;cursor:default}
.dbu-ver{margin-left:auto;font-size:12.5px;color:#9d9686;text-align:right}
.dbu-steps{flex-basis:100%;display:flex;flex-direction:column;gap:6px}
.dbu-row{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:10px;font-size:13px}
.dbu-row>b{color:#c9bfa6;font-weight:600}.dbu-row>b small{display:block;font-weight:400;font-size:11px;color:#8d846f}
.dbu-prog{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px}
.dbu-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
.dbu-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--gold, #d4af37),var(--gold-hi, #f2d675));transition:width .4s}
.dbu-prog em{font-style:normal;font-size:12px;color:#8d846f;white-space:nowrap;min-width:84px;text-align:right}
.dbu-prog.ok em{color:var(--gold-hi, #f2d675)}.dbu-prog.bad em{color:#f87171}.dbu-prog.bad .dbu-bar i{background:#b4372f}
.dbu-msg{flex-basis:100%;font-size:13.5px;color:#c9bfa6}
.dbu-msg:empty{display:none}
.dbu-msg.err{color:#f87171}
.dbu-rel{margin:14px 0 18px;padding-bottom:12px;border-bottom:1px solid rgba(var(--ambient, 212, 175, 55),.12)}
.dbu-rel:last-child{border-bottom:0}
.dbu-rel h4{margin:0;font-size:17px;font-weight:800;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.dbu-rel h4 small{font-size:12.5px;color:#9d9686;font-weight:500}
.dbu-rel h4 em{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(var(--ambient, 212, 175, 55),.2);color:var(--gold-hi, #f2d675)}
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

function notesBody(notes) {
  const body = el('div', 'dbu-body');
  for (const s of notes || []) {
    body.append(el('div', 'dbu-sec', s.title));
    const ul = el('ul');
    for (const it of s.items || []) ul.append(el('li', null, it));
    body.append(ul);
  }
  if (!notes?.length) body.append(el('p', 'dbu-name', 'Исправления и улучшения.'));
  return body;
}

function frame(tag, title, name, body, foot, onBack) {
  ensureStyle();
  closeUpdateCard();
  const back = el('div', 'dbu-back',
    el('div', 'dbu',
      el('div', 'dbu-head', el('span', 'dbu-tag', tag), title, name ? el('div', 'dbu-name', name) : null),
      body, foot));
  back.onclick = (e) => { if (e.target === back) onBack(); };
  back.addEventListener('pointerdown', (e) => e.stopPropagation());
  card = back;
  document.body.append(back);
  return back;
}

const titleOf = (text, version) => { const t = el('div', 'dbu-title', text); t.append(el('b', null, version)); return t; };

// one progress bar per part with a short word of what it is doing (no row of step names)
const STEP_TEXT = ['скачивает', 'проверяет', 'ставит', '✓ готово'];
// how far the bar is at the start of each step: the download fills most of it
const STEP_AT = [0, 85, 92, 100];
const PART_NAMES = { phone: 'Телефон', pc: 'Компьютер' };

/** 1,3 МБ · 48 МБ · 820 КБ */
export function fmtSize(bytes) {
  if (!(bytes > 0)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  const mb = bytes / 1048576;
  return `${(mb < 10 ? mb.toFixed(1) : String(Math.round(mb))).replace('.', ',')} МБ`;
}
/** «2,1 МБ/с · ещё ~3 мин»: the speed and the time left of a download; '' until the speed is known. */
export function speedText(bps, left) {
  if (!(bps > 0)) return '';
  const speed = bps >= 1048576 ? `${(bps / 1048576).toFixed(1).replace('.', ',')} МБ/с` : `${Math.max(1, Math.round(bps / 1024))} КБ/с`;
  if (!(left > 0)) return speed;
  const sec = left / bps;
  const eta = sec < 60 ? `ещё ~${Math.max(1, Math.ceil(sec / 5) * 5)} с` : sec < 3600 ? `ещё ~${Math.ceil(sec / 60)} мин` : `ещё ~${Math.floor(sec / 3600)} ч ${Math.ceil((sec % 3600) / 60)} мин`;
  return `${speed} · ${eta}`;
}
// the speed of each part's download, measured here when the sender gives only bytes (the phone app)
const meters = {};
function measure(part, done) {
  const now = Date.now();
  const m = meters[part];
  if (!m || done < m.done) { meters[part] = { t: now, done, bps: 0 }; return 0; }
  const dt = (now - m.t) / 1000;
  if (dt >= 1) {
    const cur = (done - m.done) / dt;
    m.bps = m.bps > 0 ? m.bps * 0.7 + cur * 0.3 : cur;
    m.t = now; m.done = done;
  }
  return m.bps;
}

/** Shows the card (replacing an open one). «Позже», «Не напоминать» and the backdrop close it. */
export function showUpdateCard(u, { apply, versions = [], parts, sizes = {}, onClose } = {}) {
  if (!u?.latest) return;
  const go = el('button', 'dbu-btn go', 'Обновить');
  const wait = el('button', 'dbu-btn', 'Позже');
  const skip = el('button', 'dbu-btn link', 'Не напоминать');
  const msg = el('div', 'dbu-msg');
  const ver = el('div', 'dbu-ver', versions.filter((v) => v[1]).map((v) => `${v[0]}: ${v[1]}`).join(' · '));
  // one row of steps for each part that gets the new version
  const which = parts || [u.app !== false && 'phone', u.agent !== false && 'pc'].filter(Boolean);
  const steps = el('div', 'dbu-steps');
  const rows = {};
  for (const p of which.length ? which : ['phone']) {
    const chips = el('div', 'dbu-prog', el('div', 'dbu-bar', el('i')), el('em', null, ''));
    rows[p] = chips;
    // «Телефон · 1,3 МБ»: only the parts this version changes are downloaded, and how much each one is
    const size = fmtSize(sizes[p]);
    steps.append(el('div', 'dbu-row', el('b', null, PART_NAMES[p] || p, size ? el('small', null, size) : null), chips));
  }
  const close = () => { closeUpdateCard(); onClose?.(); };
  wait.onclick = () => { write(LATER_KEY, { version: u.latest, at: Date.now() }); close(); };
  skip.onclick = () => { write(SKIP_KEY, u.latest); close(); };
  go.onclick = async () => {
    go.disabled = true;
    skip.hidden = true;
    wait.textContent = 'Скрыть';
    setUpdateProgress({ stage: 'start' });
    try { await apply?.(); } catch (e) { setUpdateProgress({ stage: 'error', error: e?.message || String(e) }); }
  };
  const back = frame('⬆ Вышла новая версия', titleOf('DeckBox PRO ', u.latest), u.name, notesBody(u.notes),
    el('div', 'dbu-foot', go, wait, skip, ver, steps, msg), () => close());
  back._parts = { go, wait, skip, msg, steps, rows, sizes };
}

/** «Обновлено до 1.5.0»: once after an update (also one made at night), with what is new in it. */
export function showWhatsNew(info, { onClose } = {}) {
  if (!info?.version) return;
  const ok = el('button', 'dbu-btn go', 'Отлично');
  const close = () => { closeUpdateCard(); onClose?.(); };
  ok.onclick = close;
  const when = info.night ? 'Обновлено ночью' : 'Обновлено';
  const name = [info.name, info.from ? `было ${info.from}` : null].filter(Boolean).join(' · ');
  frame('✓ ' + when, titleOf('DeckBox PRO ', info.version), name, notesBody(info.notes), el('div', 'dbu-foot', ok), close);
}

/**
 * «Все обновления»: [{ version, name, date, notes }] newest first. current = the installed version (marked);
 * onUpdate, when given, adds «Обновить» at the top for a newer release.
 */
export function showHistory(list, { current, latest, onUpdate, onClose } = {}) {
  const body = el('div', 'dbu-body');
  if (!list?.length) body.append(el('p', 'dbu-name', 'Список версий сейчас недоступен: нет связи с GitHub.'));
  for (const r of list || []) {
    const d = r.date ? new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const h = el('h4', null, 'DeckBox PRO ' + r.version, r.name ? el('small', null, r.name) : null, d ? el('small', null, d) : null,
      r.version === current ? el('em', null, 'у вас') : null);
    const sec = el('div', 'dbu-rel', h);
    for (const s of r.notes || []) {
      sec.append(el('div', 'dbu-sec', s.title));
      const ul = el('ul');
      for (const it of s.items || []) ul.append(el('li', null, it));
      sec.append(ul);
    }
    body.append(sec);
  }
  const shut = el('button', 'dbu-btn', 'Закрыть');
  const close = () => { closeUpdateCard(); onClose?.(); };
  shut.onclick = close;
  const foot = el('div', 'dbu-foot');
  if (onUpdate && latest) {
    const go = el('button', 'dbu-btn go', 'Обновить до ' + latest);
    go.onclick = () => { closeUpdateCard(); onUpdate(); };
    foot.append(go);
  }
  foot.append(shut, el('div', 'dbu-ver', current ? 'Установлена ' + current : ''));
  frame('🕘 Все обновления', el('div', 'dbu-title', 'История версий'), null, body, foot, close);
}

const AGENT_STATES = {
  'checking': ['pc', 0, 'Проверяю обновления…'],
  'updating agent': ['pc', 0, 'Компьютер скачивает и проверяет новую версию…'],
  'restarting': ['pc', 2, 'Компьютер ставит новую версию и перезапускается…'],
  'updating phone app': ['phone', 2, 'Ставлю приложение на телефон по USB…'],
  'installing the phone app': ['phone', 2, 'Ставлю приложение на телефон…'],
};
const PHONE_STAGES = { download: 0, verify: 1, install: 2, done: 3 };

function mark(part, step, { pct, bad } = {}) {
  const row = card?._parts?.rows?.[part];
  if (!row) return;
  card._parts.steps.style.display = 'flex';
  const width = step === 0 && pct != null ? Math.max(2, Math.min(99, pct)) * 0.85 : STEP_AT[step] ?? 0;
  row.className = 'dbu-prog' + (bad ? ' bad' : step === 3 ? ' ok' : '');
  row.querySelector('.dbu-bar i').style.width = (bad ? Math.max(width, 6) : width) + '%';
  row.querySelector('em').textContent = bad ? 'ошибка' : step === 0 && pct ? `${STEP_TEXT[0]} ${Math.round(pct)}%` : STEP_TEXT[step];
}

/**
 * Progress on the open card: { part: 'phone' | 'pc', stage: 'start' | 'download' | 'verify' | 'install' | 'done' |
 * 'error' | <agent state>, pct, error, note }. Without a part, phone stages go to the phone row and agent states to theirs.
 */
export function setUpdateProgress(p) {
  if (!card?._parts || !p) return;
  const { go, msg, wait, skip } = card._parts;
  msg.classList.remove('err');
  if (p.stage in AGENT_STATES) {
    const [part, step, text] = AGENT_STATES[p.stage];
    mark(p.part || part, step);
    msg.textContent = text;
    return;
  }
  const part = p.part || 'phone';
  switch (p.stage) {
    case 'start': msg.textContent = 'Начинаю обновление…'; for (const k in card._parts.rows) mark(k, 0, { pct: 2 }); break;
    case 'download': {
      const total = p.total > 0 ? p.total : card._parts.sizes?.[part];
      const done = p.done >= 0 ? p.done : total && p.pct != null ? (total * p.pct) / 100 : null;
      const pct = p.pct != null ? p.pct : total && done != null ? Math.min(99, Math.floor((done * 100) / total)) : 0;
      const bps = p.bps > 0 ? p.bps : done != null ? measure(part, done) : 0;
      const extra = speedText(bps, total && done != null ? total - done : 0);
      msg.textContent = `${part === 'pc' ? 'Компьютер скачивает' : 'Скачиваю'} новую версию… ${pct}%` + (extra ? ` · ${extra}` : '');
      mark(part, 0, { pct });
      break;
    }
    case 'verify': msg.textContent = 'Проверяю, что файл целый и подписан тем же ключом…'; mark(part, 1); break;
    case 'install': msg.textContent = 'Устанавливаю… Подтвердите установку на телефоне, если Android спросит.'; mark(part, 2); break;
    case 'done':
      if (p.part) mark(p.part, 3); else for (const k in card._parts.rows) mark(k, 3);
      msg.textContent = p.note || 'Готово! DeckBox обновлён.';
      go.hidden = true; skip.hidden = true; wait.textContent = 'Закрыть';
      break;
    case 'error':
      mark(part, 0, { bad: true });
      msg.textContent = 'Не получилось: ' + (p.error || 'неизвестная ошибка');
      msg.classList.add('err');
      go.disabled = false;
      go.textContent = 'Повторить';
      break;
  }
}

export function updateCardOpen() { return !!card; }
