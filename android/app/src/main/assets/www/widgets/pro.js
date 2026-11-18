import { API, D, DEFAULT_AMBIENT, fmtDate, zoneNow, gpusOf, safeFetch, PANEL_HEADERS, PREVIEW, api, applyBrightness, bridge, cfg, curPage, goPage, h, haptic, hooks, pages, store, toast, wxLines } from '../main.js';
import { lines } from './helpers.js';
import { W } from '../registry.js';

// DeckBox PRO: «Не беспокоить», «Курс ЦБ РФ», «Игровой режим», «Утренний брифинг», «Статистика за неделю», «Голос»,
// gestures, the dark screen while the computer sleeps and the animated gold wallpaper.

const pad = (n) => String(n).padStart(2, '0');
const hm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dur = (min) => (min >= 60 ? `${Math.floor(min / 60)} ч ${pad(min % 60)} мин` : `${min} мин`);
const dsp = () => cfg.display || {};

const css = document.createElement('style');
css.textContent = `
.pro-dnd{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;display:flex;gap:8px;align-items:center;padding:7px 16px;
  border-radius:999px;background:rgba(20,18,12,.92);border:1px solid rgba(var(--ambient),.55);color:var(--gold-hi);font-weight:700;font-size:14px;
  box-shadow:0 6px 24px rgba(0,0,0,.5);cursor:pointer}
.pro-dnd small{color:#bfb08a;font-weight:500}
.w-quiet .q-btn{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:14px;
  border:1px solid rgba(var(--ambient),.25);background:rgba(255,255,255,.03);transition:background .25s,border-color .25s}
.w-quiet .q-btn b{font-size:clamp(15px,3.2vh,24px)} .w-quiet .q-btn span{font-size:28px;line-height:1} .w-quiet .q-btn small{color:var(--muted);font-size:12.5px}
.w-quiet.on .q-btn{background:linear-gradient(160deg,rgba(var(--ambient),.28),rgba(var(--ambient),.08));border-color:rgba(var(--ambient),.7);color:var(--gold-hi)}
.cbr{display:flex;flex-direction:column;height:100%;gap:4px}
.cbr-row{display:grid;grid-template-columns:auto 1fr auto;align-items:baseline;gap:10px;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,.06)}
.cbr-row:last-of-type{border-bottom:0}
.cbr-code{font-weight:700;color:var(--gold-hi);font-size:14px;min-width:46px} .cbr-name{color:var(--muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbr-val{font-size:clamp(16px,3.4vh,26px);font-weight:700;text-align:right} .cbr-val small{font-size:.55em;color:var(--muted);margin-left:2px}
.cbr-d{grid-column:2/4;text-align:right;font-size:12px;margin-top:-4px} .cbr-d.up{color:#7ddc8e} .cbr-d.down{color:#ff8a7a}
.cbr-foot{margin-top:auto;color:var(--muted);font-size:11.5px}
.gm{display:grid;grid-template-columns:1.2fr 1fr 1fr;grid-template-rows:auto 1fr auto;gap:10px;height:100%}
.gm-head{grid-column:1/4;display:flex;align-items:baseline;gap:12px;min-width:0}
.gm-head b{font-size:clamp(16px,3.4vh,24px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--gold-hi)} .gm-head span{color:var(--muted);font-size:13px;margin-left:auto;white-space:nowrap}
.gm-fps{display:flex;flex-direction:column;justify-content:center;align-items:center;border-radius:14px;background:rgba(var(--ambient),.08);border:1px solid rgba(var(--ambient),.25)}
.gm-fps b{font-size:clamp(34px,11vh,92px);line-height:1;font-weight:800;color:var(--gold-hi)} .gm-fps small{color:var(--muted);font-size:12.5px;text-align:center;padding:0 6px}
.gm-card{display:flex;flex-direction:column;justify-content:center;gap:4px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
.gm-card label{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}
.gm-card b{font-size:clamp(20px,5vh,40px);font-weight:800} .gm-card small{color:var(--muted);font-size:12.5px}
.gm-card b.hot{color:#ff8a7a} .gm-card b.warm{color:#f2c46d}
.gm-btns{grid-column:1/4;display:flex;gap:10px}
.gm-btns button{flex:1;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-weight:600}
.gm-btns button.on{background:rgba(255,90,70,.18);border-color:rgba(255,120,100,.6);color:#ffb3a6}
.gm-idle{grid-column:1/4;grid-row:2;display:grid;place-items:center;text-align:center;color:var(--muted);white-space:pre-line}
.ws{display:flex;flex-direction:column;gap:8px;height:100%}
.ws-top{display:flex;gap:14px;flex-wrap:nowrap;overflow:hidden} .ws-top div{min-width:0} .ws-top div{display:flex;flex-direction:column} .ws-top b{font-size:clamp(16px,3.4vh,26px);color:var(--gold-hi);white-space:nowrap} .ws-top small{color:var(--muted);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ws-bars{flex:1;display:flex;align-items:flex-end;gap:8px;min-height:50px}
.ws-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}
.ws-bar i{width:100%;max-width:46px;border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,var(--gold-hi),var(--gold));min-height:3px}
.ws-bar i.today{box-shadow:0 0 0 2px rgba(var(--ambient),.6)} .ws-bar small{font-size:11.5px;color:var(--muted)} .ws-bar em{font-size:11px;font-style:normal;color:#e9dfc4}
.ws-apps{display:flex;flex-wrap:wrap;gap:6px} .ws-apps span{font-size:12px;padding:3px 9px;border-radius:999px;background:rgba(var(--ambient),.1);border:1px solid rgba(var(--ambient),.22)}
.bf{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;gap:14px;padding:4vh 4vw;background:radial-gradient(120% 90% at 85% 0%,rgba(var(--ambient),.2),transparent 60%),rgba(9,9,11,.97);
  animation:bfIn .5s ease}
@keyframes bfIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.bf-hello{font-size:clamp(24px,7vh,52px);font-weight:800;color:var(--gold-hi)} .bf-date{color:#d9cfb6;font-size:clamp(14px,3vh,20px);margin-top:-8px}
.bf-grid{flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;min-height:0}
.bf-card{border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(var(--ambient),.2);overflow:hidden;display:flex;flex-direction:column;gap:6px}
.bf-card label{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:700}
.bf-card .big{font-size:clamp(22px,6vh,42px);font-weight:800} .bf-card .li{font-size:14px;color:#e8e0cc} .bf-card .li small{color:var(--muted);margin-right:6px}
.bf-go{align-self:center;padding:12px 36px;border-radius:999px;background:linear-gradient(180deg,var(--gold-hi),var(--gold));color:#1a1405;font-weight:800;font-size:16px}
.vc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;text-align:center}
.vc-mic{width:min(42%,110px);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font-size:clamp(28px,7vh,48px);
  background:radial-gradient(circle at 35% 30%,var(--gold-hi),var(--gold));color:#1a1405;box-shadow:0 0 0 0 rgba(var(--ambient),.5)}
.vc.on .vc-mic{animation:vcPulse 1.2s infinite} @keyframes vcPulse{0%{box-shadow:0 0 0 0 rgba(var(--ambient),.55)}100%{box-shadow:0 0 0 22px rgba(var(--ambient),0)}}
.vc-said{font-size:15px;min-height:1.3em;color:#efe6cf} .vc-hint{font-size:12px;color:var(--muted)}
.pcsleep{position:fixed;inset:0;z-index:95;background:#000;display:grid;place-items:center;color:#3a3527;font-size:14px;cursor:pointer}
.pinlock{position:fixed;inset:0;z-index:2147483000;background:transparent;cursor:pointer}
.pinlock .pl-badge{position:absolute;right:12px;bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(10,10,12,.82);border:1px solid rgba(var(--ambient),.4);color:var(--gold-hi);font-size:12.5px;font-weight:600}
.pinlock.ask{background:rgba(6,6,8,.86);backdrop-filter:blur(6px);display:grid;place-items:center;cursor:default}
.pl-box{display:flex;align-items:center;gap:clamp(16px,5vw,48px);max-height:100vh;padding:8px}
.pl-side{display:flex;flex-direction:column;align-items:center;gap:10px}
@media (orientation:portrait){.pl-box{flex-direction:column}}
.pl-title{font-size:18px;font-weight:700;color:var(--gold-hi)} .pl-msg{font-size:13px;color:var(--muted);min-height:1.2em} .pl-msg.err{color:#ff8a7a}
.pl-dots{display:flex;gap:12px} .pl-dots i{width:14px;height:14px;border-radius:50%;border:2px solid var(--gold)} .pl-dots i.on{background:var(--gold)}
.pl-keys{display:grid;grid-template-columns:repeat(3,clamp(52px,17vh,72px));gap:clamp(6px,2vh,10px)}
.pl-keys button{height:clamp(40px,17vh,60px);border-radius:16px;font-size:22px;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(var(--ambient),.25)}
.pl-keys button:active{background:rgba(var(--ambient),.25)}
.pl-shake{animation:plShake .35s} @keyframes plShake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
#proWall{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
#pager{z-index:1}
`;
document.head.append(css);

// ---------------------------------------------------------------- «Не беспокоить»
let dndPill = null;
function renderDnd(s) {
  const q = s?.quiet;
  if (!q || PREVIEW) { dndPill?.remove(); dndPill = null; return; }
  if (!dndPill) {
    dndPill = h('div', 'pro-dnd');
    dndPill.onclick = () => setQuiet(false);
    document.body.append(dndPill);
  }
  dndPill.replaceChildren(h('span', null, '🌙 Не беспокоить'), h('small', null, q.since ? 'с ' + hm(q.since) + ' · нажмите, чтобы выключить' : ''));
}

async function setQuiet(on) {
  haptic();
  try {
    const r = await api('/quiet?on=' + (on ? 1 : 0), 'POST', 6000);
    if (D.state) D.state.quiet = r?.on ? { since: r.since } : null;
    renderDnd(D.state);
    toast(on ? 'Не беспокоить: звук и уведомления выключены' : 'Не беспокоить выключено', 'ok');
  } catch (_) { toast('Компьютер не ответил', 'err'); }
}

W.quiet = {
  needs: ['state'],
  create(box) {
    box.classList.add('w-quiet');
    const btn = h('button', 'q-btn');
    box.append(btn);
    btn.onclick = () => setQuiet(!D.state?.quiet);
    let key = '';
    return {
      update() {
        const q = D.state?.quiet;
        const k = q ? 'on' + q.since : 'off';
        if (k === key) return;
        key = k;
        box.classList.toggle('on', !!q);
        btn.replaceChildren(h('span', null, q ? '🌙' : '🔔'), h('b', null, q ? 'Не беспокоить' : 'Тихий режим'),
          h('small', null, q ? `включён с ${hm(q.since)} · нажмите, чтобы выключить` : 'выключить звук и уведомления на ПК'));
      },
    };
  },
};

// ---------------------------------------------------------------- «Курс ЦБ РФ»
const CBR_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';
let cbrData = null, cbrAt = 0, cbrLoading = null;
export async function loadCbr(force = false) {
  if (!force && cbrData && Date.now() - cbrAt < 30 * 60_000) return cbrData;
  if (cbrLoading) return cbrLoading;
  cbrLoading = (async () => {
    try {
      // straight from the phone, or through the computer when the phone cannot reach the site
      const r = await safeFetch(CBR_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cbrData = await r.json(); cbrAt = Date.now();
      store.set('cbr', cbrData);
    } catch (_) { cbrData ??= store.get('cbr', null); }
    finally { cbrLoading = null; }
    return cbrData;
  })();
  return cbrLoading;
}

const NAMES = { USD: 'Доллар США', EUR: 'Евро', CNY: 'Китайский юань', GBP: 'Фунт стерлингов', JPY: 'Японская иена', KZT: 'Казахстанский тенге',
  TRY: 'Турецкая лира', BYN: 'Белорусский рубль', AED: 'Дирхам ОАЭ', CHF: 'Швейцарский франк', UZS: 'Узбекский сум', AMD: 'Армянский драм' };
const FLAGS = { USD: '🇺🇸', EUR: '🇪🇺', CNY: '🇨🇳', GBP: '🇬🇧', JPY: '🇯🇵', KZT: '🇰🇿', TRY: '🇹🇷', BYN: '🇧🇾', AED: '🇦🇪', CHF: '🇨🇭', UZS: '🇺🇿', AMD: '🇦🇲' };

/** One rate in rubles for one unit (the Bank of Russia quotes some per 10 or 100). */
export function cbrRate(data, code) {
  const v = data?.Valute?.[code];
  if (!v) return null;
  return { code, name: NAMES[code] || v.Name, value: v.Value / v.Nominal, prev: v.Previous / v.Nominal };
}
const rub = (x) => x.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: x < 1 ? 4 : 2 });

W.cbr = {
  needs: ['tick'],
  create(box, { o }) {
    const codes = String(o.codes || 'USD, EUR, CNY').toUpperCase().split(/[\s,;]+/).filter(Boolean).slice(0, 6);
    const root = h('div', 'cbr');
    box.append(root);
    let key = '';
    const draw = () => {
      const d = cbrData;
      const k = JSON.stringify([d?.Date, codes]);
      if (k === key) return;
      key = k;
      if (!d) { root.replaceChildren(h('div', 'empty', 'Загружаю курс ЦБ РФ…')); return; }
      const rows = codes.map((c) => cbrRate(d, c)).filter(Boolean).map((r) => {
        const diff = r.value - r.prev;
        const pct = r.prev ? (diff / r.prev) * 100 : 0;
        const dir = Math.abs(diff) < 0.00005 ? '' : diff > 0 ? 'up' : 'down';
        return [
          h('div', 'cbr-row', h('span', 'cbr-code', `${FLAGS[r.code] || ''} ${r.code}`), h('span', 'cbr-name', r.name),
            h('span', 'cbr-val', rub(r.value), h('small', null, '₽'))),
          h('div', 'cbr-d ' + dir, dir ? `${diff > 0 ? '▲' : '▼'} ${rub(Math.abs(diff))} ₽ (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : 'без изменений'),
        ];
      }).flat();
      const date = new Date(d.Date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      root.replaceChildren(...rows, h('div', 'cbr-foot', `Курс ЦБ РФ на ${date}`));
    };
    loadCbr().then(draw);
    let last = Date.now();
    return {
      update() {
        if (Date.now() - last > 30 * 60_000) { last = Date.now(); loadCbr(true).then(draw); }
        draw();
      },
    };
  },
};

// ---------------------------------------------------------------- «Игровой режим»
const temp = (v) => (v == null ? '—' : Math.round(v) + '°');
const heat = (v) => (v == null ? '' : v >= 85 ? 'hot' : v >= 72 ? 'warm' : '');

W.game = {
  needs: ['state', 'tick'],
  create(box) {
    const root = h('div', 'gm');
    box.append(root);
    const head = h('div', 'gm-head');
    const fps = h('div', 'gm-fps');
    const cpu = h('div', 'gm-card'), gpu = h('div', 'gm-card');
    const btns = h('div', 'gm-btns');
    const mic = h('button', null, '🎙 Discord: микрофон'), rec = h('button', null, '⏺ Запись OBS'), mute = h('button', null, '🔇 Звук ПК');
    mic.onclick = async () => { haptic(); try { await api('/discord/mute', 'POST', 5000); toast('Discord: микрофон переключён', 'ok'); } catch (_) { toast('Discord не подключён', 'err'); } };
    rec.onclick = async () => { haptic(); try { await api('/obs/record', 'POST', 5000); toast('OBS: запись переключена', 'ok'); } catch (_) { toast('OBS не подключён', 'err'); } };
    mute.onclick = async () => { haptic(); try { await api('/volume?op=mute', 'POST', 5000); } catch (_) {} };
    btns.append(mic, rec, mute);
    let key = '';
    return {
      update() {
        const s = D.state || {}, g = s.game, pc = s.pc || {}, gp = gpusOf(s)[0] || {};
        const now = Date.now();
        const k = JSON.stringify([g?.name, g?.fps, Math.round(pc.cpu), Math.round(pc.cpuTemp), Math.round(gp.util), Math.round(gp.temp), Math.floor(now / 30000)]);
        if (k === key) return;
        key = k;
        head.replaceChildren(h('b', null, g ? '🎮 ' + g.name : '🎮 Игровой режим'),
          h('span', null, g ? 'в игре ' + dur(Math.max(0, Math.floor((now - g.since) / 60000))) : 'ждёт запуска игры'));
        fps.replaceChildren(h('b', null, g?.fps != null ? String(g.fps) : '—'),
          h('small', null, g?.fps != null ? 'FPS' : g ? 'FPS: запустите RivaTuner (MSI Afterburner)' : 'FPS'));
        cpu.replaceChildren(h('label', null, 'Процессор'), h('b', heat(pc.cpuTemp), temp(pc.cpuTemp)), h('small', null, `загрузка ${pc.cpu != null ? Math.round(pc.cpu) : '—'}%`));
        gpu.replaceChildren(h('label', null, 'Видеокарта'), h('b', heat(gp.temp), temp(gp.temp)), h('small', null, `загрузка ${gp.util != null ? Math.round(gp.util) : '—'}%`));
        rec.classList.toggle('on', !!s.obs?.recording);
        fps.title = g ? '' : 'Запустите игру: страница откроется сама';
        if (!root.childElementCount) root.append(head, fps, cpu, gpu, btns);
      },
    };
  },
};

// the «Игровой режим» page opens by itself while a game runs (unless the panel has a rule for it), and goes back after
let gameReturn = null;
function followGame(s) {
  if (PREVIEW || cfg.game?.enabled === false) return;
  const i = pages.findIndex((p) => p.widgets?.some((w) => w.type === 'game'));
  if (i < 0) return;
  if (s.game && gameReturn == null) {
    gameReturn = curPage === i ? -1 : curPage;
    if (curPage !== i) goPage(i);
  } else if (!s.game && gameReturn != null) {
    if (gameReturn >= 0 && gameReturn < pages.length && curPage === i) goPage(gameReturn);
    gameReturn = null;
  }
}

// ---------------------------------------------------------------- «Статистика за неделю»
let statsData = null, statsAt = 0;
async function loadStats(force) {
  if (!force && statsData && Date.now() - statsAt < 10 * 60_000) return statsData;
  try { statsData = await api('/stats', 'GET', 8000); statsAt = Date.now(); } catch (_) {}
  return statsData;
}
const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

W.weekstats = {
  needs: ['tick'],
  create(box) {
    const root = h('div', 'ws');
    box.append(root);
    let key = '';
    const draw = () => {
      const d = statsData;
      const k = JSON.stringify(d);
      if (k === key) return;
      key = k;
      if (!d) { root.replaceChildren(h('div', 'empty', 'Собираю статистику…\nОна копится, пока компьютер включён')); return; }
      const max = Math.max(60, ...d.days.map((x) => x.minutes));
      const today = d.days[d.days.length - 1]?.date;
      const hours = (m) => (m / 60).toFixed(m >= 600 ? 0 : 1).replace('.', ',');
      root.replaceChildren(
        h('div', 'ws-top',
          h('div', null, h('b', null, hours(d.totalMinutes) + ' ч'), h('small', null, 'за 7 дней')),
          h('div', null, h('b', null, d.avgCpu != null ? Math.round(d.avgCpu) + '%' : '—'), h('small', null, 'загрузка ЦП')),
          h('div', null, h('b', null, hours(d.gameMinutes) + ' ч'), h('small', null, 'в играх'))),
        h('div', 'ws-bars', ...d.days.map((x) => {
          const bar = h('i', x.date === today ? 'today' : '');
          bar.style.height = Math.max(3, (x.minutes / max) * 100) + '%';
          bar.title = `${hours(x.minutes)} ч · ЦП ${x.cpu != null ? Math.round(x.cpu) + '%' : '—'}`;
          return h('div', 'ws-bar', h('em', null, x.minutes ? hours(x.minutes) : ''), bar, h('small', null, DAYS[new Date(x.date + 'T12:00').getDay()]));
        })),
        h('div', 'ws-apps', ...(d.apps.length ? d.apps.map((a) => h('span', null, `${a.name} · ${hours(a.minutes)} ч`)) : [h('span', null, 'Самые используемые программы появятся позже')])));
    };
    loadStats().then(draw);
    return { update() { loadStats().then(draw); } };
  },
};

// ---------------------------------------------------------------- «Утренний брифинг»
function greeting(d = zoneNow()) {
  const x = d.getHours();
  return x < 5 ? 'Доброй ночи' : x < 12 ? 'Доброе утро' : x < 17 ? 'Добрый день' : 'Добрый вечер';
}

function briefingCards() {
  const cards = [];
  const wx = wxLines();
  cards.push(h('div', 'bf-card', h('label', null, 'Погода'),
    wx ? h('div', 'big', `${wx.icon || ''} ${wx.temp}`) : h('div', 'li', 'Погода недоступна'),
    wx ? h('div', 'li', wx.desc) : '', wx ? h('div', 'li', wx.range) : ''));
  const now = Date.now(), end = new Date(); end.setHours(23, 59, 59, 999);
  const evs = (D.calendar?.events || []).filter((e) => e.end > now && e.start <= end.getTime()).sort((a, b) => a.start - b.start).slice(0, 5);
  cards.push(h('div', 'bf-card', h('label', null, 'События дня'),
    ...(evs.length ? evs.map((e) => h('div', 'li', h('small', null, e.allDay ? 'весь день' : hm(e.start)), e.title)) : [h('div', 'li', D.calendar ? 'Сегодня событий нет' : 'Календарь не подключён')])));
  const tasks = (cfg.briefing?.tasks || []).filter(Boolean);
  const open = [];
  for (const p of pages) for (const w of p.widgets || []) {
    if (w.type !== 'checklist') continue;
    const st = store.get(`cl:${p.id}/${w.id}`, null);
    const done = st && st.day === new Date().toDateString() ? st.done : [];
    for (const it of lines(w.options?.items, [])) if (!done.includes(it)) open.push(it);
  }
  const list = [...new Set([...tasks, ...open])].slice(0, 6);
  cards.push(h('div', 'bf-card', h('label', null, 'Задачи'),
    ...(list.length ? list.map((x) => h('div', 'li', '☐ ' + x)) : [h('div', 'li', 'Задачи на утро: настройки › ⭐ PRO › Утренний брифинг')])));
  const fx = h('div', 'bf-card', h('label', null, 'Курс ЦБ РФ'));
  const fill = () => {
    const rows = ['USD', 'EUR', 'CNY'].map((c) => cbrRate(cbrData, c)).filter(Boolean);
    fx.replaceChildren(fx.firstChild, ...(rows.length ? rows.map((r) => {
      const d = r.value - r.prev;
      return h('div', 'li', h('small', null, r.code), `${rub(r.value)} ₽ `, h('span', null, d > 0 ? '▲' : d < 0 ? '▼' : ''));
    }) : [h('div', 'li', 'Курс загружается…')]));
  };
  fill(); loadCbr().then(fill);
  cards.push(fx);
  return cards;
}

export function showBriefing() {
  if (document.querySelector('.bf')) return;
  const d = zoneNow();
  const date = fmtDate(d);
  const go = h('button', 'bf-go', 'Начать день');
  const el = h('div', 'bf', h('div', 'bf-hello', greeting(d) + '!'), h('div', 'bf-date', date[0].toUpperCase() + date.slice(1)),
    h('div', 'bf-grid', ...briefingCards()), go);
  const close = () => { el.remove(); clearTimeout(timer); };
  go.onclick = () => { haptic(); close(); };
  const timer = setTimeout(close, 5 * 60_000);
  document.body.append(el);
}

function maybeBriefing(s) {
  const b = cfg.briefing;
  if (PREVIEW || !b || b.enabled === false || !s?.pc?.uptimeSec) return;
  if (s.pc.uptimeSec > (b.minutes || 20) * 60) return;
  // once per start of the computer: the start time is now minus the uptime, to the minute
  const boot = Math.round((Date.now() - s.pc.uptimeSec * 1000) / 120_000);
  if (store.get('briefing-boot', 0) === boot) return;
  store.set('briefing-boot', boot);
  setTimeout(showBriefing, 1200);
}

W.briefing = {
  needs: ['tick', 'weather'],
  create(box) {
    const root = h('div', 'bf-grid');
    root.style.height = '100%';
    const hello = h('div', 'bf-hello');
    hello.style.fontSize = 'clamp(18px,4vh,30px)';
    hello.style.padding = '2px 4px 0';
    box.style.display = 'flex'; box.style.flexDirection = 'column'; box.style.gap = '8px';
    box.append(hello, root);
    let key = '';
    return {
      update() {
        const k = String(Math.floor(Date.now() / 60_000)) + !!D.weather + !!D.calendar + !!cbrData;
        if (k === key) return;
        key = k;
        hello.textContent = greeting() + '!';
        root.replaceChildren(...briefingCards());
      },
    };
  },
};

// ---------------------------------------------------------------- «Голос»
// «открой музыку», «запусти OBS», «громче», «тише», «выключи звук», «пауза», «дальше», «назад», «страница игры»,
// «не беспокоить», «брифинг». The phone's own speech recognizer turns speech into text; nothing is stored.
const voiceSessions = new Map();
setTimeout(() => {
  const prev = window.onAndroidSpeech;
  window.onAndroidSpeech = (kind, text, id) => { const f = voiceSessions.get(id); if (f) f(kind, text); else prev?.(kind, text, id); };
});

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Runs one spoken command; returns what was done (for the screen) or null. */
export async function runVoice(text) {
  let s = norm(text).replace(/^(deckbox|дек бокс|декбокс|дэк бокс)\s*/, '');
  // whole words only: «звук» is not «звуковую», «плей» is not «плейлисты»
  const has = (...w) => w.some((x) => (' ' + s + ' ').includes(' ' + x + ' '));
  const target = s.replace(/^(пожалуйста\s+)?(открой|открыть|запусти|запустить|включи|включить|покажи|показать|перейди на|перейди|страница|страницу)\s+/, '');
  if (has('не беспокоить', 'тихий режим')) { await setQuiet(!D.state?.quiet); return 'Не беспокоить'; }
  if (has('брифинг', 'утро')) { showBriefing(); return 'Утренний брифинг'; }
  if (has('громче')) { await api('/volume?op=up', 'POST', 5000); return 'Громче'; }
  if (has('тише')) { await api('/volume?op=down', 'POST', 5000); return 'Тише'; }
  if (has('выключи звук', 'без звука', 'включи звук', 'звук')) { await api('/volume?op=mute', 'POST', 5000); return 'Звук переключён'; }
  if (has('пауза', 'стоп', 'играй', 'продолжи', 'плей')) { await api('/media/playpause', 'POST', 5000); return 'Пауза / воспроизведение'; }
  if (has('дальше', 'следующий', 'следующая', 'вперед')) { await api('/media/next', 'POST', 5000); return 'Следующий трек'; }
  if (has('назад', 'предыдущий', 'предыдущая')) { await api('/media/prev', 'POST', 5000); return 'Предыдущий трек'; }
  if (!target) return null;
  // a page of the panel by its title
  const pi = pages.findIndex((p) => norm(p.title) && (norm(p.title).includes(target) || target.includes(norm(p.title))));
  if (pi >= 0 && /^(покажи|перейди|страниц)/.test(s)) { goPage(pi); return 'Страница «' + pages[pi].title + '»'; }
  // a button of the panel (shortcut) by its name
  const sc = (cfg.shortcuts || []).find((x) => norm(x.label) && (norm(x.label).includes(target) || target.includes(norm(x.label))));
  if (sc) { await api('/run/' + encodeURIComponent(sc.id), 'POST', 8000); return '«' + sc.label + '»'; }
  // an app on the computer by its name
  try {
    const apps = await api('/apps', 'GET', 8000);
    const list = Array.isArray(apps) ? apps : apps?.apps || [];
    const app = list.find((a) => norm(a.name) === target) || list.find((a) => norm(a.name).includes(target) || target.includes(norm(a.name)));
    if (app) {
      await fetch(`${API}/apps/open?id=${encodeURIComponent(app.id)}`, { method: 'POST', cache: 'no-store', headers: PANEL_HEADERS });
      return 'Открываю «' + app.name + '»';
    }
  } catch (_) {}
  if (pi >= 0) { goPage(pi); return 'Страница «' + pages[pi].title + '»'; }
  return null;
}

W.voice = {
  needs: [],
  create(box) {
    const root = h('div', 'vc');
    const mic = h('button', 'vc-mic', '🎙');
    const said = h('div', 'vc-said');
    const hint = h('div', 'vc-hint', 'Скажите: «открой музыку», «запусти OBS», «тише», «пауза», «не беспокоить»');
    root.append(mic, said, hint);
    box.append(root);
    let session = 0;
    const stop = () => { root.classList.remove('on'); if (session) { try { bridge?.cancelListening?.(session); } catch (_) {} voiceSessions.delete(session); session = 0; } };
    mic.onclick = () => {
      haptic();
      if (session) { stop(); return; }
      if (!bridge?.listen) { said.textContent = 'Голосовые команды работают в приложении DeckBox на телефоне'; return; }
      let id;
      try { id = bridge.listen('ru-RU', false); } catch (_) { id = 0; }
      if (!id) { said.textContent = 'Распознавание речи недоступно на этом телефоне'; return; }
      session = id;
      root.classList.add('on');
      said.textContent = 'Слушаю…';
      voiceSessions.set(id, async (kind, text) => {
        if (kind === 'partial') said.textContent = text;
        else if (kind === 'final') {
          stop();
          said.textContent = '«' + text + '»';
          try {
            const done = await runVoice(text);
            if (done) { said.textContent = '✓ ' + done; toast(done, 'ok'); } else said.textContent = 'Не понял команду: «' + text + '»';
          } catch (_) { said.textContent = 'Компьютер не ответил'; }
        } else if (kind === 'error') { stop(); said.textContent = 'Не расслышал, попробуйте ещё раз'; }
      });
    };
    return { update() {}, destroy: stop };
  },
};

// ---------------------------------------------------------------- gestures
// two fingers down: mute the computer; a double tap on an empty spot: pause / play.
(() => {
  let two = null, lastTap = 0, lastXY = null;
  const interactive = (el) => !el?.closest?.('.page') || el.closest('.w,button,a,input,select,textarea,[role=button],.dbu,.bf,.ov,.pro-dnd,.pcsleep');
  document.addEventListener('touchstart', (e) => {
    if (dsp().gestures === false) return;
    if (e.touches.length === 2) two = { y: (e.touches[0].clientY + e.touches[1].clientY) / 2, done: false };
    else two = null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!two || two.done || e.touches.length !== 2) return;
    const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    if (y - two.y > 90) {
      two.done = true;
      haptic();
      api('/volume?op=mute', 'POST', 5000).then(() => toast('Звук на компьютере переключён', 'ok')).catch(() => {});
    }
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (dsp().gestures === false || e.touches.length || e.changedTouches.length !== 1 || two) { if (!e.touches.length) two = null; return; }
    const t = e.changedTouches[0];
    if (interactive(e.target)) { lastTap = 0; return; }
    const now = Date.now();
    if (now - lastTap < 320 && lastXY && Math.hypot(t.clientX - lastXY[0], t.clientY - lastXY[1]) < 40) {
      lastTap = 0;
      haptic();
      api('/media/playpause', 'POST', 5000).then(() => toast('Пауза / воспроизведение', 'ok')).catch(() => {});
    } else { lastTap = now; lastXY = [t.clientX, t.clientY]; }
  }, { passive: true });
})();

// ---------------------------------------------------------------- the computer sleeps: the phone's screen goes dark
let sleepEl = null, offlineSince = 0, sleepAt = 0;
function pcSleep(on) {
  if (PREVIEW || dsp().sleepWithPc === false) return;
  if (on === !!sleepEl) return;
  if (on) {
    sleepAt = Date.now();
    sleepEl = h('div', 'pcsleep', 'Компьютер спит · экран погаснет сам');
    sleepEl.onclick = () => pcSleep(false);
    document.body.append(sleepEl);
  } else { sleepEl.remove(); sleepEl = null; }
  try { bridge?.pcAsleep?.(on); } catch (_) {}
  if (!on) applyBrightness(true); // the dark screen set the lowest brightness
}
window.onPcAwake = () => pcSleep(false);

// ---------------------------------------------------------------- animated gold wallpaper
// Soft gold lights drifting slowly behind the widgets; 20 frames a second at most, still at night, off when hidden.
// (after the panel's own module has run: its bindings are not ready while this one loads)
setTimeout(() => {
  if (PREVIEW) return;
  const c = document.createElement('canvas');
  c.id = 'proWall';
  document.body.prepend(c);
  const g = c.getContext('2d');
  const blobs = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.18 + Math.random() * 0.22, a: Math.random() * 6.28, s: 0.00006 + Math.random() * 0.00008, o: 0.05 + (i % 3) * 0.025 }));
  const dust = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.00002 + Math.random() * 0.00005, p: Math.random() * 6.28 }));
  let last = 0, w = 0, hh = 0;
  const size = () => { const dpr = Math.min(1.5, devicePixelRatio || 1); w = c.width = innerWidth * dpr; hh = c.height = innerHeight * dpr; };
  size(); addEventListener('resize', size);
  const frame = (t) => {
    requestAnimationFrame(frame);
    const on = (cfg.display?.wallpaper ?? 'gold') === 'gold' && !document.hidden && !document.body.classList.contains('night') && !sleepEl;
    c.style.display = on ? '' : 'none';
    if (!on || t - last < 50) return;
    const dt = last ? Math.min(200, t - last) : 16;
    last = t;
    g.clearRect(0, 0, w, hh);
    g.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.a += b.s * dt;
      const x = (b.x + Math.cos(b.a) * 0.12) * w, y = (b.y + Math.sin(b.a * 0.8) * 0.12) * hh, r = b.r * Math.max(w, hh);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${DEFAULT_AMBIENT},${b.o})`); gr.addColorStop(1, `rgba(${DEFAULT_AMBIENT},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (const d of dust) {
      d.y -= d.v * dt; d.p += 0.002 * dt; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
      g.fillStyle = `rgba(${DEFAULT_AMBIENT},${0.15 + 0.15 * Math.sin(d.p)})`;
      g.beginPath(); g.arc((d.x + Math.sin(d.p) * 0.01) * w, d.y * hh, 1.3, 0, 6.28); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  };
  requestAnimationFrame(frame);
});

// ---------------------------------------------------------------- «Блокировка PIN-кодом»
// The panel stays visible but takes no taps; a tap asks for the code. Only SHA-256 of the code is in the settings.
let lockEl = null, lastTouch = Date.now(), fails = 0, waitUntil = 0;
const lockCfg = () => cfg.lock || {};
const locked = () => !!lockEl;

async function sha(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export const pinHash = (pin) => sha('deckbox-pin:' + pin);

function lockPanel() {
  if (lockEl || PREVIEW || !lockCfg().pinHash) return;
  lockEl = h('div', 'pinlock', h('span', 'pl-badge', '🔒 Панель заблокирована'));
  const stop = (e) => { e.stopPropagation(); };
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click', 'wheel']) lockEl.addEventListener(ev, stop);
  lockEl.addEventListener('click', () => { if (!lockEl.classList.contains('ask')) askPin(); });
  document.body.append(lockEl);
}

function askPin() {
  lockEl.classList.add('ask');
  let code = '';
  const dots = h('div', 'pl-dots');
  const msg = h('div', 'pl-msg', 'Введите PIN-код');
  const side = h('div', 'pl-side', h('div', 'pl-title', '🔒 Панель заблокирована'), dots, msg);
  const box = h('div', 'pl-box', side);
  const draw = () => dots.replaceChildren(...Array.from({ length: Math.max(4, code.length) }, (_, i) => h('i', i < code.length ? 'on' : '')));
  const keys = h('div', 'pl-keys');
  const press = async (k) => {
    haptic();
    if (Date.now() < waitUntil) { msg.textContent = `Подождите ${Math.ceil((waitUntil - Date.now()) / 1000)} с`; return; }
    if (k === '⌫') code = code.slice(0, -1);
    else if (k === '✕') { lockEl.classList.remove('ask'); lockEl.replaceChildren(h('span', 'pl-badge', '🔒 Панель заблокирована')); return; }
    else if (k !== 'ok' && code.length < 8) code += k;
    draw();
    if (code.length >= 4 && (await pinHash(code)) === lockCfg().pinHash) {
      fails = 0; lockEl.remove(); lockEl = null; lastTouch = Date.now();
      toast('Панель разблокирована', 'ok');
    } else if (code.length === 8 || (k === 'ok' && code.length)) {
      fails++; code = ''; draw();
      box.classList.remove('pl-shake'); void box.offsetWidth; box.classList.add('pl-shake');
      if (fails >= 5) { waitUntil = Date.now() + 30_000; fails = 0; msg.textContent = 'Неверный код. Подождите 30 секунд'; }
      else msg.textContent = 'Неверный код';
      msg.classList.add('err');
    }
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '✕', '0', '⌫']) {
    const b = h('button', null, k);
    b.onclick = () => press(k);
    keys.append(b);
  }
  draw();
  side.append((() => { const ok = h('button', 'bf-go', 'Открыть'); ok.onclick = () => press('ok'); return ok; })());
  box.append(keys);
  lockEl.replaceChildren(box);
}

setTimeout(() => {
  if (PREVIEW) return;
  document.addEventListener('pointerdown', () => { if (!locked()) lastTouch = Date.now(); }, true);
  // locked when the app starts, and again after the set minutes without a touch
  setInterval(() => {
    const l = lockCfg();
    if (!l.pinHash) { if (lockEl) { lockEl.remove(); lockEl = null; } return; }
    if (!lockEl && !startChecked) { startChecked = true; lockPanel(); return; }
    if (!lockEl && l.afterMin > 0 && Date.now() - lastTouch > l.afterMin * 60_000) lockPanel();
  }, 1000);
});
let startChecked = false;

// ---------------------------------------------------------------- hooks from the panel
setTimeout(() => {
  hooks.state.push((s) => { renderDnd(s); followGame(s); maybeBriefing(s); if (sleepEl && !offlineSince && Date.now() - sleepAt > 90_000) pcSleep(false); });
  hooks.event.push((e) => { if (e.kind === 'pcsleep') pcSleep(true); else if (e.kind === 'briefing' && !PREVIEW) showBriefing(); });
  hooks.online.push((on) => {
    // no answer from the computer for 2 minutes after it was there: it most likely sleeps
    if (on) { offlineSince = 0; pcSleep(false); return; }
    offlineSince = Date.now();
    const at = offlineSince;
    setTimeout(() => { if (offlineSince === at && dsp().sleepWithPc !== false) pcSleep(true); }, 120_000);
  });
});
